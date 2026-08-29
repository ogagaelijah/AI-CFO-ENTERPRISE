// src/application/services/reports/MonthlyReportService.js

/**
 * Monthly Report Service
 * Full management report
 * Shows MoM trends, YTD, KPIs, Risks, AI Insights
 */
class MonthlyReportService {
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
        const month = targetDate.getMonth();
        const monthName = targetDate.toLocaleString('default', { month: 'long' });

        // Current month
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];

        // Previous month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevMonthStart = new Date(prevYear, prevMonth, 1);
        const prevMonthEnd = new Date(prevYear, prevMonth + 1, 0);
        const prevMonthStartStr = prevMonthStart.toISOString().split('T')[0];
        const prevMonthEndStr = prevMonthEnd.toISOString().split('T')[0];

        // Year-to-Date
        const ytdStart = new Date(year, 0, 1);
        const ytdStartStr = ytdStart.toISOString().split('T')[0];
        const ytdEndStr = monthEndStr;

        // ✅ FIX: Use sale_date for sales
        const sales = await this.saleRepository.findByDateRange(
            userId,
            monthStartStr,
            monthEndStr
        );

        const income = await this.incomeRepository.findByDateRange(
            userId,
            monthStartStr,
            monthEndStr
        );

        const expenses = await this.expenseRepository.findByDateRange(
            userId,
            monthStartStr,
            monthEndStr
        );

        const purchases = await this.purchaseRepository.findByDateRange(
            userId,
            monthStartStr,
            monthEndStr
        );

        // Get P&L for current month
        const pl = await this.profitLossService.generate({
            userId,
            businessId,
            startDate: monthStartStr,
            endDate: monthEndStr,
            period: 'monthly',
        });

        // Get P&L for previous month
        const prevPl = await this.profitLossService.generate({
            userId,
            businessId,
            startDate: prevMonthStartStr,
            endDate: prevMonthEndStr,
            period: 'monthly',
        });

        // Get P&L for YTD
        const ytdPl = await this.profitLossService.generate({
            userId,
            businessId,
            startDate: ytdStartStr,
            endDate: ytdEndStr,
            period: 'ytd',
        });

        // Get debtors summary
        const debtorSummary = await this.debtorRepository.getSummary(userId);

        // Get creditors summary
        const creditorSummary = await this.creditorRepository.getSummary(userId);

        // Get inventory summary
        const inventorySummary = await this.inventoryRepository.getSummary(userId);

        // Month-over-month comparisons
        const revenueChange = prevPl.revenue.totalRevenue > 0
            ? ((pl.revenue.totalRevenue - prevPl.revenue.totalRevenue) / prevPl.revenue.totalRevenue) * 100
            : 0;

        const profitChange = prevPl.netProfit.amount > 0
            ? ((pl.netProfit.amount - prevPl.netProfit.amount) / prevPl.netProfit.amount) * 100
            : 0;

        // Financial ratios
        const ratios = {
            grossMargin: pl.grossProfit.margin,
            netMargin: pl.netProfit.margin,
            expenseRatio: pl.revenue.totalRevenue > 0
                ? (pl.operatingExpenses.total / pl.revenue.totalRevenue) * 100
                : 0,
        };

        // Risk identification
        const risks = [];
        if (debtorSummary.total_outstanding > 0) {
            risks.push({
                type: 'High Risk',
                description: `Significant overdue receivables: ₦${debtorSummary.total_outstanding.toLocaleString()}`,
            });
        }
        if (inventorySummary.low_stock_count > 0) {
            risks.push({
                type: 'Medium Risk',
                description: `${inventorySummary.low_stock_count} items are below reorder level`,
            });
        }
        if (revenueChange < -10) {
            risks.push({
                type: 'High Risk',
                description: `Revenue declined ${Math.abs(revenueChange).toFixed(1)}% month-over-month`,
            });
        }

        // AI Insights
        const insights = [];
        if (revenueChange > 0) {
            insights.push(`Revenue increased by ${revenueChange.toFixed(1)}% compared to previous month.`);
        } else if (revenueChange < 0) {
            insights.push(`Revenue decreased by ${Math.abs(revenueChange).toFixed(1)}% compared to previous month.`);
        }

        if (pl.netProfit.amount > 0) {
            insights.push(`Business is profitable with a net margin of ${pl.netProfit.margin.toFixed(1)}%.`);
        } else {
            insights.push(`Business is operating at a loss. Review expenses and pricing.`);
        }

        // Recommendations
        const recommendations = [];
        if (revenueChange < 0) recommendations.push('Review marketing and sales strategy to increase revenue.');
        if (debtorSummary.total_outstanding > 0) recommendations.push('Follow up on overdue receivables.');
        if (inventorySummary.low_stock_count > 0) recommendations.push('Reorder low stock items to prevent stockouts.');

        return {
            month: monthName,
            year,
            period: {
                start: monthStartStr,
                end: monthEndStr,
            },
            executiveSummary: {
                totalRevenue: pl.revenue.totalRevenue,
                netProfit: pl.netProfit.amount,
                netMargin: pl.netProfit.margin,
                revenueChange,
                profitChange,
            },
            kpiDashboard: {
                revenue: pl.revenue.totalRevenue,
                cogs: pl.cogs.total,
                grossProfit: pl.grossProfit.amount,
                grossMargin: pl.grossProfit.margin,
                expenses: pl.operatingExpenses.total,
                netProfit: pl.netProfit.amount,
                netMargin: pl.netProfit.margin,
                ytdRevenue: ytdPl.revenue.totalRevenue,
                ytdNetProfit: ytdPl.netProfit.amount,
            },
            revenuePerformance: {
                productSales: pl.revenue.productSales,
                otherRevenue: pl.revenue.otherRevenue,
                totalRevenue: pl.revenue.totalRevenue,
                monthOverMonth: {
                    revenueChange,
                    profitChange,
                },
            },
            cogs: pl.cogs,
            grossProfit: pl.grossProfit,
            operatingExpenses: pl.operatingExpenses,
            netProfit: pl.netProfit,
            cashFlow: {},
            accountsReceivable: {
                totalOutstanding: debtorSummary.total_outstanding || 0,
                activeCount: debtorSummary.active_count || 0,
                overdueCount: debtorSummary.overdue_count || 0,
            },
            accountsPayable: {
                totalOutstanding: creditorSummary.total_outstanding || 0,
                activeCount: creditorSummary.active_count || 0,
                overdueCount: creditorSummary.overdue_count || 0,
            },
            inventory: {
                totalItems: inventorySummary.total_items,
                totalValue: inventorySummary.total_cost_value,
                potentialProfit: inventorySummary.total_profit,
                lowStockCount: inventorySummary.low_stock_count,
            },
            financialRatios: ratios,
            risks,
            aiInsights: insights,
            recommendations,
            monthOverMonth: {
                revenueChange,
                profitChange,
                previousMonth: {
                    revenue: prevPl.revenue.totalRevenue,
                    grossProfit: prevPl.grossProfit.amount,
                    netProfit: prevPl.netProfit.amount,
                },
            },
            yearToDate: {
                revenue: ytdPl.revenue.totalRevenue,
                netProfit: ytdPl.netProfit.amount,
            },
            forecast: {},
        };
    }
}

module.exports = MonthlyReportService;