// src/application/services/forecast/core/ReceivablesForecastCalculator.js
// Phase 5.4.1 - Stateless | O(n) | Zero-Alloc | IFRS Compliant | 1M+ SCALE

const { ForecastContracts, DATA_SUFFICIENCY } = require('../contracts/ForecastContracts');

/**
 * ReceivablesForecastCalculator - Predicts future customer collections and AR balance
 * SSOT v5.4.1 Compliant | Stateless | O(n) | Zero-Crash
 */
class ReceivablesForecastCalculator {
    constructor({
        reportService = null,
        debtorRepository = null,
        revenueForecast = null,
        trendAnalyzer = null,
        volatilityAnalyzer = null,
    } = {}) {
        this.reportService = reportService;
        this.debtorRepository = debtorRepository;
        this.revenueForecast = revenueForecast;

        const TrendAnalyzer = require('../foundation/TrendAnalyzer');
        const VolatilityAnalyzer = require('../foundation/VolatilityAnalyzer');

        this.trendAnalyzer = trendAnalyzer || new TrendAnalyzer();
        this.volatilityAnalyzer = volatilityAnalyzer || new VolatilityAnalyzer();
    }

    async forecast({
        userId,
        businessId,
        currentReceivables,
        revenueForecastData,
        historicalCollections = [],
        horizon = '30D',
        creditSalesPercentage = null,
        collectionDelay = null,
        period = null,
    }) {
        // SSOT GATE 1: Validate inputs
        if (!revenueForecastData) {
            return ForecastContracts.insufficientData('receivables', 'Receivables', 'MISSING_INPUT_DATA');
        }

        const revenue = this._safeNumber(revenueForecastData.forecast || 0);
        const currentAR = this._safeNumber(currentReceivables);
        const collections = this._safeArray(historicalCollections);

        // SSOT GATE 2: Data sufficiency using 7/30/90
        const dataSufficiency = ForecastContracts.getDataSufficiency(collections.length);
        if (dataSufficiency === DATA_SUFFICIENCY.INSUFFICIENT) {
            return ForecastContracts.insufficientData('receivables', 'Receivables');
        }

        // SSOT GATE 3: Foundation analyzers - Zero-Alloc loop
        const collectionValues = new Array(collections.length);
        for (let i = 0; i < collections.length; i++) {
            collectionValues[i] = this._safeNumber(collections[i].amount);
        }

        const trend = this.trendAnalyzer.analyze(collectionValues);
        const volatility = this.volatilityAnalyzer.analyze(collectionValues);

        // Determine credit sales percentage and collection delay from historical data
        const patterns = this._calculatePatterns(collections, creditSalesPercentage, collectionDelay);
        const creditSalesPct = patterns.creditSalesPct;
        const collectionDelayDays = patterns.collectionDelayDays;

        // Calculate new credit sales
        const newCreditSales = revenue * creditSalesPct;

        // FIX: SSOT Formula. 30 day delay = 100% collection. 90 day = 33%. 0 delay = 0%
        const collectionRate = collectionDelayDays <= 0? 0 : (30 / collectionDelayDays);
        const totalCollections = currentAR * collectionRate; // Only opening AR is collected this period

        // Ending receivables
        const endingReceivables = currentAR + newCreditSales - totalCollections;

        // Calculate confidence
        const confidence = this._calculateConfidence(revenueForecastData.confidence, volatility, collections.length, creditSalesPct);

        // Calculate bounds
        const bounds = this._calculateBounds(endingReceivables, currentAR, revenue);
        const forecastPeriod = period || this._buildPeriod(horizon);

        // Build assumptions
        const assumptions = this._buildAssumptions(creditSalesPct, collectionDelayDays, collections.length);

        // Detect risks - UPDATED PARAMS
        const risks = this._detectRisks(endingReceivables, currentAR, revenue, newCreditSales, totalCollections);

        // Compute pure historical collection baseline mean total accurately without reduce allocations
        let collectionSum = 0;
        for (let i = 0; i < collectionValues.length; i++) {
            collectionSum += collectionValues[i];
        }
        const collectionAverage = collectionValues.length > 0? collectionSum / collectionValues.length : 0;

        return ForecastContracts.createForecast({
            metric: 'receivables',
            displayName: 'Accounts Receivable',
            period: forecastPeriod,
            forecast: Number(endingReceivables.toFixed(2)),
            lowerBound: Number(bounds.lower.toFixed(2)),
            upperBound: Number(bounds.upper.toFixed(2)),
            method: 'combined',
            confidence,
            historicalBasis: {
                periodsUsed: collections.length,
                average: collectionAverage,
                trend,
                currentAR,
                newCreditSales,
                expectedCollections: totalCollections,
                endingReceivables,
                creditSalesPct,
                collectionDelayDays,
            },
            assumptions,
            dataStatus: dataSufficiency,
            risks,
            metadata: {
                horizon,
                currentAR,
                newCreditSales,
                expectedCollections: totalCollections,
                endingReceivables,
                creditSalesPct,
                collectionDelayDays,
                volatilityIndex: volatility.available? Number((volatility.volatility * 100).toFixed(2)) : 50,
            },
        });
    }

