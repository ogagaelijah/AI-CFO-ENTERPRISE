'use strict';

const { RiskContracts, RISK_STATUS } = require('../contracts');
const RiskRules = require('../rules/RiskRules');

/**
 * AnomalyDetector – SSOT v1.4.0 / Production v2.1.0
 *
 * High-scale, production-ready anomaly detection for business metrics.
 *
 * Methods
 *   • robust_zscore  (default) – Median Absolute Deviation; resistant to outliers
 *   • zscore                   – classic parametric Z-score
 *   • percentage               – deviation from trimmed mean
 *   • moving_average           – adaptive sliding-window deviation
 *   • iqr                      – Interquartile-Range fences
 *
 * Design goals for large-scale deployment
 *   • Deterministic, pure computation (no hidden side effects)
 *   • Bounded memory (LRU + TTL cache, input-length guard)
 *   • Defensive input sanitisation & typed errors
 *   • Frozen immutable outputs compatible with RiskEngine / RiskContracts
 *   • O(n) core paths; single-pass stats where possible
 *   • Observability hooks (duration, cache hit, method used)
 *   • Every tunable pulled from RiskRules.anomaly (SSOT) with constructor overrides
 *
 * @version 2.1.0
 */
class AnomalyDetector {
  static DETECTOR_VERSION = '2.1.0';

  static SUPPORTED_METHODS = Object.freeze([
    'robust_zscore',
    'zscore',
    'percentage',
    'moving_average',
    'iqr',
  ]);

