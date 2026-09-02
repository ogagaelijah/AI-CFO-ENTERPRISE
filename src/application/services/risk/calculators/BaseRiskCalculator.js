'use strict';

const { RiskContracts, RISK_STATUS } = require('../contracts');

/**
 * BaseRiskCalculator - Shared foundation for all risk calculators
 * Version: 1.0.0
 *
 * Provides:
 * - Zero-crash guarantee
 * - Deep-freeze safe enrichment
 * - Configurable thresholds
 * - Consistent confidence, trend, status, meta, warnings
 * - Performance guards
 * - Observability hooks
 */
class BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.0.0';

  constructor({
    trendAnalyzer = null,
    volatilityAnalyzer = null,
    logger = console,
    config = {},
  } = {}) {
    // Lazy require to avoid circular deps / cold-start cost
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

    this.logger = logger;
    this.config = {
      maxDataPoints: 120,          // safety against huge arrays
      trendMinPoints: 3,
      stableDelta: 5,              // score points
      ...config,
    };
  }

  // ──────────────────────────────────────────────
  // Public helpers used by children
  // ──────────────────────────────────────────────

  _safeNumber(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  _safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  _clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /**
   * Extract numeric series from heterogeneous data shapes
   */
  _extractValues(data, keys = ['value', 'amount', 'revenue', 'receivables', 'payables', 'inventory', 'margin', 'percentage']) {
    return this._safeArray(data)
      .slice(-this.config.maxDataPoints) // performance guard
      .map((d) => {
        if (typeof d === 'number') return this._safeNumber(d);
        for (const k of keys) {
          if (d?.[k] !== undefined) return this._safeNumber(d[k]);
        }
        return 0;
      });
  }

  // ──────────────────────────────────────────────
  // Enrichment (deep-freeze safe)
  // ──────────────────────────────────────────────

  _enrichMetrics(risk, extraMetrics = {}) {
    return Object.freeze({
      ...risk,
      metrics: Object.freeze({ ...risk.metrics, ...extraMetrics }),
    });
  }

  _enrichEvidence(risk, extraEvidence = []) {
    if (!extraEvidence.length) return risk;
    return Object.freeze({
      ...risk,
      evidence: Object.freeze([...risk.evidence, ...extraEvidence]),
    });
  }

  _enrichWarnings(risk, warnings = []) {
    return Object.freeze({
      ...risk,
      warnings: Object.freeze(Array.isArray(warnings) ? [...warnings] : []),
    });
  }

  _enrichMeta(risk, meta = {}) {
    return Object.freeze({
      ...risk,
      meta: Object.freeze({
        ...risk.meta,
        calculator: this.constructor.name,
        calculatorVersion: this.constructor.CALCULATOR_VERSION,
        ...meta,
      }),
    });
  }

  _enrichWithTrend(risk, values) {
    if (values.length < this.config.trendMinPoints) return risk;

    const trend = this.trendAnalyzer.analyze(values);
    if (!trend?.available) return risk;

    const direction = this._mapTrendDirection(trend);

    return Object.freeze({
      ...risk,
      trend: Object.freeze({
        ...risk.trend,
        direction,
        slope: trend.slope,
        strength: trend.strength,
        rSquared: trend.rSquared ?? null,
      }),
      metrics: Object.freeze({
        ...risk.metrics,
        trendSlope: trend.slope,
        trendStrength: trend.strength,
        rSquared: trend.rSquared ?? null,
      }),
    });
  }

  // ──────────────────────────────────────────────
  // Scoring helpers
  // ──────────────────────────────────────────────

  _calculateConfidence(dataPoints, extraBoost = 0) {
    let confidence = 0.35;
    if (dataPoints >= 12) confidence += 0.30;
    else if (dataPoints >= 6) confidence += 0.20;
    else if (dataPoints >= 3) confidence += 0.10;
    else confidence -= 0.15;

    confidence += extraBoost;
    return this._clamp(confidence, 0.05, 0.98);
  }

  /**
   * Map severity + previous risk → correct SSOT status
   */
  _mapToStatus(score, previousRisk = null) {
    const severity = RiskContracts.getSeverity(score);

    // If previous risk existed and score improved significantly → MITIGATED
    if (previousRisk?.score != null) {
      const delta = previousRisk.score - score;
      if (delta >= 15 && severity !== 'CRITICAL' && severity !== 'HIGH') {
        return RISK_STATUS.MITIGATED;
      }
    }

    // New or still elevated risks stay ACTIVE
    return RISK_STATUS.ACTIVE;
  }

  _mapTrendDirection(trend, invert = false) {
    if (!trend?.available) return 'STABLE';
    const THRESHOLD = 0.08;
    if (Math.abs(trend.slope) <= THRESHOLD) return 'STABLE';

    const isPositive = trend.slope > 0;
    if (invert) {
      // For receivables / payables / inventory: rising = bad
      return isPositive ? 'WORSENING' : 'IMPROVING';
    }
    // For revenue / margin: rising = good
    return isPositive ? 'IMPROVING' : 'WORSENING';
  }

  // ──────────────────────────────────────────────
  // Fallback
  // ──────────────────────────────────────────────

  _createFallbackRisk({ type, title, userId, businessId, error, extra = {} }) {
    return RiskContracts.createRisk({
      type,
      title: title || `${type} Risk Assessment Failed`,
      score: 75,
      description: `Calculator failed: ${error?.message || 'Unknown error'}`,
      status: RISK_STATUS.ACTIVE,
      confidence: 0.08,
      meta: {
        userId,
        businessId,
        calculator: this.constructor.name,
        calculatorVersion: this.constructor.CALCULATOR_VERSION,
        error: true,
        errorMessage: error?.message,
        ...extra,
      },
    });
  }
}

module.exports = BaseRiskCalculator;