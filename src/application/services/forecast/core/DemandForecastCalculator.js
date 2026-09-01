// src/application/services/forecast/core/DemandForecastCalculator.js
// Phase 5.4.2 - Demand Engine | SSOT: 7/30/90

const { ForecastContracts, DATA_SUFFICIENCY } = require('../contracts');
const TrendAnalyzer = require('../foundation/TrendAnalyzer');
const SeasonalityDetector = require('../foundation/SeasonalityDetector');
const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

class DemandForecastCalculator {
    constructor({
        reportService = null,
        saleRepository = null,
        salesVolumeForecast = null,
        trendAnalyzer = null,
        seasonalityDetector = null,
        volatilityAnalyzer = null,
    } = {}) {
        this.reportService = reportService;
        this.saleRepository = saleRepository;
        this.salesVolumeForecast = salesVolumeForecast;
        this.trendAnalyzer = trendAnalyzer || new TrendAnalyzer();
        this.seasonalityDetector = seasonalityDetector || new SeasonalityDetector();
        this.volatilityAnalyzer = volatilityAnalyzer || new VolatilityAnalyzer();
    }

    async forecast(params = {}) {
        const { userId, businessId, historicalDemand, horizon = '30D', productId = null, period = null } = params;
        const data = this._safeArray(historicalDemand);
        const values = data.map(d => this._safeNumber(d?.value?? d?.quantity?? d?.sales?? 0));
        const dataPoints = values.length;
        const sufficiency = ForecastContracts.getDataSufficiency(dataPoints);
        if (sufficiency === DATA_SUFFICIENCY.INSUFFICIENT) {
            return ForecastContracts.insufficientData('demand', 'Demand');
        }
        const baselineDemand = values.reduce((a, b) => a + b, 0) / dataPoints;
        const volatility = this.volatilityAnalyzer.analyze(values);
        let trendFactor = 1; let method = 'simple_average'; let confidence = null; let historicalBasis = null; let trend = { available: false }; let seasonality = { available: false };
        if (dataPoints >= 5) {
            trend = this.trendAnalyzer.analyze(values);
            if (trend?.available && trend.rSquared > 0.4) {
                trendFactor = 1 + ((trend.percentageChange || 0) / 100);
                method = 'linear_trend';
                confidence = this._calculateConfidence(values, data, volatility, { trend });
                historicalBasis = { periodsUsed: dataPoints, average: baselineDemand, trend: trend.percentageChange, slope: trend.slope };
            }
        }
        let seasonalFactor = 1;
        if (dataPoints >= 12) {
            seasonality = this.seasonalityDetector.detect(data, 'monthly');
            if (seasonality?.available && seasonality.hasSeasonality && seasonality.strength > 20) {
                seasonalFactor = this._getSeasonalFactor(seasonality, values.length);
                method = trendFactor!== 1? 'trend_seasonal' : 'seasonal';
            }
        }
        const forecastedDemand = Math.max(0, baselineDemand * trendFactor * seasonalFactor);
        if (!confidence) {
            confidence = this._calculateConfidence(values, data, volatility, { trend, seasonality });
            historicalBasis = { periodsUsed: dataPoints, average: baselineDemand, trend: trend?.available? trend.percentageChange : null };
        }
        const bounds = this._calculateBounds(forecastedDemand, volatility);
        const forecastPeriod = period || this._buildPeriod(horizon);
        const assumptions = this._buildAssumptions(method, dataPoints, trendFactor, seasonalFactor);
        const risks = this._detectRisks(forecastedDemand, values, dataPoints, sufficiency);
        return ForecastContracts.createForecast({
            metric: 'demand', displayName: 'Demand', period: forecastPeriod, forecast: forecastedDemand,
            lowerBound: bounds.lower, upperBound: bounds.upper, method, confidence, historicalBasis,
            assumptions, dataStatus: sufficiency, risks,
            metadata: { horizon, dataPoints, trendFactor, seasonalFactor, productId, baselineDemand },
        });
    }

    _getSeasonalFactor(seasonality, currentPeriod) {
        const indices = seasonality?.seasonalIndices; if (!indices) return 1; const keys = Object.keys(indices);
        if (keys.length === 0) return 1; const nextIndex = Math.abs(currentPeriod) % keys.length; const key = keys[nextIndex]?? keys[0];
        return this._safeNumber(indices[key]?? 1);
    }

