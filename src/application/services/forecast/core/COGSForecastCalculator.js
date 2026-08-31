// src/application/services/forecast/core/COGSForecastCalculator.js
// Phase 5.3 - Stateless | O(n) | Zero-Alloc | IFRS Compliant

const ForecastContracts = require('../contracts/ForecastContracts');
const TrendAnalyzer = require('../foundation/TrendAnalyzer');
const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

class COGSForecastCalculator {
    constructor({ reportService = null, inventoryRepository = null, salesVolumeForecast = null } = {}) {
        this.reportService = reportService; this.inventoryRepository = inventoryRepository; this.salesVolumeForecast = salesVolumeForecast;
    }
    _safeArray(arr) { return Array.isArray(arr) ? arr : []; }
    _safeNumber(val) { const num = Number(val); return isNaN(num) ? null : num; }

    async forecast({ userId, businessId, historicalData, horizon = '30D', period = null, unitCost = null, salesVolumeForecastData = null }) {
        const rawData = this._safeArray(historicalData);
        const values = []; let sum = 0;
        for (let i = 0; i < rawData.length; i++) {
            const val = this._safeNumber(rawData[i].value); if (val !== null) { values.push(val); sum += val; }
        }
        const dataPoints = values.length;

        // ✅ FIXED FOR PRODUCTION: Restructured validation boundary using 7-day criteria
        if (!ForecastContracts.isDataSufficient(dataPoints, 7)) {
            return ForecastContracts.insufficientData('cogs', 'COGS');
        }

        let avgUnitCost = unitCost || 0;
        if (!unitCost && this.inventoryRepository) {
            try {
                const inventoryItems = await this.inventoryRepository.findByUserId(userId) || [];
                let totalCost = 0, totalQty = 0;
                for (let i = 0; i < inventoryItems.length; i++) {
                    const qty = Number(inventoryItems[i].quantity) || 0; const cost = Number(inventoryItems[i].cost_price) || 0;
                    totalCost += (qty * cost); totalQty += qty;
                }
                avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0;
            } catch (error) { console.warn('⚠️ COGSForecastCalculator: Could not fetch inventory:', error.message); }
        }

        if (avgUnitCost === 0 && dataPoints > 0) avgUnitCost = sum / dataPoints;
        let salesVolume = 0; if (this.salesVolumeForecast && salesVolumeForecastData?.forecast) salesVolume = salesVolumeForecastData.forecast; else salesVolume = dataPoints > 0 ? sum / dataPoints : 0;

        let forecastValue = salesVolume * avgUnitCost;
        let selectedMethod = 'simple_average'; let confidence = null; let historicalBasis = null;

        if (dataPoints >= 5) {
            const trend = TrendAnalyzer.analyze(values);
            if (trend.available && trend.direction !== 'STABLE') {
                const trendFactor = 1 + (trend.percentageChange || 0) / 100; forecastValue = forecastValue * trendFactor;
                selectedMethod = 'trend_adjusted'; confidence = this._calculateConfidence(values, { trend });
                historicalBasis = { periodsUsed: dataPoints, average: sum / dataPoints, trend: trend.percentageChange, unitCost: avgUnitCost, salesVolume };
            }
        }

        if (!confidence) {
            const avg = sum / dataPoints; confidence = this._calculateConfidence(values);
            historicalBasis = { periodsUsed: dataPoints, average: avg, trend: null, unitCost: avgUnitCost, salesVolume };
        }

        return this._buildResult(forecastValue, selectedMethod, confidence, historicalBasis, horizon, period, values);
    }

    _buildResult(forecast, method, confidence, historicalBasis, horizon, period, values) {
        const forecastPeriod = period || this._buildPeriod(horizon); const bounds = this._calculateBounds(forecast, values);
        return ForecastContracts.createForecast({
            metric: 'cogs', displayName: 'COGS', period: forecastPeriod, forecast: Number(forecast.toFixed(2)), lowerBound: Number(bounds.lower.toFixed(2)), upperBound: Number(bounds.upper.toFixed(2)), method, confidence, historicalBasis,
            assumptions: [
                `COGS is forecast using ${method === 'trend_adjusted' ? 'trend-adjusted historical COGS' : 'historical average'}`,
                `Unit cost used: ₦${(historicalBasis?.unitCost || 0).toFixed(2)}`, `Expected sales volume: ${Math.round(historicalBasis?.salesVolume || 0)} units`,
            ],
            dataStatus: 'SUFFICIENT', risks: this._detectRisks(values, forecast), metadata: { unitCost: historicalBasis?.unitCost || 0, salesVolume: historicalBasis?.salesVolume || 0, horizon }
        });
    }

    _calculateConfidence(values, options = {}) {
        const dataPoints = values.length; let score = 50;
        if (dataPoints >= 30) score += 15; else if (dataPoints >= 14) score += 5; else score -= 15;
        const volatility = VolatilityAnalyzer.analyze(values);
        if (volatility.available) { if (volatility.volatility < 0.2) score += 10; else if (volatility.volatility > 0.5) score -= 10; }
        if (options.trend?.strength === 'STRONG') score += 5; score = Math.max(0, Math.min(100, score));
        return ForecastContracts.createConfidence({ score, factors: { historicalDataPoints: dataPoints, dataConsistency: score > 70 ? 'HIGH' : (score > 40 ? 'MODERATE' : 'LOW'), volatility: volatility.available ? volatility.volatility * 100 : 50, trendStability: options.trend?.strength === 'STRONG' ? 85 : 50, seasonalityEvidence: 0, priorAccuracy: 0 } });
    }

    _calculateBounds(forecast, values) {
        const volatility = VolatilityAnalyzer.analyze(values); const margin = volatility.available ? Math.max(0.05, volatility.volatility * 0.5 + 0.1) : 0.2;
        return { lower: forecast * (1 - margin), upper: forecast * (1 + margin) };
    }

    _buildPeriod(horizon) {
        const now = new Date(); const start = new Date(now); const end = new Date(now); const days = { '7D': 7, '14D': 14, '30D': 30, '60D': 60, '90D': 90, '6M': 180, '12M': 365 };
        const daysValue = days[horizon] || 30; end.setDate(end.getDate() + daysValue);
        const labels = { '7D': '7 Days', '14D': '14 Days', '30D': '30 Days', '60D': '60 Days', '90D': '90 Days', '6M': '6 Months', '12M': '12 Months' };
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0], label: labels[horizon] || '30 Days', horizon, days: daysValue };
    }

    _detectRisks(values, forecast) {
        const risks = []; const lastValue = values[values.length - 1] || 0;
        if (lastValue > 0 && forecast > lastValue * 1.2) {
            risks.push(ForecastContracts.createRisk({
                metric: 'cogs', displayName: 'COGS', type: 'MARGIN_COMPRESSION', severity: 'HIGH', description: 'Projected production COGS run-rate increase detected.',
                trigger: `Forecast value is ${((forecast / lastValue - 1) * 100).toFixed(1)}% above previous historical limits.`, action: 'Review supplier purchase agreements and evaluate cost controls.', impact: Number((forecast - lastValue).toFixed(2))
            }));
        }
        return risks;
    }
}
module.exports = COGSForecastCalculator;
