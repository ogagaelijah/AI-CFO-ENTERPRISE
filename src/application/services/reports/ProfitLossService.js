// src/application/services/reports/ProfitLossService.js

/**
 * Profit & Loss Service
 * Generates accrual-based P&L reports
 */
class ProfitLossService {
    constructor({
        saleRepository,
        purchaseRepository,
        expenseRepository,
        incomeRepository,
    }) {
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
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
        // 1. Get Sales (Product Revenue)
        const sales = await this.saleRepository.findByDateRange(
            userId,
            startDate,
            endDate
        );

        // 2. Get Income (Other Revenue)
        const incomes = await this.incomeRepository.findByDateRange(
            userId,
            startDate,
            endDate
        );

        // 3. Get Expenses
        const expenses = await this.expenseRepository.findByDateRange(
            userId,
            startDate,
            endDate
        );

        // =============================================
        // REVENUE
        // =============================================
        // Product Sales - use total_price from sales
        const totalProductSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);

        // Other Revenue (from income table)
        const totalOtherRevenue = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

        // Total Revenue = Product Sales + Other Revenue (ONLY ONCE)
        const totalRevenue = totalProductSales + totalOtherRevenue;

        // =============================================
        // COST OF GOODS SOLD
        // =============================================
        // COGS is already stored on sale items (historical unit cost)
        const totalCogs = sales.reduce((sum, s) => {
            const cogs = s.cogs || (s.unit_cost || 0) * (s.quantity || 0) || 0;
            return sum + cogs;
        }, 0);

        // =============================================
        // GROSS PROFIT
        // =============================================
        const grossProfit = totalRevenue - totalCogs;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // =============================================
        // OPERATING EXPENSES
        // =============================================
        // Aggregate expenses by category
        const expenseTotals = {
            'Salaries': 0,
            'Rent': 0,
            'Advertising': 0,
            'Transportation': 0,
            'Utilities': 0,
            'Other': 0,
        };

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

        const expenseBreakdown = [];

        for (const e of expenses) {
            const category = e.category ? e.category.toLowerCase() : '';
            let standardCategory = 'Other';
            
            for (const [key, value] of Object.entries(categoryMap)) {
                if (category.includes(key)) {
                    standardCategory = value;
                    break;
                }
            }
            
            expenseBreakdown.push({
                id: e.id,
                originalCategory: e.category || 'Uncategorized',
                category: standardCategory,
                amount: e.amount || 0,
                description: e.description,
                date: e.created_at,
            });

            if (expenseTotals[standardCategory] !== undefined) {
                expenseTotals[standardCategory] += e.amount || 0;
            } else {
                expenseTotals['Other'] += e.amount || 0;
            }
        }

        const totalOperatingExpenses = Object.values(expenseTotals).reduce((sum, v) => sum + v, 0);

        // =============================================
        // OPERATING PROFIT
        // =============================================
        const operatingProfit = grossProfit - totalOperatingExpenses;
        const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

        // =============================================
        // NET PROFIT
        // =============================================
        // ✅ FIX: Net Profit = Operating Profit (other income already in totalRevenue)
        const netProfit = operatingProfit;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

        // =============================================
        // RETURN FULL REPORT
        // =============================================
        return {
            period: periodLabel,
            startDate,
            endDate,
            revenue: {
                productSales: totalProductSales,
                otherRevenue: totalOtherRevenue,
                totalRevenue: totalRevenue,
            },
            cogs: {
                total: totalCogs,
            },
            grossProfit: {
                amount: grossProfit,
                margin: grossMargin,
            },
            operatingExpenses: {
                salaries: expenseTotals['Salaries'],
                rent: expenseTotals['Rent'],
                advertising: expenseTotals['Advertising'],
                transportation: expenseTotals['Transportation'],
                utilities: expenseTotals['Utilities'],
                other: expenseTotals['Other'],
                total: totalOperatingExpenses,
            },
            operatingProfit: {
                amount: operatingProfit,
                margin: operatingMargin,
            },
            otherIncome: 0,
            otherExpenses: 0,
            netProfit: {
                amount: netProfit,
                margin: netMargin,
            },
        };
    }

    /**
     * Generate P&L with period comparison
     */
    async generateWithComparison(params) {
        const current = await this.generate(params);

        // Calculate previous period
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

        const profitChange = previous.netProfit.amount > 0
            ? ((current.netProfit.amount - previous.netProfit.amount) / previous.netProfit.amount) * 100
            : 0;

        const marginChange = current.grossProfit.margin - previous.grossProfit.margin;

        return {
            ...current,
            comparison: {
                revenueChange,
                profitChange,
                marginChange,
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
}

module.exports = ProfitLossService;