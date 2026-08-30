// src/application/services/reports/calculators/ProfitCalculator.js

/**
 * ProfitCalculator - Single source of truth for profit calculations
 * 
 * Calculates:
 * - Gross Profit (Revenue - COGS + Other Income)
 * - Gross Margin
 * - Net Profit (Gross Profit - Expenses)
 * - Net Margin
 * - Operating Profit
 * 
 * This is the SINGLE SOURCE OF TRUTH for all profit calculations.
 */
class ProfitCalculator {
    constructor({ saleRepository, expenseRepository, incomeRepository }) {
        this.saleRepository = saleRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result) ? result : [];
    }

    async calculate({
        userId,
        businessId,
        startDate,
        endDate,
        revenueData = null,
        cogsData = null,
        expenseData = null,
        incomeData = null,
    }) {
        // Get product revenue
        let revenue = revenueData;
        if (!revenue) {
            const RevenueCalculator = require('./RevenueCalculator');
            const revenueCalc = new RevenueCalculator({ saleRepository: this.saleRepository });
            revenue = await revenueCalc.calculate({ userId, businessId, startDate, endDate });
        }

        // Get COGS
        let cogs = cogsData;
        if (!cogs) {
            const CogsCalculator = require('./CogsCalculator');
            const cogsCalc = new CogsCalculator({ saleRepository: this.saleRepository });
            cogs = await cogsCalc.calculate({ userId, businessId, startDate, endDate });
        }

        // Get expenses
        let expenses = expenseData;
        if (!expenses) {
            let expensesData = [];
            try {
                const result = await this.expenseRepository.findByDateRange(userId, startDate, endDate);
                expensesData = this._safeArray(result);
            } catch (error) {
                console.warn('⚠️ ProfitCalculator: Could not fetch expenses:', error.message);
                expensesData = [];
            }
            expenses = {
                total: expensesData.reduce((sum, e) => sum + this._safeNumber(e.amount), 0),
                byCategory: this._groupByCategory(expensesData),
            };
        }

        // Get other income
        let otherIncome = incomeData;
        if (!otherIncome) {
            let incomeDataArray = [];
            try {
                const result = await this.incomeRepository.findByDateRange(userId, startDate, endDate);
                incomeDataArray = this._safeArray(result);
            } catch (error) {
                console.warn('⚠️ ProfitCalculator: Could not fetch income:', error.message);
                incomeDataArray = [];
            }
            otherIncome = {
                total: incomeDataArray.reduce((sum, i) => sum + this._safeNumber(i.amount), 0),
                bySource: this._groupBySource(incomeDataArray),
            };
        }

        const productRevenue = this._safeNumber(revenue.totalRevenue);
        const totalOtherIncome = this._safeNumber(otherIncome.total);
        const totalCogs = this._safeNumber(cogs.totalCogs);
        const totalExpenses = this._safeNumber(expenses.total);

        // ✅ Gross Profit = Product Revenue - COGS + Other Income
        const grossProfit = productRevenue - totalCogs + totalOtherIncome;
        const grossMargin = productRevenue > 0 ? (grossProfit / productRevenue) * 100 : 0;

        // ✅ Net Profit = Gross Profit - Expenses
        const netProfit = grossProfit - totalExpenses;
        const netMargin = productRevenue > 0 ? (netProfit / productRevenue) * 100 : 0;

        // ✅ Operating Profit = Gross Profit - Expenses
        const operatingProfit = grossProfit - totalExpenses;
        const operatingMargin = productRevenue > 0 ? (operatingProfit / productRevenue) * 100 : 0;

        // ✅ RETURN WITH KEYS THAT TESTS EXPECT
        return {
            revenue: productRevenue,
            cogs: totalCogs,
            grossProfit: grossProfit,
            grossMargin: grossMargin,
            netProfit: netProfit,
            netMargin: netMargin,
            operatingProfit: operatingProfit,
            operatingMargin: operatingMargin,
            expenses: totalExpenses,
            otherIncome: totalOtherIncome,
            // Additional keys for backward compatibility
            productRevenue: productRevenue,
            totalRevenue: productRevenue + totalOtherIncome,
            totalCogs: totalCogs,
            totalExpenses: totalExpenses,
            totalIncome: totalOtherIncome,
            expenseBreakdown: expenses.byCategory,
            otherIncomeBreakdown: otherIncome.bySource,
        };
    }

    _groupByCategory(expenses) {
        const categoryMap = {};
        for (const expense of expenses) {
            const key = expense.category || 'Other';
            if (!categoryMap[key]) categoryMap[key] = 0;
            categoryMap[key] += this._safeNumber(expense.amount);
        }
        return Object.entries(categoryMap)
            .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
            .sort((a, b) => b.amount - a.amount);
    }

    _groupBySource(incomes) {
        const sourceMap = {};
        for (const income of incomes) {
            const key = income.source || 'Other';
            if (!sourceMap[key]) sourceMap[key] = 0;
            sourceMap[key] += this._safeNumber(income.amount);
        }
        return Object.entries(sourceMap)
            .map(([source, amount]) => ({ source, amount: Number(amount.toFixed(2)) }))
            .sort((a, b) => b.amount - a.amount);
    }
}

module.exports = ProfitCalculator;