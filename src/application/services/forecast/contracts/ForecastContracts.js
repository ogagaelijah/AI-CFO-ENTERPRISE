// src/application/services/forecast/contracts/ForecastContracts.js
// Phase 5.1 - Production SSOT Factory | IFRS Compliant | Stateless | O(1)

const FORECAST_HORIZONS = {
    '7D': { label: '7 Days', days: 7 },
    '14D': { label: '14 Days', days: 14 },
    '30D': { label: '30 Days', days: 30 },
    '60D': { label: '60 Days', days: 60 },
    '90D': { label: '90 Days', days: 90 },
    '6M': { label: '6 Months', days: 180 },
    '12M': { label: '12 Months', days: 365 },
};

const DATA_SUFFICIENCY = {
    INSUFFICIENT: 'INSUFFICIENT',
    MARGINAL: 'MARGINAL',
    SUFFICIENT: 'SUFFICIENT',
};

const CONFIDENCE_LEVELS = {
    VERY_LOW: { label: 'Very Low', minScore: 0, maxScore: 20, color: 'red' },
    LOW: { label: 'Low', minScore: 21, maxScore: 40, color: 'orange' },
    MODERATE: { label: 'Moderate', minScore: 41, maxScore: 60, color: 'yellow' },
    GOOD: { label: 'Good', minScore: 61, maxScore: 80, color: 'lightgreen' },
    STRONG: { label: 'Strong', minScore: 81, maxScore: 100, color: 'green' },
};

const FORECAST_METHODS = {
    SIMPLE_AVERAGE: 'simple_average',
    MOVING_AVERAGE: 'moving_average',
    WEIGHTED_MOVING_AVERAGE: 'weighted_moving_average',
    LINEAR_TREND: 'linear_trend',
    SEASONAL: 'seasonal',
    EXPONENTIAL_SMOOTHING: 'exponential_smoothing',
    REGRESSION: 'regression',
};

