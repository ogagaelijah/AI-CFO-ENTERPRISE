// src/application/services/forecast/core/COGSForecastCalculator.js
// Phase 5.4.1 - Stateless | O(n) | Zero-Alloc | IFRS Compliant | 1M+ SCALE

const { ForecastContracts, DATA_SUFFICIENCY } = require('../contracts/ForecastContracts');
const TrendAnalyzer = require('../foundation/TrendAnalyzer');
const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

/**
 * COGSForecastCalculator
 *
 * Priority rules (production):
 * 1. When both a real sales-volume forecast AND a positive unit cost are supplied
 *    → pure volume × unitCost (exact, deterministic).
 * 2. Otherwise fall back to the historical COGS series
 *    (trend-adjusted or moving average).
 * Never multiplies average-COGS by itself.
 */
class COGSForecastCalculator {
    constructor({
        reportService = null,
        inventoryRepository = null,
        salesVolumeForecast = null,
    } = {}) {
        this.reportService = reportService;
        this.inventoryRepository = inventoryRepository;
        this.salesVolumeForecast = salesVolumeForecast;
    }

    _safeArray(arr) {
        return Array.isArray(arr) ? arr : [];
    }

    _safeNumber(val) {
        const num = Number(val);
        return Number.isFinite(num) ? num : 0;
    }

    async forecast({
        userId,
        businessId,
        historicalData,
        horizon = '30D',
        period = null,
        unitCost = null,
        salesVolumeForecastData = null,
    }) {
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
            return ForecastContracts.insufficientData('cogs', 'COGS');
        }

        // ── Optional unit-cost enrichment from inventory (never required) ──
        let avgUnitCost = this._safeNumber(unitCost);
        if (avgUnitCost === 0 && this.inventoryRepository && userId) {
            try {
                const inventoryItems =
                    (await this.inventoryRepository.findByUserId?.(userId)) || [];
                let totalCost = 0;
                let totalQty = 0;
                for (const item of inventoryItems) {
                    const qty = this._safeNumber(item.quantity);
                    const cost = this._safeNumber(item.cost_price);
                    totalCost += qty * cost;
                    totalQty += qty;
                }
                avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0;
            } catch (err) {
                // non-fatal – continue with series-based path
            }
        }

        // ── Forecast decision ─────────────────────────────────────────────
        let forecastValue = 0;
        let selectedMethod = 'simple_average';
        let confidence = null;
        let historicalBasis = null;

        const avg = dataPoints > 0 ? sum / dataPoints : 0;

        const hasVolume =
            salesVolumeForecastData &&
            typeof salesVolumeForecastData.forecast === 'number' &&
            salesVolumeForecastData.forecast > 0;
        const hasUnitCost = avgUnitCost > 0;

        // Path 1 – pure volume × unitCost (exact when both inputs are trusted)
        if (hasVolume && hasUnitCost) {
            forecastValue = salesVolumeForecastData.forecast * avgUnitCost;
            selectedMethod = 'volume_scaled';
            confidence = this._calculateConfidence(values);
            historicalBasis = {
                periodsUsed: dataPoints,
                average: avg,
                trend: null,
                unitCost: avgUnitCost,
                salesVolume: salesVolumeForecastData.forecast,
            };
        } else {
            // Path 2 – series-based (trend or moving average)
            if (dataPoints >= 5) {
                const trend = TrendAnalyzer.analyze(values);
                if (trend.available && trend.direction !== 'STABLE') {
                    forecastValue =
                        this._safeNumber(trend.forecastedNext) || avg;
                    selectedMethod = 'trend_adjusted';
                    confidence = this._calculateConfidence(values, { trend });
                    historicalBasis = {
                        periodsUsed: dataPoints,
                        average: avg,
                        trend: trend.percentageChange,
                        unitCost: avgUnitCost,
                        salesVolume: null,
                    };
                }
            }

            if (!confidence) {
                const windowSize = Math.min(
                    7,
                    Math.max(3, Math.floor(dataPoints * 0.3))
                );
                const recent = values.slice(-windowSize);
                const recentSum = recent.reduce((a, b) => a + b, 0);
                forecastValue =
                    recent.length > 0 ? recentSum / recent.length : avg;
                selectedMethod = 'moving_average';
                confidence = this._calculateConfidence(values);
                historicalBasis = {
                    periodsUsed: recent.length || dataPoints,
                    average: avg,
                    trend: null,
                    unitCost: avgUnitCost,
                    salesVolume: null,
                };
            }
        }

        // Final safety guard
        forecastValue = Math.max(0, this._safeNumber(forecastValue));

