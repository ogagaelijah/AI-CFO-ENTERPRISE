// src/application/services/forecast/core/CashFlowForecastCalculator.js

const { ForecastContracts, DATA_SUFFICIENCY } = require('../contracts');

/**
 * CashFlowForecastCalculator - Predicts future cash position
 * SSOT v5.4.1 Compliant | Stateless | O(n) | Zero-Crash
 */
class CashFlowForecastCalculator {
    constructor({
        reportService = null,
        paymentRepository = null,
        revenueForecast = null,
        expenseForecast = null,
        trendAnalyzer = null,
        volatilityAnalyzer = null,
    } = {}) {
        this.reportService = reportService;
        this.paymentRepository = paymentRepository;
        this.revenueForecast = revenueForecast;
        this.expenseForecast = expenseForecast;

        const TrendAnalyzer = require('../foundation/TrendAnalyzer');
        const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

        this.trendAnalyzer = trendAnalyzer || new TrendAnalyzer();
        this.volatilityAnalyzer = volatilityAnalyzer || new VolatilityAnalyzer();
    }

    async forecast({
        userId,
        businessId,
        openingCash,
        revenueForecastData,
        expenseForecastData,
        historicalPayments = [],
        horizon = '30D',
        collectionRate = null,
        paymentRate = null,
        period = null,
    }) {
        // SSOT GATE 1: Validate inputs
        if (!revenueForecastData ||!expenseForecastData) {
            return ForecastContracts.insufficientData('cashFlow', 'Cash Flow', 'MISSING_INPUT_DATA');
        }

        const revenue = this._safeNumber(revenueForecastData.forecast || 0);
        const expenses = this._safeNumber(expenseForecastData.forecast || 0);
        const opening = this._safeNumber(openingCash);
        const payments = this._safeArray(historicalPayments);

        // SSOT GATE 2: Data sufficiency using 7/30/90
        const dataSufficiency = ForecastContracts.getDataSufficiency(payments.length);

        // SSOT GATE 3: Foundation analyzers
        const paymentValues = payments.map(p => this._safeNumber(p.amount));
        const trend = this.trendAnalyzer.analyze(paymentValues);
        const volatility = this.volatilityAnalyzer.analyze(paymentValues);

        // Determine collection and payment rates
        const rates = this._calculateRates(payments, collectionRate, paymentRate);
        const collectionRateFinal = rates.collectionRate;
        const paymentRateFinal = rates.paymentRate;

        // Calculate inflows and outflows
        const cashIn = revenue * collectionRateFinal;
        const cashOut = expenses * paymentRateFinal;
        const netCashFlow = cashIn - cashOut;
        const closingCash = opening + netCashFlow;

        // SSOT GATE 4: Weighted confidence
        const confidence = this._calculateConfidence(
            revenueForecastData.confidence,
            expenseForecastData.confidence,
            volatility,
            payments.length
        );

        // Calculate bounds
        const bounds = this._calculateBounds(closingCash, opening, revenue);
        const forecastPeriod = period || this._buildPeriod(horizon);

        // Build assumptions
        const assumptions = this._buildAssumptions(
            collectionRateFinal,
            paymentRateFinal,
            payments.length
        );

        // Detect risks
        const risks = this._detectRisks(closingCash, opening, netCashFlow, cashIn, cashOut);

        return ForecastContracts.createForecast({
            metric: 'cashFlow',
            displayName: 'Cash Flow',
            period: forecastPeriod,
            forecast: closingCash,
            lowerBound: bounds.lower,
            upperBound: bounds.upper,
            method: 'combined',
            confidence,
            historicalBasis: {
                periodsUsed: payments.length,
                average: paymentValues.length? paymentValues.reduce((a,b)=>a+b,0)/paymentValues.length : 0,
                trend, // SSOT: now populated
                openingCash: opening,
                cashIn,
                cashOut,
                netCashFlow,
                collectionRate: collectionRateFinal,
                paymentRate: paymentRateFinal,
            },
            assumptions,
            dataStatus: dataSufficiency, // SSOT: now dynamic
            risks,
            metadata: {
                horizon,
                openingCash: opening,
                cashIn,
                cashOut,
                netCashFlow,
                closingCash,
                collectionRate: collectionRateFinal,
                paymentRate: paymentRateFinal,
                volatilityIndex: volatility.available? volatility.volatility : 0, // SSOT: now present
            },
        });
    }

