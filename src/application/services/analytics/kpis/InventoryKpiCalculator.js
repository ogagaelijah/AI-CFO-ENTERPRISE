const { AnalyticsContracts } = require('../contracts');

/**
 * Inventory KPI Calculator - Investor Grade
 * SSOT Matrix mapping supply chain indicators securely.
 * Scales effortlessly, remains stateless, and provides full audit trail metrics.
 */
class InventoryKpiCalculator {
    constructor({ inventoryReportService }) {
        this.inventoryReportService = inventoryReportService;
    }

    /**
     * Calculate inventory KPIs for a period
     */
    async calculate({ userId, businessId, period, reportData = null }) { // ✅ FIXED: reportData
        let data = reportData;
        
        // 1. Fetch from single source of truth inventory service if not cached
        if (!data) {
            data = await this.inventoryReportService.generate({
                userId,
                businessId,
                includeDetails: false,
                asAtDate: period.endDate, // ✅ FIXED: Standardized
            });
        }

        if (!data) {
            throw new Error('InventoryKpiCalculator: InventoryReportService returned an empty data payload');
        }

        // 2. Resilient parameter path extraction + Comparison
        const summary = data.summary || data || {};
        const comparison = data.comparison?.previousPeriod || {};
        
        const currentInventoryValue = summary.totalCostValue !== undefined ? summary.totalCostValue : (summary.inventoryValue || 0);
        const currentLowStockCount = summary.lowStockCount !== undefined ? summary.lowStockCount : 0;
        const currentTotalItems = summary.totalItems !== undefined ? summary.totalItems : 0;

        const previousInventoryValue = comparison.totalCostValue ?? comparison.inventoryValue ?? null;
        const previousLowStockCount = comparison.lowStockCount ?? null;

        // Inventory Turnover requires historical COGS and average inventory data balances.
        // Left as null placeholder to shield execution lines until telemetry pipelines expand.
        const inventoryTurnover = null;

        // 3. CLEAN FINANCIAL FACTORY MODULE CONTRACT INVOCATIONS
        return {
            inventoryValue: AnalyticsContracts.createKpi({
                name: 'inventoryValue',
                value: currentInventoryValue,
                previousValue: previousInventoryValue, // ✅ ADDED
                period: period.label || period.type,
                source: 'InventoryKpiCalculator'
            }),
            inventoryTurnover: AnalyticsContracts.createKpi({
                name: 'inventoryTurnover',
                value: inventoryTurnover,
                previousValue: null,
                period: period.label || period.type,
                source: 'InventoryKpiCalculator'
            }),
            lowStockCount: AnalyticsContracts.createKpi({
                name: 'lowStockCount',
                value: currentLowStockCount,
                previousValue: previousLowStockCount, // ✅ ADDED
                period: period.label || period.type,
                source: 'InventoryKpiCalculator'
            })
        };
    }
}

module.exports = InventoryKpiCalculator;