        return this._buildResult(
            forecastValue,
            selectedMethod,
            confidence,
            historicalBasis,
            horizon,
            period,
            values,
            dataStatus
        );
    }

    _buildResult(
        forecast,
        method,
        confidence,
        historicalBasis,
        horizon,
        period,
        values,
        dataStatus
    ) {
        const forecastPeriod = period || this._buildPeriod(horizon);
        const bounds = this._calculateBounds(forecast, values);

        return ForecastContracts.createForecast({
            metric: 'cogs',
            displayName: 'COGS',
            period: forecastPeriod,
            forecast: Number(forecast.toFixed(2)),
            lowerBound: Number(bounds.lower.toFixed(2)),
            upperBound: Number(bounds.upper.toFixed(2)),
            method,
            confidence,
            historicalBasis,
            assumptions: [
                method === 'volume_scaled'
                    ? 'COGS calculated as sales-volume × unit-cost.'
                    : method === 'trend_adjusted'
                      ? 'COGS extrapolated via linear trend of historical series.'
                      : 'COGS derived from recent historical average of the COGS series.',
                `Unit cost reference: ₦${(historicalBasis?.unitCost || 0).toFixed(2)}`,
                historicalBasis?.salesVolume
                    ? `Sales volume used: ${Math.round(historicalBasis.salesVolume)}`
                    : 'No external sales-volume forecast supplied.',
            ],
            dataStatus,
            risks: this._detectRisks(values, forecast),
            metadata: {
                unitCost: historicalBasis?.unitCost || 0,
                salesVolume: historicalBasis?.salesVolume || 0,
                horizon,
            },
        });
    }

    _calculateConfidence(values, options = {}) {
        const dataPoints = values.length;
        const ssotLevel =
            ForecastContracts.getConfidenceFromDataPoints(dataPoints);

        let score = 50;
        if (ssotLevel === 'STRONG') score = 85;
        else if (ssotLevel === 'GOOD') score = 70;
        else if (ssotLevel === 'MODERATE') score = 55;
        else score = 25;

        if (dataPoints >= 30) score += 10;
        else if (dataPoints >= 14) score += 5;
        else if (dataPoints < 7) score -= 15;

        const volatility = VolatilityAnalyzer.analyze(values);
        if (volatility.available) {
            if (volatility.volatility < 0.2) score += 10;
            else if (volatility.volatility > 0.5) score -= 10;
        }
        if (options.trend?.strength === 'STRONG') score += 5;

        score = Math.max(0, Math.min(100, score));

        return ForecastContracts.createConfidence({
            score,
            factors: {
                historicalDataPoints: dataPoints,
                dataConsistency:
                    score > 70 ? 'HIGH' : score > 40 ? 'MODERATE' : 'LOW',
                volatilityIndex: volatility.available
                    ? volatility.volatility * 100
                    : 50,
                trendStability: options.trend?.strength === 'STRONG' ? 85 : 50,
                seasonalityEvidence: 0,
                priorAccuracy: 0,
            },
        });
    }

    _calculateBounds(forecast, values) {
        const volatility = VolatilityAnalyzer.analyze(values);
        const baseMargin = volatility.available ? volatility.volatility : 0.2;
        const margin = Math.max(0.05, baseMargin * 0.5 + 0.1);
        return {
            lower: Math.max(0, forecast * (1 - margin)),
            upper: forecast * (1 + margin),
        };
    }

    _buildPeriod(horizon) {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        const days = {
            '7D': 7,
            '14D': 14,
            '30D': 30,
            '60D': 60,
            '90D': 90,
            '6M': 180,
            '12M': 365,
        };
        const daysValue = days[horizon] || 30;
        end.setDate(end.getDate() + daysValue);
        const labels = {
            '7D': '7 Days',
            '14D': '14 Days',
            '30D': '30 Days',
            '60D': '60 Days',
            '90D': '90 Days',
            '6M': '6 Months',
            '12M': '12 Months',
        };
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            label: labels[horizon] || '30 Days',
            horizon,
            days: daysValue,
        };
    }

    _detectRisks(values, forecast) {
        const risks = [];
        const lastValue = values[values.length - 1] || 0;
        if (lastValue > 0 && forecast > lastValue * 1.2) {
            risks.push(
                ForecastContracts.createRisk({
                    metric: 'cogs',
                    displayName: 'COGS',
                    type: 'MARGIN_COMPRESSION',
                    severity: 'HIGH',
                    description:
                        'Projected production COGS run-rate increase detected.',
                    trigger: `Forecast value is ${(
                        (forecast / lastValue - 1) *
                        100
                    ).toFixed(1)}% above previous historical limits.`,
                    action:
                        'Review supplier purchase agreements and evaluate cost controls.',
                    impact: Number((forecast - lastValue).toFixed(2)),
                })
            );
        }
        return risks;
    }
}

module.exports = COGSForecastCalculator;