    _calculateRates(historicalPayments, collectionRate, paymentRate) {
        let collectionRateFinal = collectionRate || 0.7;
        let paymentRateFinal = paymentRate || 0.7;

        if (historicalPayments.length > 0) {
            const payments = this._safeArray(historicalPayments);
            const received = payments.filter(p => p.type === 'RECEIVED' || p.type === 'IN')
               .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);
            const made = payments.filter(p => p.type === 'MADE' || p.type === 'OUT')
               .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);
            const total = received + made;

            if (total > 0) {
                if (collectionRate === null) collectionRateFinal = received / total;
                if (paymentRate === null) paymentRateFinal = made / total;
            }
        }

        return {
            collectionRate: Math.max(0.2, Math.min(1, collectionRateFinal)),
            paymentRate: Math.max(0.2, Math.min(1, paymentRateFinal)),
        };
    }

    _calculateConfidence(revenueConfidence, expenseConfidence, volatility, dataPoints) {
        let score = 50;

        if (revenueConfidence?.score!== undefined) score += (revenueConfidence.score - 50) * 0.4;
        if (expenseConfidence?.score!== undefined) score += (expenseConfidence.score - 50) * 0.4;

        // SSOT: Use volatility + dataPoints
        if (volatility.available) {
            if (volatility.level === 'LOW') score += 10;
            else if (volatility.level === 'HIGH') score -= 15;
        }

        // SSOT: 7/30/90 thresholds
        if (dataPoints >= 30) score += 10;
        else if (dataPoints >= 14) score += 5;
        else if (dataPoints < 7) score -= 10;

        score = Math.max(0, Math.min(100, score));

        return ForecastContracts.createConfidence({
            score,
            factors: {
                historicalDataPoints: dataPoints,
                dataConsistency: score > 70? 'HIGH' : score > 40? 'MODERATE' : 'LOW',
                volatility: volatility.available? Math.round((1 - volatility.volatility) * 100) : 50,
                trendStability: 50,
                seasonalityEvidence: 0,
                priorAccuracy: 0,
            },
        });
    }

    _calculateBounds(closingCash, opening, revenue) {
        const margin = revenue > 0? Math.max(0.15, 100000 / revenue) : 0.3;
        return {
            lower: closingCash * (1 - margin),
            upper: closingCash * (1 + margin),
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
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            label: labels[horizon] || '30 Days',
            horizon,
            days: daysValue,
        };
    }

    _buildAssumptions(collectionRate, paymentRate, dataPoints) {
        const assumptions = [];
        assumptions.push(`Collection rate: ${(collectionRate * 100).toFixed(0)}% of revenue`);
        assumptions.push(`Payment rate: ${(paymentRate * 100).toFixed(0)}% of expenses`);
        assumptions.push(`Based on ${dataPoints} historical payment periods`);
        return assumptions;
    }

    _detectRisks(closingCash, opening, netCashFlow, cashIn, cashOut) {
        const risks = [];

        if (closingCash < 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'cashFlow', displayName: 'Cash Flow', type: 'CASH_PRESSURE',
                severity: 'CRITICAL', description: 'Negative cash position forecasted',
                trigger: `Closing cash: ₦${closingCash.toFixed(2)}`, action: 'Immediate cash flow review required',
                impact: closingCash,
            }));
        } else if (closingCash < opening * 0.5 && opening > 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'cashFlow', displayName: 'Cash Flow', type: 'CASH_PRESSURE',
                severity: 'HIGH', description: 'Cash position expected to decline significantly',
                trigger: `Cash decline: ${((1 - closingCash / opening) * 100).toFixed(1)}%`,
                action: 'Review cash outflows and collection efforts', impact: opening - closingCash,
            }));
        } else if (netCashFlow < 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'cashFlow', displayName: 'Cash Flow', type: 'CASH_PRESSURE',
                severity: 'MEDIUM', description: 'Negative net cash flow forecasted',
                trigger: `Net cash flow: ₦${netCashFlow.toFixed(2)}`,
                action: 'Monitor cash position and adjust spending', impact: netCashFlow,
            }));
        }

        if (cashOut > cashIn * 1.5 && cashIn > 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'cashFlow', displayName: 'Cash Flow', type: 'CASH_PRESSURE',
                severity: 'MEDIUM', description: 'Cash outflows significantly exceed inflows',
                trigger: `Outflow/Inflow ratio: ${(cashOut / cashIn).toFixed(1)}x`,
                action: 'Review payment timing and collection strategy', impact: cashOut - cashIn,
            }));
        }

        return risks;
    }

    _safeArray(arr) { return Array.isArray(arr)? arr : []; }
    _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }
}

module.exports = CashFlowForecastCalculator;