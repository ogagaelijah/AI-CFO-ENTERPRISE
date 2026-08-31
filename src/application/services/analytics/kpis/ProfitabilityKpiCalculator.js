const { AnalyticsContracts } = require('../contracts');

/**
 * Profitability KPI Calculator - Investor Grade Production Configuration
 * IFRS Compliant | Safe Data Lineage Tracking | Zero-Division Guarded
 * Scale: Stateless, O(1), cache-compatible
 */
class ProfitabilityKpiCalculator {
    constructor({ reportService }) {
        this.reportService = reportService;
    }

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
            throw new Error('ProfitabilityKpiCalculator: ReportEngine returned empty dataset parameters');
        }

        // RESILIENT SSOT MINING - Production guard against schema drift
        const summary = data.summary || data || {};
        const comparison = data.comparison?.previousPeriod || {};

        // Current Operational Metrics Mining
        const currentRevenue = summary.totalRevenue !== undefined ? summary.totalRevenue : (data.revenue || 0);
        const currentCogs = summary.cogs !== undefined ? summary.cogs : (data.cogs?.total || 0);
        const currentGrossProfit = summary.grossProfit !== undefined ? summary.grossProfit : (data.grossProfit?.amount || 0);
        const currentGrossMargin = summary.grossMargin !== undefined ? summary.grossMargin : (currentRevenue > 0 ? (currentGrossProfit / currentRevenue) * 100 : null);
        const currentNetProfit = summary.netProfit !== undefined ? summary.netProfit : (data.netProfit?.amount || 0);
        const currentNetMargin = summary.netMargin !== undefined ? summary.netMargin : (currentRevenue > 0 ? (currentNetProfit / currentRevenue) * 100 : null);

        // Previous Historical Metrics Mining
        const previousRevenue = comparison.totalRevenue ?? null;
        const previousGrossProfit = comparison.grossProfit ?? null;
        const previousNetProfit = comparison.netProfit ?? null;

        // Safely extract historical margins using matching baseline metrics
        const previousGrossMargin = (previousRevenue > 0 && previousGrossProfit !== null) ? (previousGrossProfit / previousRevenue) * 100 : null;
        const previousNetMargin = (previousRevenue > 0 && previousNetProfit !== null) ? (previousNetProfit / previousRevenue) * 100 : null;

        // Growth calculations with Math.abs for loss->profit transitions
        const profitGrowth = previousNetProfit !== null && previousNetProfit !== 0
            ? ((currentNetProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100
            : null;

        const grossProfitGrowth = previousGrossProfit !== null && previousGrossProfit !== 0
            ? ((currentGrossProfit - previousGrossProfit) / Math.abs(previousGrossProfit)) * 100
            : null;

        // ✅ CLEAN FINANCIAL FACTORY MODULE CONTRACT INVOCATIONS
        return {
            grossProfit: AnalyticsContracts.createKpi({
                name: 'grossProfit',
                value: currentGrossProfit,
                previousValue: previousGrossProfit,
                period: period.label || period.type,
                source: 'ProfitabilityKpiCalculator'
            }),
            grossMargin: AnalyticsContracts.createKpi({
                name: 'grossMargin',
                value: currentGrossMargin,
                previousValue: previousGrossMargin,
                period: period.label || period.type,
                source: 'ProfitabilityKpiCalculator'
            }),
            grossProfitGrowth: AnalyticsContracts.createKpi({
                name: 'grossProfitGrowth',
                value: grossProfitGrowth,
                previousValue: null,
                period: period.label || period.type,
                source: 'ProfitabilityKpiCalculator'
            }),
            netProfit: AnalyticsContracts.createKpi({
                name: 'netProfit',
                value: currentNetProfit,
                previousValue: previousNetProfit,
                period: period.label || period.type,
                source: 'ProfitabilityKpiCalculator'
            }),
            netMargin: AnalyticsContracts.createKpi({
                name: 'netMargin',
                value: currentNetMargin,
                previousValue: previousNetMargin,
                period: period.label || period.type,
                source: 'ProfitabilityKpiCalculator'
            }),
            profitGrowth: AnalyticsContracts.createKpi({
                name: 'profitGrowth',
                value: profitGrowth,
                previousValue: null,
                period: period.label || period.type,
                source: 'ProfitabilityKpiCalculator'
            })
        };
    }
}

module.exports = ProfitabilityKpiCalculator;