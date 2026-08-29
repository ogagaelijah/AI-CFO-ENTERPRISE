// src/application/services/reports/YearlyReportService.js

/**
 * Yearly Report Service
 * Strategic performance analysis
 * Shows YoY comparison, Balance Sheet, Strategic Insights
 */
class YearlyReportService {
    constructor({
        saleRepository,
        purchaseRepository,
        expenseRepository,
        incomeRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        profitLossService,
    }) {
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
        this.profitLossService = profitLossService;
    }

    async generate({ userId, businessId, date }) {
        const targetDate = date ? new Date(date) : new Date();
        const year = targetDate.getFullYear();

        // Current year
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        const yearStartStr = yearStart.toISOString().split('T')[0];
        const yearEndStr = yearEnd.toISOString().split('T')[0];

        // Previous year
        const prevYear = year - 1;
        const prevYearStart = new Date(prevYear, 0, 1);
        const prevYearEnd = new Date(prevYear, 11, 31);
        const prevYearStartStr = prevYearStart.toISOString().split('T')[0];
        const prevYearEndStr = prevYearEnd.toISOString().split('T')[0];

        // Get P&L for current year
        const pl = await this.profitLossService.generate({
            userId,
            businessId,
            startDate: yearStartStr,
            endDate: yearEndStr,
            period: 'yearly',
        });

        // Get P&L for previous year
        const prevPl = await this.profitLossService.generate({
            userId,
            businessId,
            startDate: prevYearStartStr,
            endDate: prevYearEndStr,
            period: 'yearly',
        });

        // Get debtors summary
        const debtorSummary = await this.debtorRepository.getSummary(userId);

        // Get creditors summary
        const creditorSummary = await this.creditorRepository.getSummary(userId);

        // Get inventory summary
        const inventorySummary = await this.inventoryRepository.getSummary(userId);

        // Year-over-year comparisons
        const revenueChange = prevPl.revenue.totalRevenue > 0
            ? ((pl.revenue.totalRevenue - prevPl.revenue.totalRevenue) / prevPl.revenue.totalRevenue) * 100
            : 0;

        const profitChange = prevPl.netProfit.amount > 0
            ? ((pl.netProfit.amount - prevPl.netProfit.amount) / prevPl.netProfit.amount) * 100
            : 0;

        const marginChange = pl.grossProfit.margin - prevPl.grossProfit.margin;

        // Financial ratios
        const ratios = {
            grossMargin: pl.grossProfit.margin,
            netMargin: pl.netProfit.margin,
            expenseRatio: pl.revenue.totalRevenue > 0
                ? (pl.operatingExpenses.total / pl.revenue.totalRevenue) * 100
                : 0,
        };

        // Major risks
        const majorRisks = [];
        if (revenueChange < 0) {
            majorRisks.push('Revenue declined year-over-year.');
        }
        if (debtorSummary.total_outstanding > 0) {
            majorRisks.push('Significant outstanding receivables.');
        }

        // Major opportunities
        const majorOpportunities = [];
        if (revenueChange > 0) {
            majorOpportunities.push('Revenue growing year-over-year.');
        }
        if (pl.netProfit.amount > 0) {
            majorOpportunities.push('Business is profitable.');
        }

        return {
            year,
            period: {
                start: yearStartStr,
                end: yearEndStr,
            },
            executiveSummary: {
                totalRevenue: pl.revenue.totalRevenue,
                netProfit: pl.netProfit.amount,
                netMargin: pl.netProfit.margin,
                revenueChange,
                profitChange,
            },
            annualKpiDashboard: {
                revenue: pl.revenue.totalRevenue,
                cogs: pl.cogs.total,
                grossProfit: pl.grossProfit.amount,
                grossMargin: pl.grossProfit.margin,
                expenses: pl.operatingExpenses.total,
                netProfit: pl.netProfit.amount,
                netMargin: pl.netProfit.margin,
            },
            annualPl: pl,
            cashFlow: {},
            balanceSheet: {},
            trends: {
                revenue: {
                    currentYear: pl.revenue.totalRevenue,
                    previousYear: prevPl.revenue.totalRevenue,
                    change: revenueChange,
                },
                profit: {
                    currentYear: pl.netProfit.amount,
                    previousYear: prevPl.netProfit.amount,
                    change: profitChange,
                },
                margin: {
                    currentYear: pl.grossProfit.margin,
                    previousYear: prevPl.grossProfit.margin,
                    change: marginChange,
                },
            },
            inventory: {
                totalItems: inventorySummary.total_items,
                totalValue: inventorySummary.total_cost_value,
                potentialProfit: inventorySummary.total_profit,
                lowStockCount: inventorySummary.low_stock_count,
            },
            receivables: {
                totalOutstanding: debtorSummary.total_outstanding || 0,
                activeCount: debtorSummary.active_count || 0,
                overdueCount: debtorSummary.overdue_count || 0,
            },
            payables: {
                totalOutstanding: creditorSummary.total_outstanding || 0,
                activeCount: creditorSummary.active_count || 0,
                overdueCount: creditorSummary.overdue_count || 0,
            },
            financialRatios: ratios,
            yearOverYear: {
                revenueChange,
                profitChange,
                marginChange,
                previousYear: {
                    revenue: prevPl.revenue.totalRevenue,
                    grossProfit: prevPl.grossProfit.amount,
                    netProfit: prevPl.netProfit.amount,
                },
            },
            forecast: {},
            majorRisks,
            majorOpportunities,
            strategicInsights: [
                `Revenue ${revenueChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange).toFixed(1)}% year-over-year.`,
                `Net profit margin is ${pl.netProfit.margin.toFixed(1)}%.`,
            ],
            recommendations: [
                revenueChange < 0 && 'Review business strategy to reverse revenue decline.',
                debtorSummary.total_outstanding > 0 && 'Implement stricter credit policies.',
            ].filter(Boolean),
        };
    }
}

module.exports = YearlyReportService;