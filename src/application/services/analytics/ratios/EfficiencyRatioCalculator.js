// src/application/services/analytics/ratios/EfficiencyRatioCalculator.js

const { AnalyticsContracts } = require('../contracts');

/**
 * Efficiency Ratio Calculator - Investor Grade Production Configuration
 */
class EfficiencyRatioCalculator {
    constructor() {}

    async calculate(sharedPayload) {
        if (!sharedPayload || !sharedPayload.reportData || !sharedPayload.balanceSheetData) {
            throw new Error('EfficiencyRatioCalculator: Missing required unified sharedPayload parameters');
        }

        const { reportData, balanceSheetData } = sharedPayload;

        const summary = reportData.summary || reportData || {};
        const comparison = reportData.comparison?.previousPeriod || reportData.weekOverWeek?.previousWeek || {};

        // 1. Current Period Metrics
        const currentRevenue = summary.totalRevenue ?? reportData.revenue ?? null;
        const currentCogs = summary.cogs ?? reportData.cogs?.total ?? null;
        const currentExpenses = summary.totalExpenses ?? reportData.expenses ?? reportData.operatingExpenses?.total ?? null;
        const currentSalesCount = summary.salesCount ?? reportData.salesCount ?? reportData.transactions?.length ?? null;
        const currentInventory = balanceSheetData.inventory ?? null;

        // 2. Previous Period Metrics
        const previousRevenue = comparison.totalRevenue ?? comparison.revenue ?? null;
        const previousCogs = comparison.cogs ?? null;
        const previousExpenses = comparison.totalExpenses ?? comparison.expenses ?? null;
        const previousSalesCount = comparison.salesCount ?? null;
        const previousInventory = balanceSheetData.previous?.inventory ?? null;

        // 3. Core Formulation with strict null checks
        const inventoryTurnover = (currentInventory !== null && currentCogs !== null && currentInventory > 0 && currentCogs > 0) 
            ? currentCogs / currentInventory 
            : null;
            
        const revenuePerTransaction = (currentSalesCount !== null && currentRevenue !== null && currentSalesCount > 0) 
            ? currentRevenue / currentSalesCount 
            : null;
            
        const expensePerSale = (currentSalesCount !== null && currentExpenses !== null && currentSalesCount > 0) 
            ? currentExpenses / currentSalesCount 
            : null;

        // Historical
        const previousInventoryTurnover = (previousInventory !== null && previousCogs !== null && previousInventory > 0 && previousCogs > 0) 
            ? previousCogs / previousInventory 
            : null;
        const previousRevenuePerTransaction = (previousSalesCount !== null && previousRevenue !== null && previousSalesCount > 0) 
            ? previousRevenue / previousSalesCount 
            : null;
        const previousExpensePerSale = (previousSalesCount !== null && previousExpenses !== null && previousSalesCount > 0) 
            ? previousExpenses / previousSalesCount 
            : null;

        return {
            inventoryTurnover: AnalyticsContracts.createRatio({
                name: 'inventory_turnover',
                displayName: 'Inventory Turnover',
                value: inventoryTurnover,
                previousValue: previousInventoryTurnover,
                category: 'efficiency',
                interpretation: 'HIGHER_IS_BETTER',
                formula: 'COGS / Ending Inventory' // Updated to match calculation
            }),
            revenuePerTransaction: AnalyticsContracts.createRatio({
                name: 'revenue_per_transaction',
                displayName: 'Revenue per Transaction',
                value: revenuePerTransaction,
                previousValue: previousRevenuePerTransaction,
                category: 'efficiency',
                interpretation: 'HIGHER_IS_BETTER',
                formula: 'Revenue / Sales Count'
            }),
            expensePerSale: AnalyticsContracts.createRatio({
                name: 'expense_per_sale',
                displayName: 'Expense per Sale',
                value: expensePerSale,
                previousValue: previousExpensePerSale,
                category: 'efficiency',
                interpretation: 'LOWER_IS_BETTER',
                formula: 'Total Expenses / Sales Count'
            })
        };
    }
}

module.exports = EfficiencyRatioCalculator;