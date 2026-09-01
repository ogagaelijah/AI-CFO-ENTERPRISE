// src/application/services/forecast/intelligence/ConfidenceEngine.js
// SSOT v5.4.4-prod | Deterministic, Audited, Clamped, Zero-crash

const TrendAnalyzer = require('../foundation/TrendAnalyzer');
const SeasonalityDetector = require('../foundation/SeasonalityDetector');
const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

/**
 * ConfidenceEngine — how reliable each forecast is.
 * SSOT: Scores from history + foundation analyzers. No core recalculation.
 * Scale: Stateless, pure CPU, capped inputs, frozen output, DI analyzers.
 */
class ConfidenceEngine {
    static LIMITS = Object.freeze({
        VERSION: '5.4.4-prod',
        WEIGHTS: Object.freeze({
            DATA_POINTS: 0.30,
            VOLATILITY: 0.25,
            TREND_STABILITY: 0.20,
            SEASONALITY: 0.15,
            PRIOR_ACCURACY: 0.10,
        }),
        CLAMPS: Object.freeze({
            SCORE_MIN: 0,
            SCORE_MAX: 100,
        }),
        THRESHOLDS: Object.freeze({
            DATA_POINTS: Object.freeze([7, 14, 30, 60, 90]),
            VOLATILITY_CV: Object.freeze([0.1, 0.2, 0.3, 0.4, 0.6]),
            R_SQUARED: Object.freeze([0.2, 0.4, 0.6, 0.8]),
            SEASONALITY_STRENGTH: Object.freeze([15, 30, 50]),
        }),
        LEVELS: Object.freeze({
            STRONG: 81,
            GOOD: 61,
            MODERATE: 41,
            LOW: 21,
            VERY_LOW: 0,
        }),
        MAX_VALUES: 2000,
        MAX_RECORDS: 2000,
        MAX_COMPARE_METRICS: 50,
        DEFAULT_PRIOR_ACCURACY: 50,
    });

    static NOOP_LOGGER = Object.freeze({
        warn: () => {},
        info: () => {},
        error: () => {},
        debug: () => {},
    });

    /**
     * @param {{ trendAnalyzer?: object, seasonalityDetector?: object, volatilityAnalyzer?: object, logger?: object }} [opts]
     */
    constructor({
        trendAnalyzer = null,
        seasonalityDetector = null,
        volatilityAnalyzer = null,
        logger,
    } = {}) {
        this.trendAnalyzer = trendAnalyzer || new TrendAnalyzer();
        this.seasonalityDetector = seasonalityDetector || new SeasonalityDetector();
        this.volatilityAnalyzer = volatilityAnalyzer || new VolatilityAnalyzer();
        this.logger = logger && typeof logger.warn === 'function'
            ? logger
            : ConfidenceEngine.NOOP_LOGGER;
    }

    /**
     * @param {object} params
     * @param {Array<number>} [params.historicalData]
     * @param {Array<object>} [params.historicalRecords]
     * @param {object} [params.forecast]
     * @param {number|null} [params.priorAccuracy]
     * @param {Date} [params.now]
     * @param {string} [params.traceId]
     * @param {string} [params.requestId]
     */
    calculate({
        historicalData = [],
        historicalRecords = [],
        forecast = {},
        priorAccuracy = null,
        now = new Date(),
        traceId = null,
        requestId = null,
    } = {}) {
        const F = ConfidenceEngine.LIMITS;
        const started =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
        const tid = requestId || traceId || this._traceId(safeNow);

        let values = this._safeArray(historicalData).map(v => this._safeNumber(v));
        let records = this._safeArray(historicalRecords);

        if (values.length > F.MAX_VALUES) {
            this.logger.warn('[ConfidenceEngine] historicalData truncated', {
                traceId: tid,
                original: values.length,
            });
            values = values.slice(-F.MAX_VALUES);
        }
        if (records.length > F.MAX_RECORDS) {
            this.logger.warn('[ConfidenceEngine] historicalRecords truncated', {
                traceId: tid,
                original: records.length,
            });
            records = records.slice(-F.MAX_RECORDS);
        }

        const dataPoints = values.length;
        if (dataPoints === 0) {
            return this._freeze(this._emptyConfidence(safeNow, tid, 'INSUFFICIENT_DATA', started));
        }

        const priorScore =
            priorAccuracy === null || priorAccuracy === undefined
                ? F.DEFAULT_PRIOR_ACCURACY
                : this._clamp(this._safeNumber(priorAccuracy), 0, 100);

        const factors = {
            dataPointsScore: this._scoreDataPoints(dataPoints),
            volatilityScore: this._scoreVolatility(values, tid),
            trendScore: this._scoreTrendStability(values, tid),
            seasonalityScore: this._scoreSeasonality(records, tid),
            priorAccuracyScore: priorScore,
        };

        const W = F.WEIGHTS;
        const weightedScore =
            factors.dataPointsScore * W.DATA_POINTS +
            factors.volatilityScore * W.VOLATILITY +
            factors.trendScore * W.TREND_STABILITY +
            factors.seasonalityScore * W.SEASONALITY +
            factors.priorAccuracyScore * W.PRIOR_ACCURACY;

        const finalScore = Math.round(
            this._clamp(weightedScore, F.CLAMPS.SCORE_MIN, F.CLAMPS.SCORE_MAX)
        );
        const level = this._getLevel(finalScore);
        const consistency = this._getConsistency(level);

        const durationMs =
            (typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now()) - started;

        return this._freeze({
            score: finalScore,
            level,
            factors: {
                historicalDataPoints: dataPoints,
                dataConsistency: consistency,
                // Higher = more volatile environment (inverse of stability score)
                volatility: this._clamp(100 - factors.volatilityScore, 0, 100),
                trendStability: factors.trendScore,
                seasonalityEvidence: factors.seasonalityScore,
                priorAccuracy: factors.priorAccuracyScore,
                breakdown: factors,
            },
            summary: this._generateSummary(finalScore, level, dataPoints),
            metadata: {
                calculatedAt: safeNow.toISOString(),
                confidenceVersion: F.VERSION,
                traceId: tid,
                requestId: tid,
                weightsApplied: { ...W },
                dataPointsUsed: dataPoints,
                recordsUsed: records.length,
                forecastMethod: forecast?.method || null,
                durationMs: Math.round(durationMs * 1000) / 1000,
            },
        });
    }

