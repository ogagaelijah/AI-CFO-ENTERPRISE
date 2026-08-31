// src/application/services/analytics/ratios/ProfitabilityRatioCalculator.js

const { AnalyticsContracts } = require('../contracts');

/**
 * Profitability Ratio Calculator - Investor Grade Production Configuration
 * 
 * Computes business health efficiency margins:
 * - Gross Margin: Direct product markup yield
 * - Net Margin: Comprehensive operational earnings retention
 * - Operating Margin: Core business activity strength (Excluding tax/interest)
 * - Expense Ratio: Top-line revenue dissipation index
 * 
 * Performance Profile: Stateless, O(1) Memory Extraction, Zero duplicate query loops.
 */
class ProfitabilityRatioCalculator {
    constructor() {
        // Dependencies removed from constructor since data flows via unified shared payloads
    }

    /**
     * Calculate profitability ratios using memory-cached shared payloads
     */
    async calculate(sharedPayload) {
        if (!sharedPayload || !sharedPayload.reportData) {
            throw new Error('ProfitabilityRatioCalculator: Missing required unified sharedPayload parameters');
        }

        const { reportData, period } = sharedPayload;

        // ✅ RESILIENT SSOT MINING - Protects against upstream report schema changes
        const summary = reportData.summary || reportData || {};
        const comparison = reportData.comparison?.previousPeriod || reportData.weekOverWeek?.previousWeek || {};

        // 1. Extract current period metrics safely across multiple service endpoints
        const currentRevenue = summary.totalRevenue !== undefined ? summary.totalRevenue : (reportData.revenue || 0);
        const currentCogs = summary.cogs !== undefined ? summary.cogs : (reportData.cogs?.total || 0);
        
        const currentGrossProfit = summary.grossProfit !== undefined ? summary.grossProfit : (reportData.grossProfit?.amount || (currentRevenue - currentCogs));
        const currentNetProfit = summary.netProfit !== undefined ? summary.netProfit : (reportData.netProfit?.amount || 0);
        const currentOperatingProfit = summary.operatingProfit !== undefined ? summary.operatingProfit : (reportData.operatingProfit?.amount || currentGrossProfit);
        const currentExpenses = summary.totalExpenses !== undefined ? summary.totalExpenses : (reportData.expenses || reportData.operatingExpenses?.total || 0);

        // 2. Extract historical comparative data points with strict nullish protections
        const previousRevenue = comparison.totalRevenue ?? comparison.revenue ?? null;
        const previousGrossProfit = comparison.grossProfit ?? null;
        const previousNetProfit = comparison.netProfit ?? null;
        const previousOperatingProfit = comparison.operatingProfit ?? previousGrossProfit;
        const previousExpenses = comparison.totalExpenses ?? comparison.expenses ?? null;

        // 3. ✅ CLEAN RATIO CONTRACT PAYLOAD INVOCATIONS
        return {
            grossMargin: AnalyticsContracts.createRatio({
                name: 'gross_margin',
                displayName: 'Gross Margin',
                value: currentRevenue > 0 ? (currentGrossProfit / currentRevenue) * 100 : null,
                previousValue: (previousRevenue > 0 && previousGrossProfit !== null) ? (previousGrossProfit / previousRevenue) * 100 : null,
                category: 'profitability',
                interpretation: 'HIGHER_IS_BETTER',
                formula: 'Gross Profit / Revenue × 100'
            }),
            netMargin: AnalyticsContracts.createRatio({
                name: 'net_margin',
                displayName: 'Net Margin',
                value: currentRevenue > 0 ? (currentNetProfit / currentRevenue) * 100 : null,
                previousValue: (previousRevenue > 0 && previousNetProfit !== null) ? (previousNetProfit / previousRevenue) * 100 : null,
                category: 'profitability',
                interpretation: 'HIGHER_IS_BETTER',
                formula: 'Net Profit / Revenue × 100'
            }),
            operatingMargin: AnalyticsContracts.createRatio({
                name: 'operating_margin',
                displayName: 'Operating Margin',
                value: currentRevenue > 0 ? (currentOperatingProfit / currentRevenue) * 100 : null,
                previousValue: (previousRevenue > 0 && previousOperatingProfit !== null) ? (previousOperatingProfit / previousRevenue) * 100 : null,
                category: 'profitability',
                interpretation: 'HIGHER_IS_BETTER',
                formula: 'Operating Profit / Revenue × 100'
            }),
            expenseRatio: AnalyticsContracts.createRatio({
                name: 'expense_ratio',
                displayName: 'Expense Ratio',
                value: currentRevenue > 0 ? (currentExpenses / currentRevenue) * 100 : null,
                previousValue: (previousRevenue > 0 && previousExpenses !== null) ? (previousExpenses / previousRevenue) * 100 : null,
                category: 'profitability',
                interpretation: 'LOWER_IS_BETTER',
                formula: 'Operating Expenses / Revenue × 100'
            })
        };
    }
}

module.exports = ProfitabilityRatioCalculator;
