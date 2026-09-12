// src/application/services/reports/DailyReportService.js
// v2.1.0-prod — multi-tenant aware, single-arg debtor/creditor repos

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

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

        this.revenueCalculator = revenueCalculator || new RevenueCalculator({ saleRepository: this.saleRepository });
        this.cogsCalculator = cogsCalculator || new CogsCalculator({ saleRepository: this.saleRepository });
        this.profitCalculator = profitCalculator || new ProfitCalculator({
            saleRepository: this.saleRepository,
            expenseRepository: this.expenseRepository,
            incomeRepository: this.incomeRepository,
        });
        this.cashCalculator = cashCalculator || new CashCalculator({ paymentRepository: this.paymentRepository });
        this.arCalculator = arCalculator || new ARCalculator({ debtorRepository: this.debtorRepository });
        this.apCalculator = apCalculator || new APCalculator({ creditorRepository: this.creditorRepository });
        this.inventoryCalculator = inventoryCalculator || new InventoryCalculator({ inventoryRepository: this.inventoryRepository });
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
        if (!businessId) throw new Error('DailyReportService: businessId is required');

        const targetDate = date ? new Date(date) : new Date();
        const dateStr = targetDate.toISOString().split('T')[0];

        const prevDate = new Date(targetDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        // ===== TODAY =====
        const todayRevenue = await this.revenueCalculator.calculate({
            userId, businessId,
            startDate: dateStr, endDate: dateStr,
        });

        const todayCogs = await this.cogsCalculator.calculate({
            userId, businessId,
            startDate: dateStr, endDate: dateStr,
        });

        let todayExpensesList = [];
        let todayIncomeList = [];
        try {
            todayExpensesList = this._safeArray(
                await this.expenseRepository.findByDateRange(businessId, dateStr, dateStr)
            );
        } catch (e) { /* ignore */ }
        try {
            todayIncomeList = this._safeArray(
                await this.incomeRepository.findByDateRange(businessId, dateStr, dateStr)
            );
        } catch (e) { /* ignore */ }

        const todayTotalExpenses = todayExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const todayOtherIncome = todayIncomeList.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const todayPureSales = this._safeNumber(todayRevenue.totalRevenue);
        const todayCombinedRevenue = todayPureSales + todayOtherIncome;

        const todayProfit = await this.profitCalculator.calculate({
            userId, businessId,
            startDate: dateStr, endDate: dateStr,
            revenueData: { totalRevenue: todayPureSales },
            cogsData: { totalCogs: todayCogs.totalCogs },
            expenseData: { total: todayTotalExpenses },
            incomeData: { total: todayOtherIncome },
        });

        const todayCash = await this.cashCalculator.calculate({
            userId, businessId,
            startDate: dateStr, endDate: dateStr,
        });

        const todayAr = await this.arCalculator.calculate({
            userId, businessId, asAtDate: dateStr,
        });

        const todayAp = await this.apCalculator.calculate({
            userId, businessId, asAtDate: dateStr,
        });

        const todayInventory = await this.inventoryCalculator.calculate({
            userId, businessId,
            includeDetails: false,
            lowStockThreshold: 5,
        });

        // ===== DEBTORS & CREDITORS (single-arg repos) =====
        const activeDebtors = await this.debtorRepository.findActive(businessId);
        const debtorSummary = await this.debtorRepository.getSummary(businessId);

        const activeCreditors = await this.creditorRepository.findActive(businessId);
        const creditorSummary = await this.creditorRepository.getSummary(businessId);

        const debtorsData = {
            count: debtorSummary.active_count || 0,
            totalAmount: debtorSummary.total_outstanding || 0,
            top3: activeDebtors.slice(0, 3).map(d => ({
                name: d.customer_name || 'Unknown',
                amount: d.balance_remaining || 0,
            })),
        };

        const creditorsData = {
            count: creditorSummary.active_count || 0,
            totalAmount: creditorSummary.total_outstanding || 0,
            top3: activeCreditors.slice(0, 3).map(c => ({
                name: c.supplier_name || 'Unknown',
                amount: c.balance_remaining || 0,
            })),
        };

        // ===== YESTERDAY =====
        const prevRevenue = await this.revenueCalculator.calculate({
            userId, businessId,
            startDate: prevDateStr, endDate: prevDateStr,
        });

        const prevCogs = await this.cogsCalculator.calculate({
            userId, businessId,
            startDate: prevDateStr, endDate: prevDateStr,
        });

        let prevExpensesList = [];
        let prevIncomeList = [];
        try {
            prevExpensesList = this._safeArray(
                await this.expenseRepository.findByDateRange(businessId, prevDateStr, prevDateStr)
            );
        } catch (e) { /* ignore */ }
        try {
            prevIncomeList = this._safeArray(
                await this.incomeRepository.findByDateRange(businessId, prevDateStr, prevDateStr)
            );
        } catch (e) { /* ignore */ }

        const prevTotalExpenses = prevExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const prevOtherIncome = prevIncomeList.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const prevPureSales = this._safeNumber(prevRevenue.totalRevenue);
        const prevCombinedRevenue = prevPureSales + prevOtherIncome;

        const prevProfit = await this.profitCalculator.calculate({
            userId, businessId,
            startDate: prevDateStr, endDate: prevDateStr,
            revenueData: { totalRevenue: prevPureSales },
            cogsData: { totalCogs: prevCogs.totalCogs },
            expenseData: { total: prevTotalExpenses },
            incomeData: { total: prevOtherIncome },
        });

        // ===== COMPARISON =====
        const revenueComparison = this.comparisonCalculator.compareValues(
            todayCombinedRevenue, prevCombinedRevenue, 'Revenue'
        );
        const profitComparison = this.comparisonCalculator.compareValues(
            todayProfit.netProfit || 0, prevProfit.netProfit || 0, 'Net Profit'
        );

        // ===== TRANSACTIONS =====
        let todaySales = [];
        let todayPurchases = [];
        try {
            todaySales = this._safeArray(
                await this.saleRepository.findByDateRange(businessId, dateStr, dateStr)
            );
        } catch (e) { /* ignore */ }
        try {
            todayPurchases = this._safeArray(
                await this.purchaseRepository.findByDateRange(businessId, dateStr, dateStr)
            );
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
            (s, p) => s + this._safeNumber(p.total_cost), 0
        );

        return {
            date: dateStr,
            previousDate: prevDateStr,
            today: {
                revenue: todayCombinedRevenue,
                salesCount: todaySales.length,
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
            debtors: debtorsData,
            creditors: creditorsData,
        };
    }
}

module.exports = DailyReportService;