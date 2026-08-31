// src/application/services/analytics/ratios/RatioEngine.js

const ProfitabilityRatioCalculator = require('./ProfitabilityRatioCalculator');
const LiquidityRatioCalculator = require('./LiquidityRatioCalculator');
const EfficiencyRatioCalculator = require('./EfficiencyRatioCalculator');
const WorkingCapitalRatioCalculator = require('./WorkingCapitalRatioCalculator');

/**
 * Ratio Engine - Production Core Orchestrator
 * Consumes fundamental reporting layers to output auditable business health metrics.
 * IFRS Compliant | Schema Drift Protected | High-Velocity O(1) Memory Mining
 */
class RatioEngine {
    constructor({
        reportService,
        saleRepository,
        purchaseRepository,
        cashCalculator,
        arCalculator,
        apCalculator,
        inventoryCalculator,
        profitabilityRatioCalculator = null,
        liquidityRatioCalculator = null,
        efficiencyRatioCalculator = null,
        workingCapitalRatioCalculator = null
    }) {
        this.reportService = reportService;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.cashCalculator = cashCalculator;
        this.arCalculator = arCalculator;
        this.apCalculator = apCalculator;
        this.inventoryCalculator = inventoryCalculator;

        // Initialize child ratio engines supporting injection overrides for testing
        this.profitabilityRatioCalculator = profitabilityRatioCalculator || new ProfitabilityRatioCalculator();
        this.liquidityRatioCalculator = liquidityRatioCalculator || new LiquidityRatioCalculator();
        this.efficiencyRatioCalculator = efficiencyRatioCalculator || new EfficiencyRatioCalculator();
        this.workingCapitalRatioCalculator = workingCapitalRatioCalculator || new WorkingCapitalRatioCalculator();
    }

    /**
     * Compute full analytical financial ratios for a business timeframe
     */
    async calculate({ userId, businessId, period, reportData = null }) {
        let data = reportData;
        
        // 1. Fetch from single source of truth report engine if not cached in memory
        if (!data) {
            data = await this.reportService.generate({
                userId,
                businessId,
                startDate: period.startDate,
                endDate: period.endDate,
                period: period.type || 'monthly'
            });
        }

        if (!data) {
            throw new Error('RatioEngine: Core ReportEngine returned an empty data payload');
        }

        // ✅ PRODUCTION RESILIENT MINING: Extract sub-data safely across multiple service types
        const summary = data.summary || data.executiveSummary || data.kpiDashboard || data || {};

        // 2. Fetch structural asset ledger metrics in parallel with smart cache passing
        const [cashData, arData, apData, inventoryData] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, period, reportData: summary.cash !== undefined ? summary : null }),
            this.arCalculator.calculate({ userId, businessId, period, reportData: summary.receivables !== undefined ? summary : null }),
            this.apCalculator.calculate({ userId, businessId, period, reportData: summary.payables !== undefined ? summary : null }),
            this.inventoryCalculator.calculate({ userId, businessId, period, reportData: summary.inventory !== undefined ? summary : null })
        ]);

        const comparison = data.comparison?.previousPeriod || {};

        // 3. Assemble combined context configuration parameter objects using strict nullish checks
        const sharedPayload = {
            reportData: data,
            balanceSheetData: {
                cash: cashData?.closingCash ?? null,
                receivables: arData?.totalOutstanding ?? null,
                payables: apData?.totalOutstanding ?? null,
                inventory: inventoryData?.totalCostValue ?? null,
                previous: {
                    cash: comparison.cash ?? null,
                    receivables: comparison.receivables ?? null,
                    payables: comparison.payables ?? null,
                    inventory: comparison.inventory ?? null,
                }
            },
            period
        };

        // 4. Fire localized sub-calculators in parallel for maximum execution speeds
        const [profitability, liquidity, efficiency, workingCapital] = await Promise.all([
            this.profitabilityRatioCalculator.calculate(sharedPayload),
            this.liquidityRatioCalculator.calculate(sharedPayload),
            this.efficiencyRatioCalculator.calculate(sharedPayload),
            this.workingCapitalRatioCalculator.calculate(sharedPayload)
        ]);

        return {
            period: period.label || period.type,
            businessId,
            generatedAt: new Date().toISOString(),
            source: 'RatioEngine',
            profitability,
            liquidity,
            efficiency,
            workingCapital
        };
    }
}

module.exports = RatioEngine;
