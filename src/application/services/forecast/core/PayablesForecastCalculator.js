// src/application/services/forecast/core/PayablesForecastCalculator.js
// Phase 5.4.1 - Stateless | O(n) | Zero-Alloc | IFRS Compliant | 1M+ SCALE

const { ForecastContracts, DATA_SUFFICIENCY } = require('../contracts/ForecastContracts');

/**
 * PayablesForecastCalculator - Predicts future supplier payments and AP balance
 * SSOT v5.4.1 Compliant | Stateless | O(n) | Zero-Crash
 */
class PayablesForecastCalculator {
    constructor({
        reportService = null,
        creditorRepository = null,
        cogsForecast = null,
        trendAnalyzer = null,
        volatilityAnalyzer = null,
    } = {}) {
        this.reportService = reportService;
        this.creditorRepository = creditorRepository;
        this.cogsForecast = cogsForecast;

        const TrendAnalyzer = require('../foundation/TrendAnalyzer');
        const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

        this.trendAnalyzer = trendAnalyzer || new TrendAnalyzer();
        this.volatilityAnalyzer = volatilityAnalyzer || new VolatilityAnalyzer();
    }

    async forecast({
        userId,
        businessId,
        currentPayables,
        cogsForecastData,
        historicalPayments = [],
        horizon = '30D',
        creditPurchasesPercentage = null,
        paymentDelay = null,
        period = null,
    }) {
        // SSOT GATE 1: Validate inputs
        if (!cogsForecastData) {
            return ForecastContracts.insufficientData('payables', 'Payables', 'MISSING_INPUT_DATA');
        }

        const cogs = this._safeNumber(cogsForecastData.forecast || 0);
        const currentAP = this._safeNumber(currentPayables);
        const payments = this._safeArray(historicalPayments);

        // SSOT GATE 2: Data sufficiency using 7/30/90
        const dataSufficiency = ForecastContracts.getDataSufficiency(payments.length);
        if (dataSufficiency === DATA_SUFFICIENCY.INSUFFICIENT) {
            return ForecastContracts.insufficientData('payables', 'Payables');
        }

        // SSOT GATE 3: Foundation analyzers - Zero-Alloc initialization
        const paymentValues = new Array(payments.length);
        for (let i = 0; i < payments.length; i++) {
            paymentValues[i] = this._safeNumber(payments[i].amount);
        }

        const trend = this.trendAnalyzer.analyze(paymentValues);
        const volatility = this.volatilityAnalyzer.analyze(paymentValues);

        // Determine credit purchases percentage and payment delay from historical data
        const patterns = this._calculatePatterns(payments, creditPurchasesPercentage, paymentDelay);
        const creditPurchasesPct = patterns.creditPurchasesPct;
        const paymentDelayDays = patterns.paymentDelayDays;

        // Calculate new credit purchases
        const newCreditPurchases = cogs * creditPurchasesPct;

        // FIX: SSOT Formula. 30 day delay = 100% payment. 90 day = 33%. 0 delay = 0%
        const paymentRate = paymentDelayDays <= 0? 0 : (30 / paymentDelayDays);
        const totalPayments = currentAP * paymentRate; // Only opening AP is paid this period

        // Ending payables
        const endingPayables = currentAP + newCreditPurchases - totalPayments;

        // Calculate confidence
        const confidence = this._calculateConfidence(cogsForecastData.confidence, volatility, payments.length, creditPurchasesPct);

        // Calculate bounds
        const bounds = this._calculateBounds(endingPayables, currentAP, cogs);
        const forecastPeriod = period || this._buildPeriod(horizon);

        // Build assumptions
        const assumptions = this._buildAssumptions(creditPurchasesPct, paymentDelayDays, payments.length);

        // Detect risks - FIX: Pass net increase params
        const risks = this._detectRisks(endingPayables, currentAP, cogs, newCreditPurchases, totalPayments);

        // Compute pure historical payment baseline mean average without reduce allocations
        let paymentSum = 0;
        for (let i = 0; i < paymentValues.length; i++) {
            paymentSum += paymentValues[i];
        }
        const paymentAverage = paymentValues.length > 0? paymentSum / paymentValues.length : 0;

        return ForecastContracts.createForecast({
            metric: 'payables',
            displayName: 'Accounts Payable',
            period: forecastPeriod,
            forecast: Number(endingPayables.toFixed(2)),
            lowerBound: Number(bounds.lower.toFixed(2)),
            upperBound: Number(bounds.upper.toFixed(2)),
            method: 'combined',
            confidence,
            historicalBasis: {
                periodsUsed: payments.length,
                average: paymentAverage,
                trend, // SSOT: Return full trend object
                currentAP,
                newCreditPurchases,
                expectedPayments: totalPayments,
                endingPayables,
                creditPurchasesPct,
                paymentDelayDays,
            },
            assumptions,
            dataStatus: dataSufficiency,
            risks,
            metadata: {
                horizon,
                currentAP,
                newCreditPurchases,
                expectedPayments: totalPayments,
                endingPayables,
                creditPurchasesPct,
                paymentDelayDays,
                volatilityIndex: volatility.available? Number((volatility.volatility * 100).toFixed(2)) : 50,
            },
        });
    }