    _calculateConfidence(values, data, volatility, options = {}) {
        const dataPoints = values.length; let score = 50; let seasonalityEvidence = 0;
        if (dataPoints >= 30) score += 15; else if (dataPoints >= 14) score += 5; else if (dataPoints < 7) score -= 20;
        if (volatility?.available) { if (volatility.volatility < 0.2) score += 10; else if (volatility.volatility > 0.5) score -= 10; }
        if (options.trend?.rSquared > 0.6) score += 10;
        if (options.seasonality?.available && options.seasonality.hasSeasonality) { seasonalityEvidence = options.seasonality.strength || 0; score += 5; }
        score = Math.max(0, Math.min(100, score));
        return ForecastContracts.createConfidence({
            score, factors: { historicalDataPoints: dataPoints, dataConsistency: score > 70? 'HIGH' : score > 40? 'MODERATE' : 'LOW',
            volatility: volatility?.available? volatility.volatility * 100 : 50, trendStability: options.trend?.stability || 50, seasonalityEvidence, priorAccuracy: 0 },
        });
    }

    _calculateBounds(forecast, volatility) {
        const margin = volatility?.available? Math.max(0.15, volatility.volatility * 0.5 + 0.15) : 0.25;
        return { lower: Math.max(0, forecast * (1 - margin)), upper: forecast * (1 + margin) };
    }

    _buildPeriod(horizon) {
        const now = new Date(); const start = new Date(now); const end = new Date(now);
        const days = { '7D': 7, '14D': 14, '30D': 30, '60D': 60, '90D': 90, '6M': 180, '12M': 365 };
        const daysValue = days[horizon] || 30; end.setDate(end.getDate() + daysValue);
        const labels = { '7D': '7 Days', '14D': '14 Days', '30D': '30 Days', '60D': '60 Days', '90D': '90 Days', '6M': '6 Months', '12M': '12 Months' };
        return {
            startDate: start.toISOString().split('T')[0], // CONTRACT FIX
            endDate: end.toISOString().split('T')[0], // CONTRACT FIX
            label: labels[horizon] || '30 Days', horizon, days: daysValue,
        };
    }

    _buildAssumptions(method, dataPoints, trendFactor, seasonalFactor) {
        const assumptions = [];
        const methodLabels = { simple_average: 'Demand is forecast using historical average', linear_trend: 'Demand is forecast using historical trend', seasonal: 'Demand is forecast using detected seasonal patterns', trend_seasonal: 'Demand is forecast using trend and seasonal patterns' };
        assumptions.push(methodLabels[method] || 'Demand is forecast using historical data');
        if (trendFactor!== 1) { assumptions.push(`Trend factor: ${trendFactor.toFixed(2)}x`); }
        if (seasonalFactor!== 1) { assumptions.push(`Seasonal factor: ${seasonalFactor.toFixed(2)}x`); }
        assumptions.push(`Based on ${dataPoints} historical periods`);
        return assumptions;
    }

    _detectRisks(forecast, values, dataPoints, sufficiency) {
        const risks = []; const lastValue = values[values.length - 1] || 0;
        if (sufficiency === DATA_SUFFICIENCY.SUFFICIENT && lastValue > 0 && forecast < lastValue * 0.5) {
            risks.push(ForecastContracts.createRisk({ metric: 'demand', displayName: 'Demand', type: 'DEMAND_DECLINE', severity: 'HIGH',
            description: 'Significant demand decline forecasted', trigger: `Forecast is ${((1 - forecast / lastValue) * 100).toFixed(1)}% below current demand`, action: 'Review market conditions and adjust strategy', impact: lastValue - forecast }));
        }
        if (dataPoints < 7) {
            risks.push(ForecastContracts.createRisk({ metric: 'demand', displayName: 'Demand', type: 'DATA_INSUFFICIENCY', severity: 'LOW',
            description: 'Limited historical data for reliable demand forecast', trigger: `${dataPoints} data points available (need 7+)`, action: 'Continue collecting data for more accurate forecasts', impact: null }));
        }
        return risks;
    }

    _safeArray(arr) { return Array.isArray(arr)? arr : []; }
    _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }
}

module.exports = DemandForecastCalculator;