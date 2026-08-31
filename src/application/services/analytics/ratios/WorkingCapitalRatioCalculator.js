// src/application/services/analytics/ratios/WorkingCapitalRatioCalculator.js

const { AnalyticsContracts } = require('../contracts');

/**
 * Working Capital Ratio Calculator - Investor Grade Production Core
 * 
 * Computes working capital and trading cycle efficiency ratios:
 * - Receivables to Revenue: Collection lock indices
 * - Payables to Purchases: Supply line leverage tracking
 * - Working Capital: Pure structural liquidity buffer (Current Assets - Current Liabilities)
 * 
 * Performance Profile: Stateless, O(1) Execution speed, Zero redundant DB requests.
 */
class WorkingCapitalRatioCalculator {
    constructor() {
        // Dependencies removed from constructor since data is securely minded via the SSOT payload
    }

    /**
     * Calculate working capital ratios using memory-cached shared payloads
     */
    async calculate(sharedPayload) {
        if (!sharedPayload || !sharedPayload.reportData || !sharedPayload.balanceSheetData) {
            throw new Error('WorkingCapitalRatioCalculator: Missing required unified sharedPayload parameters');
        }

        const { reportData, balanceSheetData, period } = sharedPayload;

        // 1. RESILIENT SSOT MINING - Extract current asset items from memory cache
        const currentCash = balanceSheetData.cash ?? 0;
        const arTotal = balanceSheetData.receivables ?? 0;
        const apTotal = balanceSheetData.payables ?? 0;
        const inventory = balanceSheetData.inventory ?? 0;

        // Extract historical asset items for YoY comparative analytics
        const previousAr = balanceSheetData.previous?.receivables ?? null;
        const previousAp = balanceSheetData.previous?.payables ?? null;

        // Extract operational top-line items safely across multiple report schemas
        const summary = reportData.summary || reportData || {};
        const revenue = summary.totalRevenue !== undefined ? summary.totalRevenue : (reportData.revenue || 0);
        
        // Safely capture purchase expenditures from the summary block
        const purchases = summary.totalPurchases !== undefined ? summary.totalPurchases : (summary.purchases || 0);

        // 2. Core Accounting Formulation Matrix
        const currentAssets = currentCash + arTotal + inventory;
        const currentLiabilities = apTotal;
        const workingCapitalSurplus = currentAssets - currentLiabilities;

        const previousRevenue = reportData.comparison?.previousPeriod?.revenue ?? null;
        const previousPurchases = reportData.comparison?.previousPeriod?.purchases ?? null;

        // 3. ✅ CLEAN RATIO CONTRACT PAYLOAD INVOCATIONS
        const receivablesToRevenueRatio = AnalyticsContracts.createRatio({
            name: 'receivables_to_revenue',
            displayName: 'Receivables to Revenue',
            value: revenue > 0 ? (arTotal / revenue) * 100 : null,
            previousValue: (previousRevenue > 0 && previousAr !== null) ? (previousAr / previousRevenue) * 100 : null,
            category: 'working_capital',
            interpretation: 'LOWER_IS_BETTER',
            formula: 'Accounts Receivable / Revenue × 100'
        });

        const payablesToPurchasesRatio = AnalyticsContracts.createRatio({
            name: 'payables_to_purchases',
            displayName: 'Payables to Purchases',
            value: purchases > 0 ? (apTotal / purchases) * 100 : null,
            previousValue: (previousPurchases > 0 && previousAp !== null) ? (previousAp / previousPurchases) * 100 : null,
            category: 'working_capital',
            interpretation: 'NEUTRAL',
            formula: 'Accounts Payable / Purchases × 100'
        });

        // Historical Working Capital calculation helper
        let previousWorkingCapital = null;
        if (balanceSheetData.previous?.cash !== null && previousAr !== null && previousAp !== null && balanceSheetData.previous?.inventory !== null) {
            const prevAssets = balanceSheetData.previous.cash + previousAr + balanceSheetData.previous.inventory;
            previousWorkingCapital = prevAssets - previousAp;
        }

        const workingCapitalRatio = AnalyticsContracts.createRatio({
            name: 'working_capital',
            displayName: 'Working Capital',
            value: workingCapitalSurplus,
            previousValue: previousWorkingCapital,
            category: 'working_capital',
            interpretation: 'HIGHER_IS_BETTER',
            formula: 'Current Assets - Current Liabilities'
        });

        return {
            receivablesToRevenue: receivablesToRevenueRatio,
            payablesToPurchases: payablesToPurchasesRatio,
            workingCapital: workingCapitalRatio
        };
    }
}

module.exports = WorkingCapitalRatioCalculator;