    /**
     * SCALE OPTIMIZED: Highly efficient single-pass pattern extraction loop execution
     */
    _calculatePatterns(historicalCollections, creditSalesPercentage, collectionDelay) {
        let creditSalesPct = creditSalesPercentage || 0.6;
        let collectionDelayDays = collectionDelay || 30;

        if (historicalCollections.length > 0) {
            let totalAmount = 0;
            let creditPayments = 0;
            let validDelaySum = 0;
            let validDelayCount = 0;

            for (let i = 0; i < historicalCollections.length; i++) {
                const item = historicalCollections[i];
                const amt = this._safeNumber(item.amount);

                totalAmount += amt;
                if (item.type === 'RECEIVED' || item.type === 'IN') {
                    creditPayments += amt;
                }

                if (item.paymentDate && item.saleDate) {
                    const diff = new Date(item.paymentDate) - new Date(item.saleDate);
                    const daysDiff = diff / 86400000;
                    if (daysDiff > 0 && daysDiff < 365) {
                        validDelaySum += daysDiff;
                        validDelayCount++;
                    }
                }
            }

            if (totalAmount > 0 && creditSalesPercentage === null) {
                creditSalesPct = Math.min(0.9, Math.max(0.3, creditPayments / totalAmount));
            }

            if (validDelayCount > 0 && collectionDelay === null) {
                collectionDelayDays = Math.round(validDelaySum / validDelayCount);
            }
        }

        return {
            creditSalesPct: Math.max(0.2, Math.min(0.95, creditSalesPct)),
            collectionDelayDays: Math.max(0, Math.min(90, collectionDelayDays)), // FIX: was 7
        };
    }

    _calculateConfidence(revenueConfidence, volatility, dataPoints, creditSalesPct) {
        let score = 50;

        if (revenueConfidence?.score!== undefined) {
            score += (revenueConfidence.score - 50) * 0.5;
        }

        if (volatility.available) {
            if (volatility.level === 'LOW') score += 10;
            else if (volatility.level === 'HIGH') score -= 15;
        }

        if (dataPoints >= 30) score += 10;
        else if (dataPoints >= 14) score += 5;
        else if (dataPoints < 7) score -= 10;

        if (creditSalesPct > 0.3 && creditSalesPct < 0.8) score += 5;

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

    _calculateBounds(endingReceivables, currentAR, revenue) {
        const margin = revenue > 0? Math.max(0.15, 50000 / revenue) : 0.3;
        return {
            lower: Math.max(0, endingReceivables * (1 - margin)),
            upper: endingReceivables * (1 + margin),
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

    _buildAssumptions(creditSalesPct, collectionDelayDays, dataPoints) {
        const assumptions = [];
        assumptions.push(`Credit sales: ${(creditSalesPct * 100).toFixed(0)}% of revenue`);
        assumptions.push(`Collection delay: ${collectionDelayDays} days`);
        assumptions.push(`Based on ${dataPoints} historical collection periods`);
        return assumptions;
    }

    _detectRisks(endingReceivables, currentAR, revenue, newCreditSales, totalCollections) {
        const risks = [];
        const netARIncrease = newCreditSales - totalCollections;

        // RISK 1: Net AR increase > 30% of current AR
        if (netARIncrease > currentAR * 0.3 && currentAR > 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'receivables',
                displayName: 'Accounts Receivable',
                type: 'RECEIVABLE_PRESSURE',
                severity: 'HIGH',
                description: 'Receivables expected to grow significantly',
                trigger: `${((netARIncrease / currentAR) * 100).toFixed(1)}% net increase this period`,
                action: 'Review credit terms and collection process',
                impact: netARIncrease,
            }));
        }
        // RISK 2: Ending AR > 50% of revenue
        if (endingReceivables > revenue * 0.5 && revenue > 0) {
            risks.push(ForecastContracts.createRisk({
                metric: 'receivables',
                displayName: 'Accounts Receivable',
                type: 'RECEIVABLE_PRESSURE',
                severity: 'MEDIUM',
                description: 'Receivables are high relative to revenue',
                trigger: `Receivables: ${(endingReceivables / revenue * 100).toFixed(1)}% of revenue`,
                action: 'Prioritize collection efforts',
                impact: 0,
            }));
        }
        return risks;
    }

    _paymentDelayDataAvailable(payments) { return payments.some(p => p.paymentDate && p.saleDate); }
    _safeArray(arr) { return Array.isArray(arr)? arr : []; }
    _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }
}

module.exports = ReceivablesForecastCalculator;