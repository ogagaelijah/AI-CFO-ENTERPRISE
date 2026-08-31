const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');

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

    async generate({
        userId,
        businessId,
        startDate,
        endDate,
        period = 'monthly',
    }) {
        // 1. Get core product revenue
        const revenueData = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate,
            endDate,
        });

        // 2. Get Cost of Goods Sold (COGS)
        const cogsData = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate,
            endDate,
        });

        // 3. Get non-operating other income
        const incomes = await this.incomeRepository.findByDateRange(
            userId,
            startDate,
            endDate
        );
        const totalOtherRevenue = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

        // 4. Get operating expenses
        const expenses = await this.expenseRepository.findByDateRange(
            userId,
            startDate,
            endDate
        );
        const expenseTotals = this._aggregateExpenses(expenses);
        const totalOperatingExpenses = Object.values(expenseTotals).reduce((sum, v) => sum + v, 0);

        const pureOperatingRevenue = revenueData.totalRevenue || 0;
        const totalCogs = cogsData.totalCogs || 0;

        // 5. ✅ PURE ACCOUNTING FORMULAS
        const grossProfit = pureOperatingRevenue - totalCogs;
        const operatingProfit = grossProfit - totalOperatingExpenses;
        const netProfit = operatingProfit + totalOtherRevenue;

        const combinedTotalRevenue = pureOperatingRevenue + totalOtherRevenue;

        // Margins based on the correct revenue baseline denominators
        const grossMargin = pureOperatingRevenue > 0 ? (grossProfit / pureOperatingRevenue) * 100 : 0;
        const operatingMargin = pureOperatingRevenue > 0 ? (operatingProfit / pureOperatingRevenue) * 100 : 0;
        const netMargin = combinedTotalRevenue > 0 ? (netProfit / combinedTotalRevenue) * 100 : 0;

        const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

        return {
            period: periodLabel,
            startDate,
            endDate,
            revenue: {
                productSales: pureOperatingRevenue,
                otherRevenue: totalOtherRevenue,
                totalRevenue: combinedTotalRevenue,
            },
            cogs: {
                total: totalCogs,
            },
            grossProfit: {
                amount: grossProfit,
                margin: grossMargin,
            },
            operatingExpenses: {
                salaries: expenseTotals['Salaries'] || 0,
                rent: expenseTotals['Rent'] || 0,
                advertising: expenseTotals['Advertising'] || 0,
                transportation: expenseTotals['Transportation'] || 0,
                utilities: expenseTotals['Utilities'] || 0,
                other: expenseTotals['Other'] || 0,
                total: totalOperatingExpenses,
            },
            operatingProfit: {
                amount: operatingProfit,
                margin: operatingMargin,
            },
            otherIncome: totalOtherRevenue,
            otherExpenses: 0,
            netProfit: {
                amount: netProfit,
                margin: netMargin,
            },
        };
    }

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

        // ✅ Fixed comparison baseline check
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
}

module.exports = ProfitLossService;