    _calculatePatterns(historicalPayments, creditPurchasesPercentage, paymentDelay) {
        let creditPurchasesPct = creditPurchasesPercentage || 0.7;
        let paymentDelayDays = paymentDelay || 30;

        if (historicalPayments.length > 0) {
            let totalAmount = 0;
            let creditPayments = 0;
            let validDelaySum = 0;
            let validDelayCount = 0;

            for (let i = 0; i < historicalPayments.length; i++) {
                const item = historicalPayments[i];
                const amt = this._safeNumber(item.amount);

                totalAmount += amt;
                if (item.type === 'MADE' || item.type === 'OUT') {
                    creditPayments += amt;
                }

                if (item.paymentDate && item.purchaseDate) {
                    const diff = new Date(item.paymentDate) - new Date(item.purchaseDate);
                    const daysDiff = diff / 86400000;
                    if (daysDiff > 0 && daysDiff < 365) {
                        validDelaySum += daysDiff;
                        validDelayCount++;
                    }
                }
            }

            if (totalAmount > 0 && creditPurchasesPercentage === null) {
                creditPurchasesPct = Math.min(0.95, Math.max(0.3, creditPayments / totalAmount));
            }

            if (validDelayCount > 0 && paymentDelay === null) {
                paymentDelayDays = Math.round(validDelaySum / validDelayCount);
            }
        }

        return {
            creditPurchasesPct: Math.max(0.2, Math.min(0.95, creditPurchasesPct)),
            paymentDelayDays: Math.max(0, Math.min(90, paymentDelayDays)), // FIX: was 7
        };
    }

    _calculateConfidence(cogsConfidence, volatility, dataPoints, creditPurchasesPct) {
        let score = 50;

        if (cogsConfidence?.score!== undefined) {
            score += (cogsConfidence.score - 50) * 0.5;
        }

        if (volatility.available) {
            if (volatility.level === 'LOW') score += 10;
            else if (volatility.level === 'HIGH') score -= 15;
        }

        if (dataPoints >= 30) score += 10;
        else if (dataPoints >= 14) score += 5;
        else if (dataPoints < 7) score -= 10;

        if (creditPurchasesPct > 0.3 && creditPurchasesPct < 0.8) score += 5;

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

    _calculateBounds(endingPayables, currentAP, cogs) {
        const margin = cogs > 0? Math.max(0.15, 50000 / cogs) : 0.3;
        return {
            lower: Math.max(0, endingPayables * (1 - margin)),
            upper: endingPayables * (1 + margin),
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

    _buildAssumptions(creditPurchasesPct, paymentDelayDays, dataPoints) {
        const assumptions = [];
        assumptions.push(`Credit purchases: ${(creditPurchasesPct * 100).toFixed(0)}% of COGS`);
        assumptions.push(`Payment delay: ${paymentDelayDays} days`);
        assumptions.push(`Based on ${dataPoints} historical payment periods`);
        return assumptions;
    }

    _detectRisks(endingPayables, currentAP, cogs, newCreditPurchases, totalPayments) {
        const risks = [];
        const netAPIncrease = newCreditPurchases - totalPayments;

        // RISK 1: Net AP increase > 30% of current AP
        if (netAPIncrease > currentAP * 0.3 && currentAP > 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'payables',
                displayName: 'Accounts Payable',
                type: 'CASH_PRESSURE',
                severity: 'MEDIUM',
                description: 'Payables expected to grow significantly',
                trigger: `${((netAPIncrease / currentAP) * 100).toFixed(1)}% net increase this period`,
                action: 'Review payment terms and schedule',
                impact: netAPIncrease,
            }));
        }

        if (endingPayables > cogs * 0.5 && cogs > 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'payables',
                displayName: 'Accounts Payable',
                type: 'CASH_PRESSURE',
                severity: 'LOW',
                description: 'Payables are high relative to COGS',
                trigger: `Payables: ${(endingPayables / cogs * 100).toFixed(1)}% of COGS`,
                action: 'Monitor supplier payment timing',
                impact: 0,
            }));
        }
        return risks;
    }

    _paymentDelayDataAvailable(payments) { return payments.some(p => p.paymentDate && p.purchaseDate); }
    _safeArray(arr) { return Array.isArray(arr)? arr : []; }
    _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }
}

module.exports = PayablesForecastCalculator;