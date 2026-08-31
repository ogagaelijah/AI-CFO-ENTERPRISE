// src/application/services/reports/calculators/ProfitCalculator.js

/**
 * ProfitCalculator - Single source of truth for profit calculations
 * 
 * Accounting Rules (per IFRS/IAS 1):
 * - Gross Profit = Revenue - COGS (Operating Revenue ONLY)
 * - Operating Profit = Gross Profit - Operating Expenses
 * - Net Profit = Operating Profit + Other Income - Other Expenses
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
        // Get operating revenue (product sales only)
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

        // Get operating expenses
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

        // Get other income (non-operating)
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
        const totalCogs = this._safeNumber(cogs.totalCogs);
        const totalExpenses = this._safeNumber(expenses.total);
        const totalOtherIncome = this._safeNumber(otherIncome.total);

        // ✅ Accounting Rule 1: Gross Profit = Revenue - COGS (Operating Revenue ONLY)
        const grossProfit = productRevenue - totalCogs;
        const grossMargin = productRevenue > 0 ? (grossProfit / productRevenue) * 100 : 0;

        // ✅ Accounting Rule 2: Operating Profit = Gross Profit - Operating Expenses
        const operatingProfit = grossProfit - totalExpenses;
        const operatingMargin = productRevenue > 0 ? (operatingProfit / productRevenue) * 100 : 0;

        // ✅ Accounting Rule 3: Net Profit = Operating Profit + Other Income - Other Expenses
        const netProfit = operatingProfit + totalOtherIncome;
        const netMargin = productRevenue > 0 ? (netProfit / productRevenue) * 100 : 0;

        return {
            revenue: productRevenue,
            cogs: totalCogs,
            grossProfit: grossProfit,
            grossMargin: grossMargin,
            operatingProfit: operatingProfit,
            operatingMargin: operatingMargin,
            netProfit: netProfit,
            netMargin: netMargin,
            expenses: totalExpenses,
            otherIncome: totalOtherIncome,
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