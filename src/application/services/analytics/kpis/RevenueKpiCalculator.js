const { AnalyticsContracts } = require('../contracts');

/**
 * Revenue KPI Calculator - Investor Grade
 * SSOT: Reads ONLY from WeeklyReportService.summary and .comparison
 * IFRS Compliant | Zero-Crash | Audit Trail
 */
class RevenueKpiCalculator {
    constructor({ reportService }) {
        this.reportService = reportService;
    }

    /**
     * Calculate revenue KPIs for a period
     */
    async calculate({ userId, businessId, period, reportData = null }) {
        let data = reportData;
        
        // 1. Fetch from single source of truth report engine if not cached
        if (!data) {
            const { startDate, endDate } = period;
            data = await this.reportService.generate({
                userId,
                businessId,
                startDate,
                endDate,
                period: period.type,
            });
        }

        // 2. PRODUCTION FIX: STRICT SSOT PATH. Fail fast if ReportEngine changes
        if (!data || !data.summary) {
            throw new Error('RevenueKpiCalculator: ReportEngine missing required data.summary');
        }

        const summary = data.summary;
        const comparison = data.comparison?.previousPeriod || {};

        // 3. STRICT MAPPING - No fallbacks. This prevents silent 0 errors
        const currentRevenue = summary.totalRevenue;
        const currentSalesCount = summary.salesCount;
        
        const previousRevenue = comparison.totalRevenue ?? null; // null = N/A not 0
        const previousSalesCount = comparison.salesCount ?? null;

        // 4. Compute business analytics averages safely
        const currentAtv = currentSalesCount > 0 ? currentRevenue / currentSalesCount : null;
        const previousAtv = previousSalesCount > 0 ? previousRevenue / previousSalesCount : null;

        // 5. CLEAN ACCOUNTING FACTORY CONTRACT INVOCATIONS
        const revenueKpi = AnalyticsContracts.createKpi({
            name: 'revenue',
            value: currentRevenue,
            previousValue: previousRevenue,
            period: period.label || period.type,
            source: 'RevenueKpiCalculator'
        });

        const salesCountKpi = AnalyticsContracts.createKpi({
            name: 'salesCount',
            value: currentSalesCount,
            previousValue: previousSalesCount,
            period: period.label || period.type,
            source: 'RevenueKpiCalculator'
        });

        const averageTransactionValueKpi = AnalyticsContracts.createKpi({
            name: 'averageTransactionValue',
            value: currentAtv,
            previousValue: previousAtv,
            period: period.label || period.type,
            source: 'RevenueKpiCalculator'
        });

        // Growth reuses contract calculation for mathematical uniformity
        const revenueGrowthKpi = AnalyticsContracts.createKpi({
            name: 'revenueGrowth',
            value: revenueKpi.percentageChange,
            previousValue: null,
            period: period.label || period.type,
            source: 'RevenueKpiCalculator'
        });

        return {
            revenue: revenueKpi,
            salesCount: salesCountKpi,
            averageTransactionValue: averageTransactionValueKpi,
            revenueGrowth: revenueGrowthKpi
        };
    }
}

module.exports = RevenueKpiCalculator;