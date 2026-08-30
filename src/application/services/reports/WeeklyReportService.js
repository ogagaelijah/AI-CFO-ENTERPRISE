// src/application/services/reports/WeeklyReportService.js

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

/**
 * Weekly Report Service - Refactored to use canonical calculators
 * 
 * Trend analysis report
 * Shows week-over-week changes
 * 
 * All data flows through canonical calculators (single source of truth)
 */
class WeeklyReportService {
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

    _parseDate(dateStr) {
        if (!dateStr) return new Date();
        const parts = dateStr.split('T')[0].split('-');
        return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
            0, 0, 0, 0
        );
    }

    _formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    _getWeekStart(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return new Date(year, month, day - diff, 0, 0, 0, 0);
    }

    _getWeekEnd(weekStart) {
        const end = new Date(weekStart);
        end.setDate(weekStart.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return end;
    }

    async generate({ userId, businessId, date }) {
        const targetDate = date ? this._parseDate(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const currentWeekStart = this._getWeekStart(targetDate);
        const currentWeekEnd = this._getWeekEnd(currentWeekStart);
        const currentStartStr = this._formatDateStr(currentWeekStart);
        const currentEndStr = this._formatDateStr(currentWeekEnd);

        const prevWeekStart = new Date(currentWeekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = this._getWeekEnd(prevWeekStart);
        const prevStartStr = this._formatDateStr(prevWeekStart);
        const prevEndStr = this._formatDateStr(prevWeekEnd);

        // =============================================
        // CURRENT WEEK DATA (from calculators)
        // =============================================

        const currentRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: currentStartStr,
            endDate: currentEndStr,
        });

        const currentCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: currentStartStr,
            endDate: currentEndStr,
        });

        const currentProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: currentStartStr,
            endDate: currentEndStr,
            revenueData: { totalRevenue: currentRevenue.totalRevenue },
            cogsData: { totalCogs: currentCogs.totalCogs },
        });

        const [currentCash, currentAr, currentAp, currentInventory] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: currentStartStr, endDate: currentEndStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: currentEndStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: currentEndStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // =============================================
        // PREVIOUS WEEK DATA (from calculators)
        // =============================================

        const prevRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: prevStartStr,
            endDate: prevEndStr,
        });

        const prevCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: prevStartStr,
            endDate: prevEndStr,
        });

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevStartStr,
            endDate: prevEndStr,
            revenueData: { totalRevenue: prevRevenue.totalRevenue },
            cogsData: { totalCogs: prevCogs.totalCogs },
        });

        // =============================================
        // COMPARISONS
        // =============================================

        const revenueComparison = this.comparisonCalculator.compareValues(
            currentRevenue.totalRevenue || 0,
            prevRevenue.totalRevenue || 0,
            'Revenue'
        );

        const profitComparison = this.comparisonCalculator.compareValues(
            currentProfit.netProfit || 0,
            prevProfit.netProfit || 0,
            'Net Profit'
        );

        const marginComparison = this.comparisonCalculator.compareValues(
            currentProfit.grossMargin || 0,
            prevProfit.grossMargin || 0,
            'Gross Margin'
        );

        // =============================================
        // TOP PRODUCTS (using currentRevenue.sales from calculator)
        // =============================================

        const currentSales = this._safeArray(currentRevenue.sales);

        const productSales = {};
        for (const sale of currentSales) {
            const key = sale.item_name || 'Unknown';
            if (!productSales[key]) productSales[key] = 0;
            productSales[key] += this._safeNumber(sale.total_price);
        }

        const topProducts = Object.entries(productSales)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // =============================================
        // TOP CUSTOMERS (using currentRevenue.sales)
        // =============================================

        const customerSales = {};
        for (const sale of currentSales) {
            const key = sale.customer_name || 'Unknown';
            if (!customerSales[key]) customerSales[key] = 0;
            customerSales[key] += this._safeNumber(sale.total_price);
        }

        const topCustomers = Object.entries(customerSales)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // =============================================
        // EXPENSE DRIVERS
        // =============================================

        let currentExpenses = [];
        try {
            const result = await this.expenseRepository.findByDateRange(userId, currentStartStr, currentEndStr);
            currentExpenses = this._safeArray(result);
        } catch (e) { /* ignore */ }

        const expenseDrivers = {};
        for (const expense of currentExpenses) {
            const key = expense.category || 'Other';
            if (!expenseDrivers[key]) expenseDrivers[key] = 0;
            expenseDrivers[key] += this._safeNumber(expense.amount);
        }

        const topExpenses = Object.entries(expenseDrivers)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // =============================================
        // KEY RISKS & INSIGHTS
        // =============================================

        const keyRisks = [];
        const keyInsights = [];

        if (currentRevenue.totalRevenue === 0) {
            keyRisks.push('No revenue recorded this week');
        }

        if (currentProfit.netProfit < 0) {
            keyRisks.push('Business is operating at a loss this week');
        }

        if (currentAr.overdueAmount > 0) {
            keyRisks.push(`₦${currentAr.overdueAmount.toLocaleString()} in overdue receivables`);
        }

        if (currentInventory.lowStockCount > 0) {
            keyRisks.push(`${currentInventory.lowStockCount} items below reorder level`);
        }

        if (revenueComparison.percentageChange > 0) {
            keyInsights.push(`Revenue increased by ${revenueComparison.percentageChange.toFixed(1)}% week-over-week`);
        } else if (revenueComparison.percentageChange < 0) {
            keyInsights.push(`Revenue decreased by ${Math.abs(revenueComparison.percentageChange).toFixed(1)}% week-over-week`);
        }

        if (currentProfit.netProfit > 0) {
            keyInsights.push(`Net profit margin is ${currentProfit.netMargin.toFixed(1)}%`);
        }

        // =============================================
        // BUILD KEY TRANSACTIONS
        // =============================================

        let currentPurchases = [];
        let currentIncome = [];
        try {
            const result = await this.purchaseRepository.findByDateRange(userId, currentStartStr, currentEndStr);
            currentPurchases = this._safeArray(result);
        } catch (e) { /* ignore */ }

        try {
            const result = await this.incomeRepository.findByDateRange(userId, currentStartStr, currentEndStr);
            currentIncome = this._safeArray(result);
        } catch (e) { /* ignore */ }

        const keyTransactions = [
            ...currentSales.map(s => ({
                type: 'SALE',
                description: s.item_name || 'Sale',
                amount: this._safeNumber(s.total_price),
                date: s.sale_date || currentStartStr,
            })),
            ...currentIncome.map(i => ({
                type: 'INCOME',
                description: i.source || 'Income',
                amount: this._safeNumber(i.amount),
                date: i.created_at || currentStartStr,
            })),
            ...currentExpenses.map(e => ({
                type: 'EXPENSE',
                description: e.category || 'Expense',
                amount: this._safeNumber(e.amount),
                date: e.created_at || currentStartStr,
            })),
            ...currentPurchases.map(p => ({
                type: 'PURCHASE',
                description: p.item_name || 'Purchase',
                amount: this._safeNumber(p.total_cost),
                date: p.purchase_date || currentStartStr,
            })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        // =============================================
        // RETURN REPORT
        // =============================================

        return {
            period: {
                start: currentStartStr,
                end: currentEndStr,
            },
            revenue: currentRevenue.totalRevenue || 0,
            cogs: currentCogs.totalCogs || 0,
            grossProfit: currentProfit.grossProfit || 0,
            grossMargin: currentProfit.grossMargin || 0,
            expenses: currentProfit.totalExpenses || 0,
            netProfit: currentProfit.netProfit || 0,
            netMargin: currentProfit.netMargin || 0,
            purchases: currentPurchases.reduce((sum, p) => sum + this._safeNumber(p.total_cost), 0),
            otherRevenue: currentIncome.reduce((sum, i) => sum + this._safeNumber(i.amount), 0),
            weekOverWeek: {
                revenueChange: revenueComparison.percentageChange,
                profitChange: profitComparison.percentageChange,
                marginChange: marginComparison.percentageChange,
                previousWeek: {
                    revenue: prevRevenue.totalRevenue || 0,
                    grossProfit: prevProfit.grossProfit || 0,
                    netProfit: prevProfit.netProfit || 0,
                },
            },
            topProducts,
            topCustomers,
            topExpenses,
            inventory: {
                totalItems: currentInventory.totalItems || 0,
                totalValue: currentInventory.totalCostValue || 0,
                potentialProfit: currentInventory.totalPotentialProfit || 0,
                lowStockCount: currentInventory.lowStockCount || 0,
            },
            receivables: {
                totalOutstanding: currentAr.totalOutstanding || 0,
                activeCount: currentAr.activeCount || 0,
                overdueCount: currentAr.overdueCount || 0,
            },
            payables: {
                totalOutstanding: currentAp.totalOutstanding || 0,
                activeCount: currentAp.activeCount || 0,
                overdueCount: currentAp.overdueCount || 0,
            },
            keyRisks,
            keyInsights,
            transactions: keyTransactions,
        };
    }
}

module.exports = WeeklyReportService;