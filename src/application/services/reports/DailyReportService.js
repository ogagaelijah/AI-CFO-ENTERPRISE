// src/application/services/reports/DailyReportService.js

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

/**
 * Daily Report Service - Refactored to use canonical calculators
 *
 * Operational control report
 * Shows today's numbers vs yesterday
 *
 * All data flows through canonical calculators (single source of truth)
 */
class DailyReportService {
    constructor({
        saleRepository,
        purchaseRepository,
        expenseRepository,
        incomeRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        paymentRepository,
        revenueCalculator = null,
        cogsCalculator = null,
        profitCalculator = null,
        cashCalculator = null,
        arCalculator = null,
        apCalculator = null,
        inventoryCalculator = null,
        comparisonCalculator = null,
    }) {
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
        this.paymentRepository = paymentRepository;

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

        this.cashCalculator = cashCalculator || new CashCalculator({
            paymentRepository: this.paymentRepository,
        });

        this.arCalculator = arCalculator || new ARCalculator({
            debtorRepository: this.debtorRepository,
        });

        this.apCalculator = apCalculator || new APCalculator({
            creditorRepository: this.creditorRepository,
        });

        this.inventoryCalculator = inventoryCalculator || new InventoryCalculator({
            inventoryRepository: this.inventoryRepository,
        });

        this.comparisonCalculator = comparisonCalculator || new ComparisonCalculator();
    }