class ForecastContracts {
    static _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }
    static _safeArray(arr) { return Array.isArray(arr)? arr : []; }
    static _clamp(val, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(val))); }

    static _getConfidenceLevel(score) {
        for (const [key, level] of Object.entries(CONFIDENCE_LEVELS)) {
            if (score >= level.minScore && score <= level.maxScore) return key;
        }
        return 'MODERATE';
    }

    static _getConfidenceSummary(score, level) {
        const labels = {
            VERY_LOW: 'Very low confidence — insufficient historical data',
            LOW: 'Low confidence — limited historical data',
            MODERATE: 'Moderate confidence — adequate historical data',
            GOOD: 'Good confidence — strong historical data and clear patterns',
            STRONG: 'Strong confidence — extensive historical data with consistent patterns',
        };
        return labels[level] || 'Moderate confidence based on available data';
    }

    static _calculateDefaultBounds(forecast, method) {
        if (method === FORECAST_METHODS.SIMPLE_AVERAGE) return { lower: forecast * 0.85, upper: forecast * 1.15 };
        if (method === FORECAST_METHODS.LINEAR_TREND) return { lower: forecast * 0.90, upper: forecast * 1.10 };
        if (method === FORECAST_METHODS.SEASONAL) return { lower: forecast * 0.80, upper: forecast * 1.20 };
        return { lower: forecast * 0.85, upper: forecast * 1.15 };
    }

    static createForecast({
        metric, displayName, period, forecast = 0,
        lowerBound = null, upperBound = null,
        method = FORECAST_METHODS.MOVING_AVERAGE,
        confidence = null,
        historicalBasis = null, assumptions = [],
        dataStatus = DATA_SUFFICIENCY.SUFFICIENT, risks = [], metadata = {}
    }) {
        const horizonInfo = FORECAST_HORIZONS[period?.horizon] || FORECAST_HORIZONS['30D'];
        const fValue = this._safeNumber(forecast);
        const bounds = this._calculateDefaultBounds(fValue, method);

        const score = confidence?.score!== undefined? this._clamp(confidence.score) : 50;
        const level = confidence?.level || this._getConfidenceLevel(score);

        const finalLower = lowerBound!== null? this._safeNumber(lowerBound) : bounds.lower;
        const finalUpper = upperBound!== null? this._safeNumber(upperBound) : bounds.upper;

        return Object.freeze({
            metric: String(metric),
            displayName: String(displayName),
            period: Object.freeze({
                startDate: String(period?.startDate || ''),
                endDate: String(period?.endDate || ''),
                label: String(period?.label || horizonInfo.label),
                horizon: period?.horizon || '30D',
                days: horizonInfo.days
            }),
            forecast: Number(fValue.toFixed(2)),
            lowerBound: Number(this._safeNumber(finalLower).toFixed(2)),
            upperBound: Number(this._safeNumber(finalUpper).toFixed(2)),
            method: String(method),
            confidence: Object.freeze({
                score: score,
                level: String(level),
                factors: Object.freeze(confidence?.factors || {}),
                summary: confidence?.summary || this._getConfidenceSummary(score, level)
            }),
            historicalBasis: Object.freeze(historicalBasis || { periodsUsed: 0, average: 0, trend: null }),
            assumptions: this._safeArray(assumptions),
            dataStatus: String(dataStatus),
            risks: this._safeArray(risks),
            metadata: Object.freeze({...metadata, processedAt: new Date().toISOString() })
        });
    }

    static createScenario({ type = 'EXPECTED', label, values = {}, description = '', assumptions = [] }) {
        return Object.freeze({
            type: String(type),
            label: String(label || type.toLowerCase()),
            values: Object.freeze({...values }),
            description: String(description),
            assumptions: this._safeArray(assumptions)
        });
    }

    static createWhatIfResult({ parameter, originalValue = 0, newValue = 0, parameterType = 'OTHER', impact }) {
        const orig = this._safeNumber(originalValue);
        const imp = this._safeNumber(impact);
        const impactChange = imp - orig;
        const impactPercentage = orig!== 0? (impactChange / orig) * 100 : 0;

        return Object.freeze({
            parameter: String(parameter),
            originalValue: orig,
            newValue: this._safeNumber(newValue),
            parameterType: String(parameterType),
            impact: Object.freeze({
                forecastChange: Number(impactChange.toFixed(2)),
                percentageChange: Number(impactPercentage.toFixed(2)),
                direction: impactChange > 0? 'INCREASE' : impactChange < 0? 'DECREASE' : 'NEUTRAL'
            })
        });
    }

    static createConfidence({ score = 50, factors = {}, summary = null }) {
        const clampedScore = this._clamp(score);
        const level = this._getConfidenceLevel(clampedScore);

        return Object.freeze({
            score: clampedScore,
            level,
            factors: Object.freeze({
                historicalDataPoints: this._safeNumber(factors?.historicalDataPoints),
                dataConsistency: String(factors?.dataConsistency || 'MODERATE'),
                volatility: this._safeNumber(factors?.volatility),
                trendStability: this._safeNumber(factors?.trendStability),
                seasonalityEvidence: this._safeNumber(factors?.seasonalityEvidence),
                priorAccuracy: this._safeNumber(factors?.priorAccuracy)
            }),
            summary: summary || this._getConfidenceSummary(clampedScore, level)
        });
    }

    static createRisk({ metric, displayName, type, severity = 'LOW', description = '', trigger = '', action = null, impact = null }) {
        return Object.freeze({
            metric: String(metric),
            displayName: String(displayName),
            type: String(type),
            severity: String(severity),
            description: String(description),
            trigger: String(trigger),
            action: action? String(action) : null,
            impact: impact!== null? this._safeNumber(impact) : null
        });
    }

    static createForecastAccuracy({ metric, period, forecast = 0, actual = 0, runningCumulativeError = 0, averageErrorOverTime = 0, status = 'STABLE' }) {
        const f = this._safeNumber(forecast);
        const a = this._safeNumber(actual);
        const absoluteError = Math.abs(f - a);
        const percentageError = f > 0? (absoluteError / f) * 100 : 0;

        let direction = 'EXACT';
        if (f > a) direction = 'OVER';
        if (f < a) direction = 'UNDER';

        return Object.freeze({
            metric: String(metric),
            period: String(period),
            forecast: f,
            actual: a,
            absoluteError: Number(absoluteError.toFixed(2)),
            percentageError: Number(percentageError.toFixed(2)),
            direction,
            cumulativeError: this._safeNumber(runningCumulativeError),
            averageError: this._safeNumber(averageErrorOverTime),
            status: String(status)
        });
    }

    static insufficientData(metric, displayName, reason = 'INSUFFICIENT_HISTORY') {
        return Object.freeze({
            metric: String(metric),
            displayName: String(displayName),
            available: false,
            reason,
            dataStatus: DATA_SUFFICIENCY.INSUFFICIENT,
            message: `Not enough historical data to produce a reliable ${displayName} forecast.`
        });
    }

    static isDataSufficient(dataPoints, minRequired = 7) {
        return this._safeNumber(dataPoints) >= minRequired;
    }

    // PRODUCTION THRESHOLDS: 90 days = SUFFICIENT. Conservative for finance
    static getDataSufficiency(dataPoints, minRequired = 90, marginalThreshold = 30) {
        const count = this._safeNumber(dataPoints);
        if (count >= minRequired) return DATA_SUFFICIENCY.SUFFICIENT;
        if (count >= marginalThreshold) return DATA_SUFFICIENCY.MARGINAL;
        return DATA_SUFFICIENCY.INSUFFICIENT;
    }

    // PRODUCTION THRESHOLDS: 365 days = STRONG. Aligns with IFRS yearly cycles
    static getConfidenceFromDataPoints(dataPoints) {
        const count = this._safeNumber(dataPoints);
        if (count >= 365) return 'STRONG';
        if (count >= 180) return 'GOOD';
        if (count >= 90) return 'MODERATE';
        if (count >= 30) return 'LOW';
        return 'VERY_LOW';
    }
}

// PROD EXPORT: Named for destructuring + SSOT
module.exports = {
    ForecastContracts,
    FORECAST_HORIZONS,
    DATA_SUFFICIENCY,
    CONFIDENCE_LEVELS,
    FORECAST_METHODS
};