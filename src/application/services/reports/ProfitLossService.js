// src/application/services/reports/ProfitLossService.js

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');

/**
 * Profit & Loss Service - Single source of truth
 * 
 * Generates accrual-based P&L reports using:
 * - RevenueCalculator for product revenue
 * - CogsCalculator for COGS
 * - ProfitCalculator for ALL profit metrics (including total revenue with other income)
 * 
 * All revenue calculations flow through ProfitCalculator.
 * This ensures consistency across all reports.
 */
class ProfitLossService {
    constructor({
        saleRepository,
        expenseRepository,
        incomeRepository,
        revenueCalculator = null,
        cogsCalculator = null,
        profitCalculator = null,
    }) {
        this.saleRepository = saleRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;

        this.revenueCalculator = revenueCalculator || new RevenueCalculator({
            saleRepository: this.saleRepository,
        });

        this.cogsCalculator = cogsCalculator || new CogsCalculator({
            saleRepository: this.saleRepository,
        });

        this.profitCalculator = profitCalculator || new ProfitCalculator({
            saleRepository: this.saleRepository,
            expenseRepository: this.expenseRepository,
            incomeRepository: this.incomeRepository,
        });
    }

    /**
     * Generate full detailed P&L report for a date range
     */
    async generate({
        userId,
        businessId,
        startDate,
        endDate,
        period = 'monthly',
    }) {
        // 1. Get product revenue
        const revenueData = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate,
            endDate,
        });

        // 2. Get COGS
        const cogsData = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate,
            endDate,
        });

        // 3. Get expenses
        const expenses = await this.expenseRepository.findByDateRange(
            userId,
            startDate,
            endDate
        );

        // 4. Get other income
        const incomes = await this.incomeRepository.findByDateRange(
            userId,
            startDate,
            endDate
        );

        const expenseTotals = this._aggregateExpenses(expenses);
        const totalOperatingExpenses = Object.values(expenseTotals).reduce((sum, v) => sum + v, 0);
        const totalOtherRevenue = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

        // 5. Get ALL profit metrics from ProfitCalculator (single source of truth)
        // ProfitCalculator now correctly includes otherIncome in revenue
        const profitData = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate,
            endDate,
            revenueData: { totalRevenue: revenueData.totalRevenue },
            cogsData: { totalCogs: cogsData.totalCogs },
            expenseData: { total: totalOperatingExpenses, byCategory: this._formatExpenseBreakdown(expenseTotals) },
            incomeData: { total: totalOtherRevenue },
        });

        const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

        return {
            period: periodLabel,
            startDate,
            endDate,
            revenue: {
                productSales: profitData.productRevenue,
                otherRevenue: profitData.otherIncome,
                totalRevenue: profitData.revenue,  // ✅ Single source: product + other
            },
            cogs: {
                total: profitData.cogs,
            },
            grossProfit: {
                amount: profitData.grossProfit,
                margin: profitData.grossMargin,
            },
            operatingExpenses: {
                salaries: expenseTotals['Salaries'] || 0,
                rent: expenseTotals['Rent'] || 0,
                advertising: expenseTotals['Advertising'] || 0,
                transportation: expenseTotals['Transportation'] || 0,
                utilities: expenseTotals['Utilities'] || 0,
                other: expenseTotals['Other'] || 0,
                total: profitData.expenses,
            },
            operatingProfit: {
                amount: profitData.operatingProfit,
                margin: profitData.operatingMargin,
            },
            otherIncome: profitData.otherIncome,
            otherExpenses: 0,
            netProfit: {
                amount: profitData.netProfit,
                margin: profitData.netMargin,
            },
        };
    }

    /**
     * Generate P&L with period comparison
     */
    async generateWithComparison(params) {
        const current = await this.generate(params);

        const start = new Date(params.startDate);
        const end = new Date(params.endDate);
        const duration = end - start;

        const prevStart = new Date(start.getTime() - duration);
        const prevEnd = new Date(start.getTime() - 1);

        const previous = await this.generate({
            ...params,
            startDate: prevStart.toISOString().split('T')[0],
            endDate: prevEnd.toISOString().split('T')[0],
        });

        const revenueChange = previous.revenue.totalRevenue > 0
            ? ((current.revenue.totalRevenue - previous.revenue.totalRevenue) / previous.revenue.totalRevenue) * 100
            : 0;

        const profitChange = previous.netProfit.amount !== 0
            ? ((current.netProfit.amount - previous.netProfit.amount) / Math.abs(previous.netProfit.amount)) * 100
            : 0;

        const marginChange = current.grossProfit.margin - previous.grossProfit.margin;

        return {
            ...current,
            comparison: {
                revenueChange: Math.round(revenueChange * 100) / 100,
                profitChange: Math.round(profitChange * 100) / 100,
                marginChange: Math.round(marginChange * 100) / 100,
                previousPeriod: {
                    revenue: previous.revenue.totalRevenue,
                    grossProfit: previous.grossProfit.amount,
                    netProfit: previous.netProfit.amount,
                },
            },
        };
    }

    /**
     * Generate quick summary (for dashboard)
     */
    async generateSummary(params) {
        const full = await this.generate(params);
        return {
            revenue: full.revenue.totalRevenue,
            cogs: full.cogs.total,
            grossProfit: full.grossProfit.amount,
            grossMargin: full.grossProfit.margin,
            operatingExpenses: full.operatingExpenses.total,
            operatingProfit: full.operatingProfit.amount,
            netProfit: full.netProfit.amount,
            netMargin: full.netProfit.margin,
            period: full.period,
            startDate: full.startDate,
            endDate: full.endDate,
        };
    }

    _aggregateExpenses(expenses) {
        const categoryMap = {
            'salary': 'Salaries',
            'salaries': 'Salaries',
            'wages': 'Salaries',
            'rent': 'Rent',
            'rental': 'Rent',
            'advertising': 'Advertising',
            'marketing': 'Advertising',
            'ads': 'Advertising',
            'transport': 'Transportation',
            'transportation': 'Transportation',
            'fuel': 'Transportation',
            'logistics': 'Transportation',
            'utility': 'Utilities',
            'utilities': 'Utilities',
            'electricity': 'Utilities',
            'water': 'Utilities',
            'internet': 'Utilities',
            'phone': 'Utilities',
        };

        const totals = {
            'Salaries': 0,
            'Rent': 0,
            'Advertising': 0,
            'Transportation': 0,
            'Utilities': 0,
            'Other': 0,
        };

        for (const e of expenses) {
            const category = e.category ? e.category.toLowerCase() : '';
            let standardCategory = 'Other';

            for (const [key, value] of Object.entries(categoryMap)) {
                if (category.includes(key)) {
                    standardCategory = value;
                    break;
                }
            }

            totals[standardCategory] = (totals[standardCategory] || 0) + (e.amount || 0);
        }

        return totals;
    }

    _formatExpenseBreakdown(expenseTotals) {
        return Object.entries(expenseTotals)
            .filter(([_, amount]) => amount > 0)
            .map(([category, amount]) => ({ category, amount }));
    }
}

module.exports = ProfitLossService;