    _safeArray(result) {
        return Array.isArray(result) ? result : [];
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    async generate({ userId, businessId, date }) {
        const targetDate = date ? new Date(date) : new Date();
        const dateStr = targetDate.toISOString().split('T')[0];

        // Previous day
        const prevDate = new Date(targetDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        // =============================================
        // TODAY'S DATA
        // =============================================

        const todayRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
        });

        const todayCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
        });

        // Get expenses and other income safely
        let todayExpensesList = [];
        let todayIncomeList = [];

        try {
            const expensesResult = await this.expenseRepository.findByDateRange(userId, dateStr, dateStr);
            todayExpensesList = this._safeArray(expensesResult);
        } catch (e) { /* ignore */ }

        try {
            const incomeResult = await this.incomeRepository.findByDateRange(userId, dateStr, dateStr);
            todayIncomeList = this._safeArray(incomeResult);
        } catch (e) { /* ignore */ }

        const todayTotalExpenses = todayExpensesList.reduce((sum, e) => sum + this._safeNumber(e.amount), 0);
        const todayOtherIncome = todayIncomeList.reduce((sum, i) => sum + this._safeNumber(i.amount), 0);
        const todayPureSales = this._safeNumber(todayRevenue.totalRevenue);
        const todayCombinedRevenue = todayPureSales + todayOtherIncome;

        const todayProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
            revenueData: { totalRevenue: todayPureSales },
            cogsData: { totalCogs: todayCogs.totalCogs },
            expenseData: { total: todayTotalExpenses },
            incomeData: { total: todayOtherIncome },
        });

        const todayCash = await this.cashCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
        });

        const todayAr = await this.arCalculator.calculate({
            userId,
            businessId,
            asAtDate: dateStr,
        });

        const todayAp = await this.apCalculator.calculate({
            userId,
            businessId,
            asAtDate: dateStr,
        });

        // Inventory – include low-stock items list
        const todayInventory = await this.inventoryCalculator.calculate({
            userId,
            businessId,
            includeDetails: false,
            lowStockThreshold: 5,
        });

        // =============================================
        // YESTERDAY'S DATA
        // =============================================

        const prevRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: prevDateStr,
            endDate: prevDateStr,
        });

        const prevCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: prevDateStr,
            endDate: prevDateStr,
        });

        let prevExpensesList = [];
        let prevIncomeList = [];

        try {
            const expensesResult = await this.expenseRepository.findByDateRange(userId, prevDateStr, prevDateStr);
            prevExpensesList = this._safeArray(expensesResult);
        } catch (e) { /* ignore */ }

        try {
            const incomeResult = await this.incomeRepository.findByDateRange(userId, prevDateStr, prevDateStr);
            prevIncomeList = this._safeArray(incomeResult);
        } catch (e) { /* ignore */ }

        const prevTotalExpenses = prevExpensesList.reduce((sum, e) => sum + this._safeNumber(e.amount), 0);
        const prevOtherIncome = prevIncomeList.reduce((sum, i) => sum + this._safeNumber(i.amount), 0);
        const prevPureSales = this._safeNumber(prevRevenue.totalRevenue);
        const prevCombinedRevenue = prevPureSales + prevOtherIncome;

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevDateStr,
            endDate: prevDateStr,
            revenueData: { totalRevenue: prevPureSales },
            cogsData: { totalCogs: prevCogs.totalCogs },
            expenseData: { total: prevTotalExpenses },
            incomeData: { total: prevOtherIncome },
        });

        // =============================================
        // COMPARE TODAY VS YESTERDAY (using combined revenue)
        // =============================================

        const revenueComparison = this.comparisonCalculator.compareValues(
            todayCombinedRevenue,
            prevCombinedRevenue,
            'Revenue'
        );

        const profitComparison = this.comparisonCalculator.compareValues(
            todayProfit.netProfit || 0,
            prevProfit.netProfit || 0,
            'Net Profit'
        );

        // =============================================
        // TODAY'S TRANSACTIONS
        // =============================================

        let todaySales = [];
        let todayPurchases = [];

        try {
            const salesResult = await this.saleRepository.findByDateRange(userId, dateStr, dateStr);
            todaySales = this._safeArray(salesResult);
        } catch (e) { /* ignore */ }

        try {
            const purchasesResult = await this.purchaseRepository.findByDateRange(userId, dateStr, dateStr);
            todayPurchases = this._safeArray(purchasesResult);
        } catch (e) { /* ignore */ }

        const keyTransactions = [
            ...todaySales.map(s => ({
                type: 'SALE',
                description: s.item_name || 'Sale',
                amount: this._safeNumber(s.total_price),
                date: s.sale_date || dateStr,
            })),
            ...todayIncomeList.map(i => ({
                type: 'INCOME',
                description: i.source || 'Income',
                amount: this._safeNumber(i.amount),
                date: i.created_at || dateStr,
            })),
            ...todayExpensesList.map(e => ({
                type: 'EXPENSE',
                description: e.category || 'Expense',
                amount: this._safeNumber(e.amount),
                date: e.created_at || dateStr,
            })),
            ...todayPurchases.map(p => ({
                type: 'PURCHASE',
                description: p.item_name || 'Purchase',
                amount: this._safeNumber(p.total_cost),
                date: p.purchase_date || dateStr,
            })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        const todayPurchasesTotal = todayPurchases.reduce(
            (sum, p) => sum + this._safeNumber(p.total_cost),
            0
        );

        // =============================================
        // RETURN REPORT
        // =============================================

        return {
            date: dateStr,
            previousDate: prevDateStr,
            today: {
                // ✅ Now includes Other Income (consistent with Weekly)
                revenue: todayCombinedRevenue,
                cogs: todayCogs.totalCogs || 0,
                grossProfit: todayProfit.grossProfit || 0,
                grossMargin: todayProfit.grossMargin || 0,
                expenses: todayTotalExpenses,
                netProfit: todayProfit.netProfit || 0,
                netMargin: todayProfit.netMargin || 0,
                purchases: todayPurchasesTotal,
                income: todayOtherIncome,
                cash: {
                    opening: todayCash.openingCash || 0,
                    closing: todayCash.closingCash || 0,
                },
                receivables: {
                    outstanding: todayAr.totalOutstanding || 0,
                    overdue: todayAr.overdueAmount || 0,
                },
                payables: {
                    outstanding: todayAp.totalOutstanding || 0,
                    overdue: todayAp.overdueAmount || 0,
                },
                inventory: {
                    totalItems: todayInventory.totalItems || 0,
                    totalValue: todayInventory.totalCostValue || 0,
                    lowStockCount: todayInventory.lowStockCount || 0,
                    lowStockItems: todayInventory.lowStockItems || [],
                },
            },
            comparison: {
                revenueChange: revenueComparison.percentageChange,
                netProfitChange: profitComparison.percentageChange,
                revenueAbsoluteChange: revenueComparison.absoluteChange,
                netProfitAbsoluteChange: profitComparison.absoluteChange,
                previousDay: {
                    revenue: prevCombinedRevenue,
                    grossProfit: prevProfit.grossProfit || 0,
                    netProfit: prevProfit.netProfit || 0,
                    expenses: prevTotalExpenses,
                    purchases: 0,
                },
            },
            alerts: {
                lowStock: (todayInventory.lowStockCount || 0) > 0,
                overdueReceivables: (todayAr.overdueAmount || 0) > 0,
                negativeProfit: (todayProfit.netProfit || 0) < 0,
            },
            transactions: keyTransactions,
        };
    }
}

module.exports = DailyReportService;