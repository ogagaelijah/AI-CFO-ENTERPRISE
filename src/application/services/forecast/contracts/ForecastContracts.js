// src/application/services/forecast/contracts/ForecastContracts.js
// Phase 5.4.1 - Production SSOT Factory | IFRS Compliant | Stateless | O(1) | 1M+ SCALE

const FORECAST_HORIZONS = {
    '7D': { label: '7 Days', days: 7 },
    '14D': { label: '14 Days', days: 14 },
    '30D': { label: '30 Days', days: 30 },
    '60D': { label: '60 Days', days: 60 },
    '90D': { label: '90 Days', days: 90 },
    '6M': { label: '6 Months', days: 180 },
    '12M': { label: '12 Months', days: 365 },
};

// PROD THRESHOLDS: 7/30/90
const DATA_SUFFICIENCY = {
    INSUFFICIENT: 'INSUFFICIENT', // < 7
    MINIMAL: 'MINIMAL', // 7 - 29
    SUFFICIENT: 'SUFFICIENT', // 30 - 89
    EXCELLENT: 'EXCELLENT', // >= 90
};

const CONFIDENCE_LEVELS = {
    VERY_LOW: { label: 'Very Low', minScore: 0, maxScore: 20, color: '#DC2626' },
    LOW: { label: 'Low', minScore: 21, maxScore: 40, color: '#EA580C' },
    MODERATE: { label: 'Moderate', minScore: 41, maxScore: 60, color: '#CA8A04' },
    GOOD: { label: 'Good', minScore: 61, maxScore: 80, color: '#65A30D' },
    STRONG: { label: 'Strong', minScore: 81, maxScore: 100, color: '#16A34A' },
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
    static get DATA_SUFFICIENCY() { return DATA_SUFFICIENCY; }
    static get FORECAST_HORIZONS() { return FORECAST_HORIZONS; }
    static get CONFIDENCE_LEVELS() { return CONFIDENCE_LEVELS; }
    static get FORECAST_METHODS() { return FORECAST_METHODS; }

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
        const f = Math.max(0, forecast);
        if (method === FORECAST_METHODS.SIMPLE_AVERAGE) return { lower: f * 0.85, upper: f * 1.15 };
        if (method === FORECAST_METHODS.LINEAR_TREND) return { lower: f * 0.90, upper: f * 1.10 };
        if (method === FORECAST_METHODS.SEASONAL) return { lower: f * 0.80, upper: f * 1.20 };
        return { lower: f * 0.85, upper: f * 1.15 };
    }

    static createForecast({
        metric, displayName, period, forecast = 0,
        lowerBound = null, upperBound = null,
        method = FORECAST_METHODS.MOVING_AVERAGE,
        confidence = null, historicalBasis = null, assumptions = [],
        dataStatus = DATA_SUFFICIENCY.SUFFICIENT, risks = [], metadata = {}
    }) {
        const horizonKey = period?.horizon || '30D';
        const horizonInfo = FORECAST_HORIZONS[horizonKey] || FORECAST_HORIZONS['30D'];
        const fValue = this._safeNumber(forecast);
        const bounds = this._calculateDefaultBounds(fValue, method);
        const score = confidence?.score!== undefined? this._clamp(confidence.score) : 50;
        const level = confidence?.level || this._getConfidenceLevel(score);
        const finalLower = lowerBound!== null? Math.max(0, this._safeNumber(lowerBound)) : bounds.lower;
        const finalUpper = upperBound!== null? Math.max(0, this._safeNumber(upperBound)) : bounds.upper;

        return Object.freeze({
            metric: String(metric), displayName: String(displayName),
            period: Object.freeze({
                startDate: String(period?.startDate || period?.start || ''),
                endDate: String(period?.endDate || period?.end || ''),
                label: String(period?.label || horizonInfo.label),
                horizon: horizonKey,
                days: horizonInfo.days
            }),
            forecast: Number(fValue.toFixed(2)),
            lowerBound: Number(finalLower.toFixed(2)),
            upperBound: Number(finalUpper.toFixed(2)),
            method: String(method),
            confidence: Object.freeze({
                score, level: String(level), factors: Object.freeze({...confidence?.factors }),
                summary: confidence?.summary || this._getConfidenceSummary(score, level)
            }),
            historicalBasis: Object.freeze({...historicalBasis }),
            assumptions: this._safeArray(assumptions).slice(0, 5),
            dataStatus: String(dataStatus),
            risks: Object.freeze(this._safeArray(risks).slice(0, 5)), // REMOVED POLYFILL HACK
            metadata: Object.freeze({...metadata, processedAt: new Date().toISOString() })
        });
    }

    static insufficientData(metric, displayName, reason = 'INSUFFICIENT_HISTORY') {
        return this.createForecast({
            metric, displayName, period: null, forecast: 0, lowerBound: 0, upperBound: 0,
            method: 'insufficient_data', confidence: this.createConfidence({ score: 0 }),
            historicalBasis: { periodsUsed: 0, average: 0, trend: null },
            assumptions: [`Not enough historical data to produce a reliable ${displayName} forecast. Minimum 7 data points required.`],
            dataStatus: DATA_SUFFICIENCY.INSUFFICIENT, risks: [], metadata: { dataPoints: 0, reason }
        });
    }

    static isDataSufficient(dataPoints, minRequired = 7) {
        return this._safeNumber(dataPoints) >= minRequired;
    }

    static getDataSufficiency(dataPoints) {
        const count = this._safeNumber(dataPoints);
        if (count >= 90) return DATA_SUFFICIENCY.EXCELLENT;
        if (count >= 30) return DATA_SUFFICIENCY.SUFFICIENT;
        if (count >= 7) return DATA_SUFFICIENCY.MINIMAL;
        return DATA_SUFFICIENCY.INSUFFICIENT;
    }

    static getConfidenceFromDataPoints(dataPoints) {
        const count = this._safeNumber(dataPoints);
        if (count >= 90) return 'STRONG';
        if (count >= 30) return 'GOOD';
        if (count >= 7) return 'MODERATE';
        return 'VERY_LOW';
    }

    static createScenario({ type = 'EXPECTED', label, values = {}, description = '', assumptions = [] }) {
        return Object.freeze({
            type: String(type), label: String(label || type.toLowerCase()),
            values: Object.freeze({...values }), description: String(description),
            assumptions: this._safeArray(assumptions).slice(0, 3)
        });
    }

    static createWhatIfResult({ parameter, originalValue = 0, newValue = 0, parameterType = 'OTHER', impact }) {
        const orig = this._safeNumber(originalValue); const imp = this._safeNumber(impact);
        const impactChange = imp - orig; const impactPercentage = orig!== 0? (impactChange / orig) * 100 : 0;
        return Object.freeze({
            parameter: String(parameter), originalValue: orig, newValue: this._safeNumber(newValue), parameterType: String(parameterType),
            impact: Object.freeze({ forecastChange: Number(impactChange.toFixed(2)), percentageChange: Number(impactPercentage.toFixed(2)), direction: impactChange > 0? 'INCREASE' : impactChange < 0? 'DECREASE' : 'NEUTRAL' })
        });
    }

    // RESTORED: Required by all 5 calculators
    static createConfidence({ score = 50, factors = {}, summary = null }) {
        const clampedScore = this._clamp(score); const level = this._getConfidenceLevel(clampedScore);
        return Object.freeze({
            score: clampedScore, level,
            factors: Object.freeze({
                historicalDataPoints: this._safeNumber(factors?.historicalDataPoints),
                dataConsistency: String(factors?.dataConsistency || 'MODERATE'),
                volatilityIndex: this._safeNumber(factors?.volatilityIndex || factors?.volatility || 0),
                trendStability: this._safeNumber(factors?.trendStability),
                seasonalityEvidence: this._safeNumber(factors?.seasonalityEvidence),
                priorAccuracy: this._safeNumber(factors?.priorAccuracy)
            }),
            summary: summary || this._getConfidenceSummary(clampedScore, level)
        });
    }

    // RESTORED: Required by all 5 calculators
    static createRisk({ metric, displayName, type, severity = 'LOW', description = '', trigger = '', action = null, impact = 0 }) {
        return Object.freeze({
            metric: String(metric), displayName: String(displayName), type: String(type), severity: String(severity),
            description: String(description), trigger: String(trigger),
            action: action? String(action) : null,
            impact: this._safeNumber(impact) // SCALE: never null
        });
    }
}

module.exports = { ForecastContracts, DATA_SUFFICIENCY, FORECAST_HORIZONS, CONFIDENCE_LEVELS, FORECAST_METHODS };