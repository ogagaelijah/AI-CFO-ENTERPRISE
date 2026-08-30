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

        // Initialize calculators
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

    /**
     * Safely get array from repository result
     */
    _safeArray(result) {
        return Array.isArray(result)? result : [];
    }

    /**
     * Safely get number
     */
    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num)? 0 : num;
    }

    /**
     * Generate Daily Report
     */
    async generate({ userId, businessId, date }) {
        const targetDate = date? new Date(date) : new Date();
        const dateStr = targetDate.toISOString().split('T')[0];

        // Previous day
        const prevDate = new Date(targetDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        // =============================================
        // TODAY'S DATA (from calculators)
        // =============================================

        // 1. Revenue
        const todayRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
        });

        // 2. COGS
        const todayCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
        });

        // 3. Profit
        const todayProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
            revenueData: { totalRevenue: todayRevenue.totalRevenue },
            cogsData: { totalCogs: todayCogs.totalCogs },
        });

        // 4. Cash
        const todayCash = await this.cashCalculator.calculate({
            userId,
            businessId,
            startDate: dateStr,
            endDate: dateStr,
        });

        // 5. AR
        const todayAr = await this.arCalculator.calculate({
            userId,
            businessId,
            asAtDate: dateStr,
        });

        // 6. AP
        const todayAp = await this.apCalculator.calculate({
            userId,
            businessId,
            asAtDate: dateStr,
        });

        // 7. Inventory
        const todayInventory = await this.inventoryCalculator.calculate({
            userId,
            businessId,
            includeDetails: false,
            lowStockThreshold: 5,
        });

        // =============================================
        // YESTERDAY'S DATA (for comparison)
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

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevDateStr,
            endDate: prevDateStr,
            revenueData: { totalRevenue: prevRevenue.totalRevenue },
            cogsData: { totalCogs: prevCogs.totalCogs },
        });

        // =============================================
        // COMPARE TODAY VS YESTERDAY
        // =============================================

        const revenueComparison = this.comparisonCalculator.compareValues(
            todayRevenue.totalRevenue || 0,
            prevRevenue.totalRevenue || 0,
            'Revenue'
        );

        const profitComparison = this.comparisonCalculator.compareValues(
            todayProfit.netProfit || 0,
            prevProfit.netProfit || 0,
            'Net Profit'
        );

        // =============================================
        // GET TODAY'S TRANSACTIONS (with safety checks)
        // =============================================

        let todaySales = [];
        let todayPurchases = [];
        let todayExpenses = [];
        let todayIncome = [];

        try {
            const salesResult = await this.saleRepository.findByDateRange(userId, dateStr, dateStr);
            todaySales = this._safeArray(salesResult);
        } catch (e) { /* ignore */ }

        try {
            const purchasesResult = await this.purchaseRepository.findByDateRange(userId, dateStr, dateStr);
            todayPurchases = this._safeArray(purchasesResult);
        } catch (e) { /* ignore */ }

        try {
            const expensesResult = await this.expenseRepository.findByDateRange(userId, dateStr, dateStr);
            todayExpenses = this._safeArray(expensesResult);
        } catch (e) { /* ignore */ }

        try {
            const incomeResult = await this.incomeRepository.findByDateRange(userId, dateStr, dateStr);
            todayIncome = this._safeArray(incomeResult);
        } catch (e) { /* ignore */ }

        // =============================================
        // BUILD KEY TRANSACTIONS
        // =============================================

        const keyTransactions = [
           ...todaySales.map(s => ({
                type: 'SALE',
                description: s.item_name || 'Sale',
                amount: this._safeNumber(s.total_price),
                date: s.sale_date || dateStr,
            })),
           ...todayIncome.map(i => ({
                type: 'INCOME',
                description: i.source || 'Income',
                amount: this._safeNumber(i.amount),
                date: i.created_at || dateStr,
            })),
           ...todayExpenses.map(e => ({
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

        // =============================================
        // CALCULATE TOTALS
        // =============================================

        const todayPurchasesTotal = todayPurchases.reduce((sum, p) => sum + this._safeNumber(p.total_cost), 0);

        // =============================================
        // RETURN REPORT
        // =============================================

        return {
            date: dateStr,
            previousDate: prevDateStr,
            today: {
                revenue: todayRevenue.totalRevenue || 0,
                cogs: todayCogs.totalCogs || 0,
                grossProfit: todayProfit.grossProfit || 0,
                grossMargin: todayProfit.grossMargin || 0,
                expenses: todayProfit.totalExpenses || 0, // Fixed: was todayProfit.expenses
                netProfit: todayProfit.netProfit || 0,
                netMargin: todayProfit.netMargin || 0,
                purchases: todayPurchasesTotal,
                income: todayProfit.totalIncome || 0, // PERMANENT FIX: Use SSOT from ProfitCalculator
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
                },
            },
            comparison: {
                revenueChange: revenueComparison.percentageChange,
                netProfitChange: profitComparison.percentageChange,
                previousDay: {
                    revenue: prevRevenue.totalRevenue || 0,
                    grossProfit: prevProfit.grossProfit || 0,
                    netProfit: prevProfit.netProfit || 0,
                    expenses: prevProfit.totalExpenses || 0, // Fixed: was prevProfit.expenses
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