  /**
   * @param {object} [options]
   * @param {object} [options.trendAnalyzer]
   * @param {object} [options.volatilityAnalyzer]
   * @param {RiskRules} [options.rules]
   * @param {string}  [options.defaultMethod]        Override SSOT defaultMethod
   * @param {number}  [options.threshold]            Classic Z-score threshold
   * @param {number}  [options.robustThreshold]      MAD Z-score threshold
   * @param {number}  [options.minDataPoints]
   * @param {number}  [options.minDeviationPercent]
   * @param {number}  [options.cacheMaxSize]
   * @param {number}  [options.cacheTtlMs]
   * @param {number}  [options.maxInputLength]
   * @param {object}  [options.logger]               Console-compatible logger
   */
  constructor({
    trendAnalyzer = null,
    volatilityAnalyzer = null,
    rules = null,
    defaultMethod = null,
    threshold = null,
    robustThreshold = null,
    minDataPoints = null,
    minDeviationPercent = null,
    cacheMaxSize = null,
    cacheTtlMs = null,
    maxInputLength = null,
    logger = console,
  } = {}) {
    this.logger = logger;
    this.rules = rules || new RiskRules({ logger });
    this.config = this.rules.getThresholds('anomaly');

    // Lazy-require only if not injected (avoids circular deps in large graphs)
    if (!trendAnalyzer) {
      const TrendAnalyzer = require('../../forecast/foundation/TrendAnalyzer');
      this.trendAnalyzer = new TrendAnalyzer();
    } else {
      this.trendAnalyzer = trendAnalyzer;
    }

    if (!volatilityAnalyzer) {
      const VolatilityAnalyzer = require('../../forecast/foundation/VolatilityAnalyzer');
      this.volatilityAnalyzer = new VolatilityAnalyzer();
    } else {
      this.volatilityAnalyzer = volatilityAnalyzer;
    }

    // ── SSOT defaults with explicit overrides ────────────────────────────
    this.defaultMethod = this._normalizeMethod(
      defaultMethod ?? this.config.defaultMethod ?? 'robust_zscore'
    );

    this.threshold = this._coercePositiveNumber(
      threshold ?? this.config.zScoreThreshold,
      2.5
    );
    this.robustThreshold = this._coercePositiveNumber(
      robustThreshold ?? this.config.robustZScoreThreshold,
      3.5
    );
    this.madConsistencyConstant = this._coercePositiveNumber(
      this.config.madConsistencyConstant,
      0.6745
    );

    this.minDataPoints = this._coercePositiveInteger(
      minDataPoints ?? this.config.minDataPoints,
      10
    );
    this.minDeviationPercent = this._coercePositiveNumber(
      minDeviationPercent ?? this.config.minDeviationPercent,
      30
    );
    this.maxInputLength = this._coercePositiveInteger(
      maxInputLength ?? this.config.maxInputLength,
      50_000
    );

    // IQR multipliers
    this.iqrMildMultiplier = this._coercePositiveNumber(
      this.config.iqrMildMultiplier,
      1.5
    );
    this.iqrExtremeMultiplier = this._coercePositiveNumber(
      this.config.iqrExtremeMultiplier,
      3.0
    );

    // Severity bands (pulled from SSOT)
    this.severityCriticalRatio = this._coercePositiveNumber(
      this.config.severityCriticalRatio,
      3.0
    );
    this.severityHighRatio = this._coercePositiveNumber(
      this.config.severityHighRatio,
      2.0
    );
    this.severityMediumRatio = this._coercePositiveNumber(
      this.config.severityMediumRatio,
      1.5
    );
    this.severityCriticalPercent = this._coercePositiveNumber(
      this.config.severityCriticalPercent,
      100
    );
    this.severityHighPercent = this._coercePositiveNumber(
      this.config.severityHighPercent,
      60
    );
    this.severityMediumPercent = this._coercePositiveNumber(
      this.config.severityMediumPercent,
      40
    );

    // Score weights
    this.scoreBase = Object.freeze({
      CRITICAL: this.config.scoreBaseCritical ?? 85,
      HIGH: this.config.scoreBaseHigh ?? 60,
      MEDIUM: this.config.scoreBaseMedium ?? 35,
      LOW: this.config.scoreBaseLow ?? 15,
      NONE: 0,
    });
    this.scorePerAnomaly = this.config.scorePerAnomaly ?? 3;
    this.scorePerAnomalyCap = this.config.scorePerAnomalyCap ?? 15;

    // Bounded LRU + TTL cache
    this._cache = new Map();
    this._maxCacheSize = this._coercePositiveInteger(
      cacheMaxSize ?? this.config.cacheMaxSize,
      1000
    );
    this._cacheTtlMs = this._coercePositiveInteger(
      cacheTtlMs ?? this.config.cacheTtlMs,
      5 * 60 * 1000
    );

    // Lightweight metrics (process-local; ship to APM in real deployments)
    this._metrics = {
      detections: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalDurationMs: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Primary detection entry-point.
   *
   * @param {object} params
   * @param {number[]} params.values
   * @param {Array<string|number|Date>} [params.dates]
   * @param {string} params.metric
   * @param {string} [params.metricDisplayName]
   * @param {number} [params.threshold]   Method-specific threshold override
   * @param {'robust_zscore'|'zscore'|'percentage'|'moving_average'|'iqr'} [params.method]
   *        Defaults to RiskRules.anomaly.defaultMethod (robust_zscore)
   * @param {boolean} [params.skipCache=false]
   * @returns {Readonly<object>} RiskContract-compatible result
   */
  detect({
    values,
    dates = [],
    metric,
    metricDisplayName,
    threshold = null,
    method = null,
    skipCache = false,
  } = {}) {
    const startedAt = Date.now();
    const displayName = metricDisplayName || metric || 'metric';

    try {
      this._assertDetectInput({ values, metric, method });

      const normalizedMethod = this._normalizeMethod(
        method ?? this.defaultMethod
      );

      const cacheKey = skipCache
        ? null
        : this._getCacheKey({ values, metric, method: normalizedMethod, threshold });

      if (cacheKey && this._cache.has(cacheKey)) {
        const entry = this._cache.get(cacheKey);
        if (Date.now() - entry.ts < this._cacheTtlMs) {
          this._metrics.cacheHits += 1;
          this.logger.debug?.(
            `[AnomalyDetector] cache hit ${metric} (${normalizedMethod})`
          );
          return entry.value;
        }
        this._cache.delete(cacheKey);
      }

      this._metrics.cacheMisses += 1;

      const dataPoints = this._sanitizeValues(values);
      let dataCount = dataPoints.length;

      if (dataCount < this.minDataPoints) {
        return this._createUnavailableResult(metric, displayName, dataCount);
      }

      if (dataCount > this.maxInputLength) {
        this.logger.warn?.(
          `[AnomalyDetector] truncating input from ${dataCount} → ${this.maxInputLength}`
        );
        dataPoints.length = this.maxInputLength;
        dataCount = this.maxInputLength;
      }

      const safeDates = Array.isArray(dates) ? dates : [];

      // Resolve effective threshold for the chosen method
      const effectiveThreshold = this._resolveThreshold(
        normalizedMethod,
        threshold
      );

      let anomalies;
      switch (normalizedMethod) {
        case 'zscore':
          anomalies = this._detectZScore(
            dataPoints,
            safeDates,
            effectiveThreshold,
            displayName
          );
          break;
        case 'robust_zscore':
          anomalies = this._detectRobustZScore(
            dataPoints,
            safeDates,
            effectiveThreshold,
            displayName
          );
          break;
        case 'percentage':
          anomalies = this._detectPercentageDeviation(
            dataPoints,
            safeDates,
            displayName
          );
          break;
        case 'moving_average':
          anomalies = this._detectMovingAverage(
            dataPoints,
            safeDates,
            displayName
          );
          break;
        case 'iqr':
          anomalies = this._detectIQR(dataPoints, safeDates, displayName);
          break;
        default:
          anomalies = this._detectRobustZScore(
            dataPoints,
            safeDates,
            effectiveThreshold,
            displayName
          );
      }

      const counts = this._countBySeverity(anomalies);
      const severity = this._deriveSeverity(counts);
      const score = this._calculateScore(severity, counts);
      const summary = this._generateSummary(anomalies, displayName);
      const latestAnomaly =
        anomalies.length > 0 ? anomalies[anomalies.length - 1] : null;

      const durationMs = Date.now() - startedAt;
      this._metrics.detections += 1;
      this._metrics.totalDurationMs += durationMs;

      const result = Object.freeze({
        available: true,
        metric,
        metricDisplayName: displayName,
        method: normalizedMethod,
        dataPoints: dataCount,
        threshold: effectiveThreshold,
        anomalies: Object.freeze(anomalies),
        summary,
        latestAnomaly: latestAnomaly ? Object.freeze(latestAnomaly) : null,
        counts: Object.freeze(counts),
        hasAnomalies: anomalies.length > 0,
        hasCritical: counts.critical > 0,
        hasHigh: counts.high > 0,
        risk: Object.freeze(
          RiskContracts.anomaly({
            metric,
            metricDisplayName: displayName,
            score,
            severity,
            status:
              anomalies.length > 0
                ? RISK_STATUS.ACTIVE
                : RISK_STATUS.MONITORING,
            trend: this._deriveTrend(anomalies),
            impact: this._calculateImpact(anomalies, dataPoints),
            details: {
              counts,
              method: normalizedMethod,
              latestAnomaly,
              dataPoints: dataCount,
            },
          })
        ),
        meta: Object.freeze({
          detector: 'AnomalyDetector',
          detectorVersion: AnomalyDetector.DETECTOR_VERSION,
          durationMs,
          cacheHit: false,
        }),
      });

      if (cacheKey) {
        this._setCache(cacheKey, result);
      }

      this.logger.debug?.(
        `[AnomalyDetector] ${metric} → ${anomalies.length} anomalies (${normalizedMethod}) in ${durationMs}ms`
      );
      return result;
    } catch (error) {
      this._metrics.errors += 1;
      this.logger.error?.('[AnomalyDetector] detect failed', {
        metric,
        method,
        error: error?.message,
        stack: error?.stack,
      });
      return this._createFallbackResult(metric, displayName, error);
    }
  }

  /**
   * Fast path – uses the configured default method (robust_zscore in production).
   */
  quickCheck(values, metric, metricDisplayName) {
    return this.detect({
      values,
      metric,
      metricDisplayName,
      method: this.defaultMethod,
    });
  }

  /**
   * Check whether a single new value is anomalous given historical series.
   * Uses the default (robust) method on the combined series and verifies the last index.
   *
   * @returns {{ isAnomalous: boolean, anomaly: object|null }}
   */
  isAnomalous(value, historicalValues, threshold = null) {
    if (!Array.isArray(historicalValues) || historicalValues.length === 0) {
      return { isAnomalous: false, anomaly: null };
    }

    const combined = [...historicalValues, value];
    const result = this.detect({
      values: combined,
      metric: 'value',
      metricDisplayName: 'Value',
      threshold: threshold ?? undefined,
      method: this.defaultMethod,
      skipCache: true,
    });

    if (!result.available || result.anomalies.length === 0) {
      return { isAnomalous: false, anomaly: null };
    }

    const targetIndex = historicalValues.length;
    const match = result.anomalies.find((a) => a.index === targetIndex);
    if (match) {
      return { isAnomalous: true, anomaly: match };
    }

    const last = result.anomalies[result.anomalies.length - 1];
    if (last && last.index === targetIndex) {
      return { isAnomalous: true, anomaly: last };
    }

    return { isAnomalous: false, anomaly: null };
  }

  /**
   * Process-local observability snapshot.
   */
  getMetrics() {
    const { detections, cacheHits, cacheMisses, errors, totalDurationMs } =
      this._metrics;
    const totalCache = cacheHits + cacheMisses;
    return Object.freeze({
      detections,
      cacheHits,
      cacheMisses,
      cacheHitRate: totalCache > 0 ? cacheHits / totalCache : 0,
      errors,
      avgDurationMs:
        detections > 0 ? Math.round(totalDurationMs / detections) : 0,
      cacheSize: this._cache.size,
    });
  }

  /**
   * Clear the in-memory cache (useful in tests / long-running workers).
   */
  clearCache() {
    this._cache.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Detection engines
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Classic parametric Z-score (assumes roughly normal distribution).
   * Single-pass mean + variance.
   */
  _detectZScore(values, dates, threshold, metricDisplayName) {
    const anomalies = [];
    const n = values.length;
    if (n < this.minDataPoints) return anomalies;

    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[i];
    const mean = sum / n;

    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const d = values[i] - mean;
      sumSq += d * d;
    }
    const variance = sumSq / n; // population variance
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0 || !Number.isFinite(stdDev)) return anomalies;

    for (let i = 0; i < n; i++) {
      const value = values[i];
      const zScore = (value - mean) / stdDev;
      if (Math.abs(zScore) > threshold) {
        anomalies.push(
          this._buildAnomaly({
            index: i,
            value,
            mean,
            stdDev,
            zScore,
            deviationPercent: mean !== 0 ? ((value - mean) / mean) * 100 : 0,
            threshold,
            metricDisplayName,
            dates,
            method: 'zscore',
          })
        );
      }
    }

    return this._sortByAbsMagnitude(anomalies, 'zScore');
  }

  /**
   * Robust Z-score using Median Absolute Deviation (MAD).
   * Resistant to contamination by outliers – preferred for skewed business data.
   * Modified Z-score ≈ consistencyConstant * (x − median) / MAD
   */
  _detectRobustZScore(values, dates, threshold, metricDisplayName) {
    const anomalies = [];
    const n = values.length;
    if (n < this.minDataPoints) return anomalies;

    const median = this._median(values);
    const absDevs = new Array(n);
    for (let i = 0; i < n; i++) {
      absDevs[i] = Math.abs(values[i] - median);
    }
    const mad = this._median(absDevs);

    const c = this.madConsistencyConstant;
    if (mad === 0 || !Number.isFinite(mad)) {
      return anomalies; // all points identical → no anomalies
    }

    for (let i = 0; i < n; i++) {
      const value = values[i];
      const modifiedZ = (c * (value - median)) / mad;
      if (Math.abs(modifiedZ) > threshold) {
        anomalies.push(
          this._buildAnomaly({
            index: i,
            value,
            mean: median, // centre for messaging
            stdDev: mad / c, // approximate robust σ
            zScore: modifiedZ,
            deviationPercent:
              median !== 0 ? ((value - median) / median) * 100 : 0,
            threshold,
            metricDisplayName,
            dates,
            method: 'robust_zscore',
          })
        );
      }
    }

    return this._sortByAbsMagnitude(anomalies, 'zScore');
  }

  /**
   * Percentage deviation from a trimmed mean (10–90 percentile).
   */
  _detectPercentageDeviation(values, dates, metricDisplayName) {
    const anomalies = [];
    const n = values.length;
    if (n < this.minDataPoints) return anomalies;

    const sorted = values.slice().sort((a, b) => a - b);
    const lowerIdx = Math.floor(n * 0.1);
    const upperIdx = Math.floor(n * 0.9);
    const lower = sorted[lowerIdx];
    const upper = sorted[Math.min(upperIdx, n - 1)];

    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v >= lower && v <= upper) {
        sum += v;
        count += 1;
      }
    }
    const avg = count > 0 ? sum / count : sorted.reduce((a, b) => a + b, 0) / n;
    if (avg === 0 || !Number.isFinite(avg)) return anomalies;

