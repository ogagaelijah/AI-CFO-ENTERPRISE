const { AnalyticsContracts } = require('../contracts');

/**
 * Cash KPI Calculator - Production Core Orchestrator
 * IFRS Compliant | Safe Data Lineage Tracking | Zero Redundant DB Inquiries
 */
class CashKpiCalculator {
    constructor({ reportService, arCalculator = null }) {
        this.reportService = reportService;
        this.arCalculator = arCalculator;
    }

    /**
     * Calculate cash-related KPIs for a period
     */
    async calculate({ userId, businessId, period, reportData = null }) {
        let data = reportData;
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

        if (!data) {
            throw new Error('CashKpiCalculator: ReportEngine returned empty dataset parameters');
        }

        // RESILIENT SSOT MINING
        const summary = data.summary || data.executiveSummary || data.kpiDashboard || data || {};
        const cashFlow = data.cashFlow || {};

        const currentRevenue = summary.totalRevenue ?? data.revenue ?? 0;
        const currentAr = summary.receivables ?? data.receivables?.totalOutstanding ?? 0;

        // Safe Cash Flow Velocity Determinations - NO GUESSING
        let currentNetCashFlow = null; // Default to null for data integrity
        if (summary.cash !== undefined) {
            currentNetCashFlow = summary.cash;
        } else if (cashFlow.netChange !== undefined) {
            currentNetCashFlow = cashFlow.netChange;
        } else if (cashFlow.closing !== undefined && cashFlow.opening !== undefined) {
            currentNetCashFlow = cashFlow.closing - cashFlow.opening;
        }

        // Compute Ratios Safely - IFRS: null if denominator is 0
        const currentCashFlowMargin = currentRevenue > 0 ? (currentNetCashFlow / currentRevenue) * 100 : null;
        const receivablesRatio = currentRevenue > 0 ? (currentAr / currentRevenue) * 100 : null;

        // Extract historical comparison blocks
        const comparison = data.comparison?.previousPeriod || data.weekOverWeek?.previousWeek || {};
        const previousRevenue = comparison.totalRevenue ?? comparison.revenue ?? null;
        
        let previousNetCashFlow = null;
        if (comparison.cash !== undefined) {
            previousNetCashFlow = comparison.cash;
        } else if (comparison.netChange !== undefined) { // ✅ FIXED: don't use netProfit
            previousNetCashFlow = comparison.netChange;
        }

        const previousCashFlowMargin = (previousRevenue > 0 && previousNetCashFlow !== null) ? (previousNetCashFlow / previousRevenue) * 100 : null;
        const previousReceivablesRatio = (previousRevenue > 0 && comparison.receivables !== undefined) ? (comparison.receivables / previousRevenue) * 100 : null;

        return {
            netCashFlow: AnalyticsContracts.createKpi({
                name: 'netCashFlow',
                value: currentNetCashFlow,
                previousValue: previousNetCashFlow,
                period: period.label || period.type,
                source: 'CashKpiCalculator'
            }),
            cashFlowMargin: AnalyticsContracts.createKpi({
                name: 'cashFlowMargin',
                value: currentCashFlowMargin,
                previousValue: previousCashFlowMargin,
                period: period.label || period.type,
                source: 'CashKpiCalculator'
            }),
            receivablesRatio: AnalyticsContracts.createKpi({
                name: 'receivablesRatio',
                value: receivablesRatio,
                previousValue: previousReceivablesRatio,
                period: period.label || period.type,
                source: 'CashKpiCalculator'
            })
        };
    }
}

module.exports = CashKpiCalculator;