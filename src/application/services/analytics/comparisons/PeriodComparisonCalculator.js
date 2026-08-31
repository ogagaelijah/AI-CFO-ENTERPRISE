// src/application/services/analytics/comparisons/PeriodComparisonCalculator.js

const { AnalyticsContracts } = require('../contracts');

/**
 * Period Comparison Calculator - Investor Grade
 */
class PeriodComparisonCalculator {
    constructor({ reportService = null, periodResolver = null } = {}) {
        this.reportService = reportService;
        this.periodResolver = periodResolver;
    }

    async calculate({ userId, businessId, period, reportData = null, comparisonType = 'PREVIOUS_PERIOD' }) {
        let data = reportData;

        if (!data && this.reportService) {
            data = await this.reportService.generate({
                userId, businessId,
                startDate: period.startDate,
                endDate: period.endDate,
                period: period.type,
            });
        }

        if (!data) {
            throw new Error('PeriodComparisonCalculator: Base ReportEngine payload parameters are undefined');
        }

        const comparisonPeriod = this._getComparisonPeriod(period, comparisonType);
        let comparisonData = null;

        if (data.comparison?.previousPeriod && comparisonType === 'PREVIOUS_PERIOD') {
            comparisonData = data.comparison.previousPeriod;
        } else if (this.reportService && comparisonPeriod) {
            comparisonData = await this.reportService.generate({
                userId, businessId,
                startDate: comparisonPeriod.startDate,
                endDate: comparisonPeriod.endDate,
                period: period.type,
            }).catch(() => null);
        }

        const currentSummary = data.summary || data || {};
        const historicalSummary = comparisonData?.summary || comparisonData || {};

        const getMetric = (obj, keys, altPath) => {
            for (const k of keys) if (obj[k]!== undefined) return obj[k];
            return altPath? altPath(obj) : null; // null not 0
        };

        const metricsMapping = {
            revenue: {
                current: getMetric(currentSummary, ['totalRevenue'], d => d.revenue),
                previous: getMetric(historicalSummary, ['totalRevenue'], d => d?.revenue),
                displayName: 'Revenue'
            },
            grossProfit: {
                current: getMetric(currentSummary, ['grossProfit'], d => d.grossProfit?.amount),
                previous: getMetric(historicalSummary, ['grossProfit'], d => d?.grossProfit?.amount),
                displayName: 'Gross Profit'
            },
            netProfit: {
                current: getMetric(currentSummary, ['netProfit'], d => d.netProfit?.amount),
                previous: getMetric(historicalSummary, ['netProfit'], d => d?.netProfit?.amount),
                displayName: 'Net Profit'
            },
            grossMargin: {
                current: getMetric(currentSummary, ['grossMargin'], d => d.grossProfit?.margin),
                previous: getMetric(historicalSummary, ['grossMargin'], d => d?.grossProfit?.margin),
                displayName: 'Gross Margin'
            },
            expenses: {
                current: getMetric(currentSummary, ['totalExpenses'], d => d.expenses || d.operatingExpenses?.total),
                previous: getMetric(historicalSummary, ['totalExpenses'], d => d?.expenses || d?.operatingExpenses?.total),
                displayName: 'Operating Expenses'
            }
        };

        const comparisons = {};
        for (const [key, metric] of Object.entries(metricsMapping)) {
            comparisons[key] = AnalyticsContracts.createComparison({
                metric: key,
                displayName: metric.displayName,
                current: metric.current,
                previous: metric.previous, // KEEP NULL
                currentPeriodLabel: period.label || period.type,
                previousPeriodLabel: comparisonPeriod?.label || 'Previous Period',
                comparisonType
            });
        }

        return {
            type: comparisonType,
            currentPeriod: period,
            comparisonPeriod: comparisonPeriod,
            comparisons,
           ...comparisons
        };
    }

    _getComparisonPeriod(period, type) {
        if (!period?.startDate ||!period?.endDate) return null;

        // ✅ SCALE: Prefer SSOT periodResolver for date math
        if (this.periodResolver?.getComparisonPeriod) {
            return this.periodResolver.getComparisonPeriod(period, type);
        }

        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const formatIso = (d) => d.toISOString().split('T')[0];

        switch (type) {
            case 'PREVIOUS_PERIOD': {
                // Naive fallback - should be replaced by periodResolver
                const duration = end.getTime() - start.getTime();
                const prevStart = new Date(start.getTime() - duration - 86400000);
                const prevEnd = new Date(start.getTime() - 86400000);
                return {
                    startDate: formatIso(prevStart),
                    endDate: formatIso(prevEnd),
                    label: 'Previous Period',
                };
            }
            case 'SAME_PERIOD_LAST_YEAR': {
                const prevStart = new Date(start);
                prevStart.setFullYear(prevStart.getFullYear() - 1);
                const prevEnd = new Date(end);
                prevEnd.setFullYear(prevEnd.getFullYear() - 1);
                return {
                    startDate: formatIso(prevStart),
                    endDate: formatIso(prevEnd),
                    label: `Same Period ${prevStart.getFullYear()}`,
                };
            }
            case 'YTD': {
                const prevYtdStart = new Date(start.getFullYear() - 1, 0, 1);
                const prevYtdEnd = new Date(new Date(start.getFullYear(), 0, 1).getTime() - 1);
                return {
                    startDate: formatIso(prevYtdStart),
                    endDate: formatIso(prevYtdEnd),
                    label: `YTD ${start.getFullYear() - 1}`,
                };
            }
            default: return null;
        }
    }
}

module.exports = PeriodComparisonCalculator;