    for (let i = 0; i < n; i++) {
      const value = values[i];
      const deviation = ((value - avg) / avg) * 100;
      if (Math.abs(deviation) > this.minDeviationPercent) {
        anomalies.push(
          this._buildAnomaly({
            index: i,
            value,
            mean: avg,
            stdDev: null,
            zScore: null,
            deviationPercent: deviation,
            threshold: this.minDeviationPercent,
            metricDisplayName,
            dates,
            method: 'percentage',
          })
        );
      }
    }

    return this._sortByAbsMagnitude(anomalies, 'deviationPercent');
  }

  /**
   * Rolling moving-average deviation.
   * Window is adaptive: clamp(round(n * ratio), min, max).
   */
  _detectMovingAverage(values, dates, metricDisplayName) {
    const anomalies = [];
    const n = values.length;
    const ratio = this.config.movingAverageWindowRatio ?? 0.2;
    const minW = this.config.movingAverageMinWindow ?? 3;
    const maxW = this.config.movingAverageMaxWindow ?? 14;
    const windowSize = Math.min(
      maxW,
      Math.max(minW, Math.floor(n * ratio))
    );

    if (n < windowSize + 2) return anomalies;

    // Running sum for O(n) window mean
    let windowSum = 0;
    for (let i = 0; i < windowSize; i++) windowSum += values[i];

    for (let i = windowSize; i < n; i++) {
      const avg = windowSum / windowSize;
      const value = values[i];
      const deviation = avg > 0 ? ((value - avg) / avg) * 100 : 0;

      if (Math.abs(deviation) > this.minDeviationPercent) {
        anomalies.push(
          this._buildAnomaly({
            index: i,
            value,
            mean: avg,
            stdDev: null,
            zScore: null,
            deviationPercent: deviation,
            threshold: this.minDeviationPercent,
            metricDisplayName,
            dates,
            method: 'moving_average',
            extra: { windowSize, movingAverage: Number(avg.toFixed(2)) },
          })
        );
      }

      // Slide window
      windowSum += values[i] - values[i - windowSize];
    }

    return this._sortByAbsMagnitude(anomalies, 'deviationPercent');
  }

  /**
   * Interquartile Range (IQR) fence method – robust to non-normal data.
   * Flag points outside [Q1 − k·IQR, Q3 + k·IQR].
   */
  _detectIQR(values, dates, metricDisplayName) {
    const anomalies = [];
    const n = values.length;
    if (n < this.minDataPoints) return anomalies;

    const sorted = values.slice().sort((a, b) => a - b);
    const q1 = this._percentile(sorted, 25);
    const q3 = this._percentile(sorted, 75);
    const iqr = q3 - q1;

    if (iqr === 0 || !Number.isFinite(iqr)) return anomalies;

    const kMild = this.iqrMildMultiplier;
    const kExtreme = this.iqrExtremeMultiplier;
    const lowerMild = q1 - kMild * iqr;
    const upperMild = q3 + kMild * iqr;
    const lowerExtreme = q1 - kExtreme * iqr;
    const upperExtreme = q3 + kExtreme * iqr;
    const centre = (q1 + q3) / 2;

    for (let i = 0; i < n; i++) {
      const value = values[i];
      let isOutlier = false;
      let severityHint = null;

      if (value < lowerExtreme || value > upperExtreme) {
        isOutlier = true;
        severityHint = 'CRITICAL';
      } else if (value < lowerMild || value > upperMild) {
        isOutlier = true;
        severityHint = 'HIGH';
      }

      if (isOutlier) {
        const deviationPercent =
          centre !== 0 ? ((value - centre) / centre) * 100 : 0;
        const anomaly = this._buildAnomaly({
          index: i,
          value,
          mean: centre,
          stdDev: iqr / 1.349, // approx σ for normal
          zScore: null,
          deviationPercent,
          threshold: kMild,
          metricDisplayName,
          dates,
          method: 'iqr',
          extra: {
            q1: Number(q1.toFixed(2)),
            q3: Number(q3.toFixed(2)),
            iqr: Number(iqr.toFixed(2)),
            lowerFence: Number(lowerMild.toFixed(2)),
            upperFence: Number(upperMild.toFixed(2)),
          },
        });
        if (severityHint === 'CRITICAL') {
          Object.defineProperty(anomaly, 'severity', {
            value: 'CRITICAL',
            writable: false,
            enumerable: true,
          });
        }
        anomalies.push(anomaly);
      }
    }

    return this._sortByAbsMagnitude(anomalies, 'deviationPercent');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Severity / scoring / messaging
  // ─────────────────────────────────────────────────────────────────────────

  _buildAnomaly({
    index,
    value,
    mean,
    stdDev,
    zScore,
    deviationPercent,
    threshold,
    metricDisplayName,
    dates,
    method,
    extra = {},
  }) {
    const isSpike = value > mean;
    const direction = isSpike ? 'SPIKE' : 'DROP';
    let severity;

    if (zScore != null && Number.isFinite(zScore)) {
      severity = this._getZScoreSeverity(Math.abs(zScore), threshold);
    } else {
      severity = this._getPercentageSeverity(Math.abs(deviationPercent));
    }

    const base = {
      index,
      value,
      mean: mean != null ? Number(Number(mean).toFixed(4)) : null,
      stdDev: stdDev != null ? Number(Number(stdDev).toFixed(4)) : null,
      zScore: zScore != null ? Number(Number(zScore).toFixed(4)) : null,
      deviationPercent: Number(Number(deviationPercent).toFixed(2)),
      severity,
      direction,
      date: dates[index] != null ? dates[index] : null,
      isSpike,
      isDrop: !isSpike,
      method,
      message: this._generateAnomalyMessage(
        metricDisplayName,
        value,
        mean,
        zScore,
        direction,
        severity
      ),
      ...extra,
    };

    return Object.freeze(base);
  }

  _getZScoreSeverity(zScore, threshold) {
    const ratio = zScore / (threshold || 1);
    if (ratio > this.severityCriticalRatio) return 'CRITICAL';
    if (ratio > this.severityHighRatio) return 'HIGH';
    if (ratio > this.severityMediumRatio) return 'MEDIUM';
    return 'LOW';
  }

  _getPercentageSeverity(deviation) {
    if (deviation > this.severityCriticalPercent) return 'CRITICAL';
    if (deviation > this.severityHighPercent) return 'HIGH';
    if (deviation > this.severityMediumPercent) return 'MEDIUM';
    return 'LOW';
  }

  _deriveSeverity(counts) {
    if (counts.critical > 0) return 'CRITICAL';
    if (counts.high > 0) return 'HIGH';
    if (counts.medium > 0) return 'MEDIUM';
    if (counts.low > 0) return 'LOW';
    return 'NONE';
  }

  _calculateScore(severity, counts) {
    let score = this.scoreBase[severity] || 0;
    score += Math.min(counts.total * this.scorePerAnomaly, this.scorePerAnomalyCap);
    return Math.min(100, Math.round(score));
  }

  _deriveTrend(anomalies) {
    if (anomalies.length === 0) return 'STABLE';
    let spikes = 0;
    let drops = 0;
    for (const a of anomalies) {
      if (a.isSpike) spikes += 1;
      else drops += 1;
    }
    if (spikes > drops) return 'WORSENING';
    if (drops > spikes) return 'IMPROVING';
    return 'STABLE';
  }

  _calculateImpact(anomalies, values) {
    if (anomalies.length === 0) return { financial: 0 };
    let maxDev = 0;
    for (const a of anomalies) {
      const d = Math.abs(a.deviationPercent || 0);
      if (d > maxDev) maxDev = d;
    }
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    const avgValue = sum / values.length;
    const financialImpact = (maxDev / 100) * avgValue;
    return {
      financial: Math.round(
        Number.isFinite(financialImpact) ? financialImpact : 0
      ),
    };
  }

  _countBySeverity(anomalies) {
    const counts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      total: anomalies.length,
    };
    for (const a of anomalies) {
      const key = (a.severity || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, key)) {
        counts[key] += 1;
      }
    }
    return counts;
  }

  _generateAnomalyMessage(metric, value, avg, zScore, direction, severity) {
    const dirLabel = direction === 'SPIKE' ? 'spike' : 'drop';
    const severityLabel =
      {
        CRITICAL: 'Critical',
        HIGH: 'Significant',
        MEDIUM: 'Moderate',
        LOW: 'Minor',
      }[severity] || '';
    let msg = `${severityLabel} ${dirLabel} in ${metric}`;
    if (zScore != null && Number.isFinite(zScore)) {
      msg += ` (z-score: ${Number(zScore).toFixed(2)})`;
    }
    const dev = avg != null && avg !== 0 ? ((value - avg) / avg) * 100 : 0;
    msg += `: ${dev > 0 ? '+' : ''}${dev.toFixed(1)}% deviation`;
    return msg;
  }

  _generateSummary(anomalies, metric) {
    if (anomalies.length === 0) return `No anomalies detected in ${metric}`;
    const counts = this._countBySeverity(anomalies);
    const parts = [];
    if (counts.critical > 0) parts.push(`${counts.critical} critical`);
    if (counts.high > 0) parts.push(`${counts.high} high`);
    parts.push(`${counts.total} total`);
    const latest = anomalies[anomalies.length - 1];
    return `${parts.join(', ')} anomaly(ies) in ${metric}. Latest: ${latest.message}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Result factories
  // ─────────────────────────────────────────────────────────────────────────

  _createUnavailableResult(metric, metricDisplayName, count) {
    return Object.freeze({
      available: false,
      reason: 'INSUFFICIENT_DATA',
      message: `Need at least ${this.minDataPoints} data points (${count} available)`,
      metric,
      metricDisplayName,
      anomalies: Object.freeze([]),
      summary: `Insufficient data for anomaly detection in ${metricDisplayName}`,
      counts: Object.freeze({
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
        total: 0,
      }),
      hasAnomalies: false,
      hasCritical: false,
      hasHigh: false,
      risk: null,
      meta: Object.freeze({
        detector: 'AnomalyDetector',
        detectorVersion: AnomalyDetector.DETECTOR_VERSION,
      }),
    });
  }

  _createFallbackResult(metric, metricDisplayName, error) {
    return Object.freeze({
      available: true,
      metric,
      metricDisplayName,
      anomalies: Object.freeze([]),
      summary: `Anomaly detection failed: ${error?.message || 'Unknown error'}`,
      counts: Object.freeze({
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
        total: 0,
      }),
      hasAnomalies: false,
      hasCritical: false,
      hasHigh: false,
      risk: Object.freeze(
        RiskContracts.anomaly({
          metric,
          metricDisplayName,
          score: 50,
          severity: 'MEDIUM',
          status: RISK_STATUS.ACTIVE,
        })
      ),
      meta: Object.freeze({
        detector: 'AnomalyDetector',
        detectorVersion: AnomalyDetector.DETECTOR_VERSION,
        error: true,
        errorMessage: error?.message || 'Unknown error',
      }),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Validation, cache, utilities
  // ─────────────────────────────────────────────────────────────────────────

  _assertDetectInput({ values, metric, method }) {
    if (
      metric == null ||
      (typeof metric !== 'string' && typeof metric !== 'number')
    ) {
      throw new TypeError('metric is required and must be a string or number');
    }
    if (values == null) {
      throw new TypeError('values is required');
    }
    if (!Array.isArray(values) && typeof values !== 'object') {
      throw new TypeError('values must be an array-like of numbers');
    }
    if (
      method != null &&
      typeof method === 'string' &&
      !AnomalyDetector.SUPPORTED_METHODS.includes(method.toLowerCase())
    ) {
      this.logger.warn?.(
        `[AnomalyDetector] unsupported method "${method}", falling back to ${this.defaultMethod}`
      );
    }
  }

  _normalizeMethod(method) {
    if (method == null) return this.defaultMethod || 'robust_zscore';
    const m = String(method).toLowerCase().trim();
    return AnomalyDetector.SUPPORTED_METHODS.includes(m)
      ? m
      : this.defaultMethod || 'robust_zscore';
  }

  _resolveThreshold(method, override) {
    if (override != null && Number.isFinite(Number(override))) {
      return Number(override);
    }
    if (method === 'robust_zscore') return this.robustThreshold;
    if (method === 'zscore') return this.threshold;
    // percentage / moving_average / iqr use minDeviationPercent or IQR multipliers
    return this.minDeviationPercent;
  }

  _sanitizeValues(values) {
    const arr = Array.isArray(values) ? values : Array.from(values || []);
    const out = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      const num = Number(arr[i]);
      out[i] = Number.isFinite(num) ? num : 0;
    }
    return out;
  }

  _getCacheKey({ values, metric, method, threshold }) {
    const tail = Array.isArray(values)
      ? values
          .slice(-8)
          .map((v) => Number(v) || 0)
          .join(',')
      : '';
    const len = Array.isArray(values) ? values.length : 0;
    return `${metric}|${method}|${threshold ?? ''}|${len}|${tail}`;
  }

  _setCache(key, value) {
    if (this._cache.size >= this._maxCacheSize) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
    }
    this._cache.set(key, { value, ts: Date.now() });
  }

  _sortByAbsMagnitude(anomalies, field) {
    return anomalies.sort((a, b) => {
      const av = Math.abs(a[field] ?? 0);
      const bv = Math.abs(b[field] ?? 0);
      return bv - av;
    });
  }

  _median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Linear-interpolation percentile on a pre-sorted array.
   * @param {number[]} sorted
   * @param {number} p  0–100
   */
  _percentile(sorted, p) {
    if (!sorted.length) return 0;
    if (sorted.length === 1) return sorted[0];
    const rank = (p / 100) * (sorted.length - 1);
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    if (low === high) return sorted[low];
    const w = rank - low;
    return sorted[low] * (1 - w) + sorted[high] * w;
  }

  _coercePositiveNumber(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  _coercePositiveInteger(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }
}

module.exports = AnomalyDetector;
