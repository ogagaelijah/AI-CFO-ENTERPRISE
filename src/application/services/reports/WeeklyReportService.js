const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

/**
 * Weekly Report Service - Production Ready
 *
 * Provides trend analysis and week-over-week performance changes.
 * Follows real-world business accounting standards:
 * - Product Sales = Pure core operating top-line revenue baseline
 * - Gross Profit = Product Sales - COGS
 * - Total Revenue (Combined Top-Line) = Product Sales + Other Income
 * - Net Profit = Gross Profit - Operating Expenses + Other Income
 * - Week-over-Week Changes compare consistent combined top-lines
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

    _round2(value) {
        return Math.round(value * 100) / 100;
    }

    _parseDate(dateStr) {
        if (!dateStr) return new Date();
        const parts = dateStr.split('T')[0].split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
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
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
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
        // 1. CURRENT WEEK DATA ENGINE CALLS
        // =============================================
        const [currentRevenue, currentCogs] = await Promise.all([
            this.revenueCalculator.calculate({ userId, businessId, startDate: currentStartStr, endDate: currentEndStr }),
            this.cogsCalculator.calculate({ userId, businessId, startDate: currentStartStr, endDate: currentEndStr }),
        ]);

        // Safe repository calls
        let currentExpenses = [];
        let currentIncome = [];

        try {
            const expensesResult = await this.expenseRepository.findByDateRange(userId, currentStartStr, currentEndStr);
            currentExpenses = this._safeArray(expensesResult);
        } catch (e) { /* ignore */ }

        try {
            const incomeResult = await this.incomeRepository.findByDateRange(userId, currentStartStr, currentEndStr);
            currentIncome = this._safeArray(incomeResult);
        } catch (e) { /* ignore */ }

        const currentTotalExpenses = currentExpenses.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const currentTotalOtherIncome = currentIncome.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const currentPureRevenue = this._safeNumber(currentRevenue.totalRevenue);
        const currentTotalCogs = this._safeNumber(currentCogs.totalCogs);

        // SSOT Calculation Matrix Injection
        const currentProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: currentStartStr,
            endDate: currentEndStr,
            revenueData: { totalRevenue: currentPureRevenue },
            cogsData: { totalCogs: currentTotalCogs },
            expenseData: { total: currentTotalExpenses },
            incomeData: { total: currentTotalOtherIncome },
        });

        const [currentCash, currentAr, currentAp, currentInventory] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: currentStartStr, endDate: currentEndStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: currentEndStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: currentEndStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // =============================================
        // 2. HISTORICAL COMPARATIVE DATA WINDOW (PREVIOUS WEEK)
        // =============================================
        const [prevRevenue, prevCogs] = await Promise.all([
            this.revenueCalculator.calculate({ userId, businessId, startDate: prevStartStr, endDate: prevEndStr }),
            this.cogsCalculator.calculate({ userId, businessId, startDate: prevStartStr, endDate: prevEndStr }),
        ]);

        // Safe repository calls for previous week
        let prevExpenses = [];
        let prevIncome = [];

        try {
            const expensesResult = await this.expenseRepository.findByDateRange(userId, prevStartStr, prevEndStr);
            prevExpenses = this._safeArray(expensesResult);
        } catch (e) { /* ignore */ }

        try {
            const incomeResult = await this.incomeRepository.findByDateRange(userId, prevStartStr, prevEndStr);
            prevIncome = this._safeArray(incomeResult);
        } catch (e) { /* ignore */ }

        const prevTotalExpenses = prevExpenses.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const prevTotalOtherIncome = prevIncome.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const prevPureRevenue = this._safeNumber(prevRevenue.totalRevenue);
        const prevTotalCogs = this._safeNumber(prevCogs.totalCogs);

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevStartStr,
            endDate: prevEndStr,
            revenueData: { totalRevenue: prevPureRevenue },
            cogsData: { totalCogs: prevTotalCogs },
            expenseData: { total: prevTotalExpenses },
            incomeData: { total: prevTotalOtherIncome },
        });

        // =============================================
        // 3. OPERATIONAL DRIVERS (PRODUCTS, CUSTOMERS, OVERHEADS)
        // =============================================
        const sales = this._safeArray(currentRevenue.sales);

        const productSalesMap = {};
        for (const sale of sales) {
            const key = sale.item_name || 'Unknown';
            if (!productSalesMap[key]) productSalesMap[key] = 0;
            productSalesMap[key] += this._safeNumber(sale.total_price);
        }

        const topProducts = Object.entries(productSalesMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const customerSalesMap = {};
        for (const sale of sales) {
            const key = sale.customer_name || 'Unknown';
            if (!customerSalesMap[key]) customerSalesMap[key] = 0;
            customerSalesMap[key] += this._safeNumber(sale.total_price);
        }

        const topCustomers = Object.entries(customerSalesMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

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
        // 4. BUSINESS ACCOUNTING FORMULATIONS
        // =============================================
        const currentGrossProfit = currentPureRevenue - currentTotalCogs;
        const currentNetProfit = currentGrossProfit - currentTotalExpenses + currentTotalOtherIncome;
        const currentCombinedRevenue = currentPureRevenue + currentTotalOtherIncome;

        const prevGrossProfit = prevPureRevenue - prevTotalCogs;
        const prevNetProfit = prevGrossProfit - prevTotalExpenses + prevTotalOtherIncome;
        const prevCombinedRevenue = prevPureRevenue + prevTotalOtherIncome;

        const grossMargin = currentPureRevenue > 0 ? (currentGrossProfit / currentPureRevenue) * 100 : 0;
        const netMargin = currentCombinedRevenue > 0 ? (currentNetProfit / currentCombinedRevenue) * 100 : 0;

        // Week over Week (WoW) Analytics Engine Calculations
        const revenueChange = prevCombinedRevenue > 0
            ? ((currentCombinedRevenue - prevCombinedRevenue) / prevCombinedRevenue) * 100
            : 0;

        const profitChange = prevNetProfit !== 0
            ? ((currentNetProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100
            : 0;

        // =============================================
        // 5. DEFENSIVE ANOMALY RISK DISCOVERY RULES
        // =============================================
        const keyRisks = [];
        if (currentCombinedRevenue === 0) {
            keyRisks.push('No revenue recorded this week');
        }
        if (currentNetProfit < 0) {
            keyRisks.push('Business operates at a net loss this week');
        }
        if (this._safeNumber(currentAr.totalOutstanding) > currentCombinedRevenue * 0.5 && currentCombinedRevenue > 0) {
            keyRisks.push('High accounts receivable risk relative to recent sales velocity');
        }

        return {
            period: { start: currentStartStr, end: currentEndStr },
            revenue: currentCombinedRevenue,
            otherRevenue: currentTotalOtherIncome,
            cogs: currentTotalCogs,
            grossProfit: currentGrossProfit,
            grossMargin: this._round2(grossMargin),
            expenses: currentTotalExpenses,
            netProfit: currentNetProfit,
            netMargin: this._round2(netMargin),
            weekOverWeek: {
                revenueChange: this._round2(revenueChange),
                profitChange: this._round2(profitChange),
                previousWeek: {
                    revenue: prevCombinedRevenue,
                    grossProfit: prevGrossProfit,
                    netProfit: prevNetProfit
                }
            },
            topProducts,
            topCustomers,
            topExpenses,
            inventory: {
                totalItems: currentInventory.totalItems || 0,
                totalValue: currentInventory.totalCostValue || 0,
                lowStockCount: currentInventory.lowStockCount || 0,
                lowStockItems: currentInventory.lowStockItems || [],
            },
            transactions: sales,
            keyRisks
        };
    }
}

module.exports = WeeklyReportService;