    /**
     * Compare confidence across metrics.
     * @param {object} forecasts - { [metric]: { historicalData, historicalRecords, forecast, priorAccuracy } }
     * @param {object} [opts] - now, traceId, requestId
     */
    compare(forecasts = {}, opts = {}) {
        const F = ConfidenceEngine.LIMITS;
        const safeNow =
            opts.now instanceof Date && !Number.isNaN(opts.now.getTime())
                ? opts.now
                : new Date();
        const tid = opts.requestId || opts.traceId || this._traceId(safeNow);

        if (!forecasts || typeof forecasts !== 'object') {
            return this._freeze({
                results: {},
                bestMetric: null,
                maxScore: 0,
                summary: 'No confidence data available',
                metadata: {
                    comparedAt: safeNow.toISOString(),
                    traceId: tid,
                    error: 'INVALID_FORECASTS',
                },
            });
        }

        const entries = Object.entries(forecasts).slice(0, F.MAX_COMPARE_METRICS);
        if (Object.keys(forecasts).length > F.MAX_COMPARE_METRICS) {
            this.logger.warn('[ConfidenceEngine] compare truncated to max metrics', {
                traceId: tid,
                max: F.MAX_COMPARE_METRICS,
            });
        }

        const results = {};
        let maxScore = -1;
        let bestMetric = null;

        for (const [metric, data] of entries) {
            const confidence = this.calculate({
                historicalData: data?.historicalData,
                historicalRecords: data?.historicalRecords,
                forecast: data?.forecast,
                priorAccuracy: data?.priorAccuracy,
                now: safeNow,
                traceId: tid,
            });
            results[metric] = confidence;
            if (confidence.score > maxScore) {
                maxScore = confidence.score;
                bestMetric = metric;
            }
        }

        return this._freeze({
            results,
            bestMetric,
            maxScore: maxScore < 0 ? 0 : maxScore,
            summary: bestMetric
                ? `Highest confidence: ${bestMetric} (${maxScore}/100)`
                : 'No confidence data available',
            metadata: {
                comparedAt: safeNow.toISOString(),
                confidenceVersion: F.VERSION,
                traceId: tid,
                requestId: tid,
                metricsCompared: entries.length,
            },
        });
    }

    _scoreDataPoints(dataPoints) {
        const T = ConfidenceEngine.LIMITS.THRESHOLDS.DATA_POINTS;
        if (dataPoints >= T[4]) return 100;
        if (dataPoints >= T[3]) return 85;
        if (dataPoints >= T[2]) return 70;
        if (dataPoints >= T[1]) return 55;
        if (dataPoints >= T[0]) return 40;
        return 25;
    }

