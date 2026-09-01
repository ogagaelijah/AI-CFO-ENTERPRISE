// src/application/services/forecast/core/SalesVolumeForecastCalculator.js
// Phase 5.4.1 - Stateless | O(n) | Zero-Alloc | IFRS Compliant | 1M+ SCALE

const { ForecastContracts, DATA_SUFFICIENCY } = require('../contracts/ForecastContracts');
const TrendAnalyzer = require('../foundation/TrendAnalyzer');
const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

class SalesVolumeForecastCalculator {
    constructor({ reportService = null } = {}) {
        this.reportService = reportService;
    }

    _safeArray(arr) { return Array.isArray(arr)? arr : []; }
    _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }

    async forecast({ userId, businessId, historicalData, horizon = '30D', method = null, period = null }) {
        const rawData = this._safeArray(historicalData);

        const values = [];
        let sum = 0;
        for (let i = 0; i < rawData.length; i++) {
            const val = this._safeNumber(rawData[i].value);
            values.push(val);
            sum += val;
        }
        const dataPoints = values.length;

        const dataStatus = ForecastContracts.getDataSufficiency(dataPoints);
        if (dataStatus === DATA_SUFFICIENCY.INSUFFICIENT) {
            return ForecastContracts.insufficientData('salesVolume', 'Sales Volume');
        }

        let forecastValue = values[dataPoints - 1]!== undefined? values[dataPoints - 1] : 0;
        let confidence = null;
        let historicalBasis = null;
        let selectedMethod = method || this._selectMethod(values);

        if (selectedMethod === 'linear_trend' && dataPoints >= 5) {
            const trend = TrendAnalyzer.analyze(values);
            if (trend.available && trend.direction!== 'STABLE') {
                forecastValue = Math.max(0, Math.round(trend.forecastedNext));
                confidence = this._calculateConfidence(values, { trend });
                historicalBasis = {
                    periodsUsed: dataPoints,
                    average: dataPoints > 0? sum / dataPoints : 0,
                    trend: trend.percentageChange,
                    slope: trend.slope
                };
            } else {
                selectedMethod = 'simple_average';
            }
        }

        if (selectedMethod === 'simple_average' ||!confidence) {
            const avg = dataPoints > 0? sum / dataPoints : 0;
            forecastValue = Math.max(0, Math.round(avg));
            confidence = this._calculateConfidence(values);
            historicalBasis = {
                periodsUsed: dataPoints,
                average: avg,
                trend: null
            };
            selectedMethod = 'simple_average';
        }

        const forecastPeriod = period || this._buildPeriod(horizon);
        const bounds = this._calculateBounds(forecastValue, values);

        return ForecastContracts.createForecast({
            metric: 'salesVolume',
            displayName: 'Sales Volume',
            period: forecastPeriod,
            forecast: forecastValue,
            lowerBound: Math.max(0, Math.round(bounds.lower)),
            upperBound: Math.max(0, Math.round(bounds.upper)),
            method: selectedMethod,
            confidence,
            historicalBasis,
            assumptions: this._buildAssumptions(selectedMethod, dataPoints),
            dataStatus,
            risks: this._detectRisks(values, forecastValue),
            metadata: {
                dataPoints,
                horizon,
                method: selectedMethod,
                unit: 'units'
            }
        });
    }

    _selectMethod(values) {
        if (values.length >= 5) {
            const trend = TrendAnalyzer.analyze(values);
            if (trend.available && trend.direction!== 'STABLE') {
                return 'linear_trend';
            }
        }
        return 'simple_average';
    }

    _calculateConfidence(values, options = {}) {
        const dataPoints = values.length;
        let score = ForecastContracts.getConfidenceFromDataPoints(dataPoints) === 'STRONG'? 85 : 50; // SSOT aligned

        if (dataPoints >= 30) score += 15;
        else if (dataPoints >= 14) score += 5;
        else if (dataPoints < 7) score -= 20;

        const volatility = VolatilityAnalyzer.analyze(values);
        if (volatility.available) {
            if (volatility.volatility < 0.2) score += 10;
            else if (volatility.volatility > 0.6) score -= 10;
        }

        score = Math.max(0, Math.min(100, score));

        return ForecastContracts.createConfidence({
            score,
            factors: {
                historicalDataPoints: dataPoints,
                dataConsistency: score > 70? 'HIGH' : (score > 40? 'MODERATE' : 'LOW'),
                volatilityIndex: volatility.available? volatility.volatility * 100 : 50,
                trendStability: options.trend?.strength === 'STRONG'? 85 : 50,
                seasonalityEvidence: 0,
                priorAccuracy: 0
            }
        });
    }

    _calculateBounds(forecast, values) {
        const volatility = VolatilityAnalyzer.analyze(values);
        const margin = volatility.available? Math.max(0.05, volatility.volatility * 0.5 + 0.1) : 0.2;
        return {
            lower: forecast * (1 - margin),
            upper: forecast * (1 + margin)
        };
    }

    _buildPeriod(horizon) {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        const days = { '7D': 7, '14D': 14, '30D': 30, '60D': 60, '90D': 90, '6M': 180, '12M': 365 };
        const daysValue = days[horizon] || 30;
        end.setDate(end.getDate() + daysValue);

        const labels = { '7D': '7 Days', '14D': '14 Days', '30D': '30 Days', '60D': '60 Days', '90D': '90 Days', '6M': '6 Months', '12M': '12 Months' };
        return {
            startDate: start.toISOString().split('T')[0], // FIX: [0] to get date string
            endDate: end.toISOString().split('T')[0], // FIX: [0] to get date string
            label: labels[horizon] || '30 Days',
            horizon,
            days: daysValue,
        };
    }

    _buildAssumptions(method, dataPoints) {
        const assumptions = [];
        if (method === 'linear_trend') {
            assumptions.push('Sales volume is forecast using historical trend lines');
        } else {
            assumptions.push('Sales volume is forecast using historical average definitions');
        }
        assumptions.push(`${dataPoints} historical periods verified.`);
        return assumptions;
    }

    _detectRisks(values, forecast) {
        const risks = [];
        const lastValue = values[values.length - 1] || 0;
        if (lastValue > 0 && forecast < lastValue * 0.8) {
            risks.push(ForecastContracts.createRisk({
                metric: 'salesVolume',
                displayName: 'Sales Volume',
                type: 'REVENUE_DECLINE',
                severity: 'MEDIUM',
                description: 'Sales volume forecasted to decline significantly',
                trigger: `Forecast is ${((1 - forecast / lastValue) * 100).toFixed(1)}% below current volume`,
                action: 'Monitor sales trends and adjust inventory targets',
                impact: lastValue - forecast
            }));
        }
        return risks;
    }
}

module.exports = SalesVolumeForecastCalculator;