    _scoreVolatility(values, traceId) {
        if (values.length < 3) return 30;
        try {
            const volatility = this.volatilityAnalyzer.analyze(values);
            if (!volatility || !volatility.available) return 40;
            const cv = this._safeNumber(volatility.volatility);
            const T = ConfidenceEngine.LIMITS.THRESHOLDS.VOLATILITY_CV;
            if (cv < T[0]) return 95;
            if (cv < T[1]) return 80;
            if (cv < T[2]) return 65;
            if (cv < T[3]) return 50;
            if (cv < T[4]) return 35;
            return 20;
        } catch (e) {
            this.logger.warn('[ConfidenceEngine] Volatility analyzer failed', {
                traceId,
                error: e?.message,
            });
            return 40;
        }
    }

    _scoreTrendStability(values, traceId) {
        if (values.length < 5) return 30;
        try {
            const trend = this.trendAnalyzer.analyze(values);
            if (!trend || !trend.available) return 40;
            const r2 = this._clamp(this._safeNumber(trend.rSquared), 0, 1);
            const T = ConfidenceEngine.LIMITS.THRESHOLDS.R_SQUARED;
            if (r2 > T[3]) return 90;
            if (r2 > T[2]) return 75;
            if (r2 > T[1]) return 60;
            if (r2 > T[0]) return 45;
            return 30;
        } catch (e) {
            this.logger.warn('[ConfidenceEngine] Trend analyzer failed', {
                traceId,
                error: e?.message,
            });
            return 40;
        }
    }

    _scoreSeasonality(records, traceId) {
        if (records.length < 14) return 20;
        try {
            const seasonality = this.seasonalityDetector.detect(records, 'monthly');
            if (!seasonality || !seasonality.available) return 30;
            if (!seasonality.hasSeasonality) return 30;
            const strength = this._safeNumber(seasonality.strength);
            const T = ConfidenceEngine.LIMITS.THRESHOLDS.SEASONALITY_STRENGTH;
            if (strength > T[2]) return 90;
            if (strength > T[1]) return 75;
            if (strength > T[0]) return 55;
            return 35;
        } catch (e) {
            this.logger.warn('[ConfidenceEngine] Seasonality detector failed', {
                traceId,
                error: e?.message,
            });
            return 30;
        }
    }

    _getLevel(score) {
        const L = ConfidenceEngine.LIMITS.LEVELS;
        if (score >= L.STRONG) return 'STRONG';
        if (score >= L.GOOD) return 'GOOD';
        if (score >= L.MODERATE) return 'MODERATE';
        if (score >= L.LOW) return 'LOW';
        return 'VERY_LOW';
    }

    _getConsistency(level) {
        if (level === 'STRONG' || level === 'GOOD') return 'HIGH';
        if (level === 'MODERATE') return 'MODERATE';
        return 'LOW';
    }

    _generateSummary(score, level, dataPoints) {
        const labels = {
            STRONG: `Strong confidence (${score}/100) — ${dataPoints} data points with clear patterns`,
            GOOD: `Good confidence (${score}/100) — ${dataPoints} data points with consistent patterns`,
            MODERATE: `Moderate confidence (${score}/100) — ${dataPoints} data points with some variability`,
            LOW: `Low confidence (${score}/100) — ${dataPoints} data points with significant variability`,
            VERY_LOW: `Very low confidence (${score}/100) — ${dataPoints} data points, high variability`,
        };
        return labels[level] || `Confidence: ${score}/100`;
    }

    _emptyConfidence(now, traceId, reason, started) {
        const durationMs =
            (typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now()) - (started || Date.now());
        return {
            score: 10,
            level: 'VERY_LOW',
            factors: {
                historicalDataPoints: 0,
                dataConsistency: 'LOW',
                volatility: 100,
                trendStability: 0,
                seasonalityEvidence: 0,
                priorAccuracy: 0,
                breakdown: {},
            },
            summary: 'Insufficient historical data for reliable confidence assessment',
            metadata: {
                calculatedAt: now.toISOString(),
                confidenceVersion: ConfidenceEngine.LIMITS.VERSION,
                traceId,
                requestId: traceId,
                error: reason,
                durationMs: Math.round(durationMs * 1000) / 1000,
            },
        };
    }

    _freeze(obj) {
        if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
        Object.freeze(obj);
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val && typeof val === 'object') this._freeze(val);
        }
        return obj;
    }

    _traceId(now) {
        const t = (now instanceof Date ? now.getTime() : Date.now()).toString(36);
        return `conf_${t}_${Math.random().toString(36).slice(2, 8)}`;
    }

    _clamp(val, min, max) {
        return Math.max(min, Math.min(max, this._safeNumber(val)));
    }

    _safeNumber(val) {
        const num = Number(val);
        return Number.isFinite(num) ? num : 0;
    }

    _safeArray(arr) {
        return Array.isArray(arr) ? arr : [];
    }
}

module.exports = ConfidenceEngine;