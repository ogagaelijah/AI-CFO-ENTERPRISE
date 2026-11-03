// src/application/services/reports/YearlyReportService.js
// v2.3.0-prod — Removes internal AR/AP and Risk calculations to enforce SSOT.
//               Data is sourced directly from repositories.

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

class YearlyReportService {
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
            incomeRepository: this.incomeRepository,
        });
        this.cogsCalculator = cogsCalculator || new CogsCalculator({ saleRepository: this.saleRepository });
        this.profitCalculator = profitCalculator || new ProfitCalculator({
            saleRepository: this.saleRepository,
            expenseRepository: this.expenseRepository,
            incomeRepository: this.incomeRepository,
        });
        this.cashCalculator = cashCalculator || new CashCalculator({ paymentRepository: this.paymentRepository });
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
        return Math.round((value || 0) * 100) / 100;
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

    async generate({ userId, businessId, date }) {
        const targetDate = date ? this._parseDate(date) : new Date();
        const year = targetDate.getFullYear();

        const currentYearStart = new Date(year, 0, 1);
        const currentYearEnd = new Date(year, 11, 31);
        const currentStartStr = this._formatDateStr(currentYearStart);
        const currentEndStr = this._formatDateStr(currentYearEnd);

        const prevYearStart = new Date(year - 1, 0, 1);
        const prevYearEnd = new Date(year - 1, 11, 31);
        const prevStartStr = this._formatDateStr(prevYearStart);
        const prevEndStr = this._formatDateStr(prevYearEnd);

        // =============================================
        // CURRENT YEAR DATA
        // =============================================

        const currentRevenue = await this.revenueCalculator.calculate({
            userId, businessId, startDate: currentStartStr, endDate: currentEndStr,
        });

        const currentCogs = await this.cogsCalculator.calculate({
            userId, businessId, startDate: currentStartStr, endDate: currentEndStr,
        });

        const currentExpensesList = this._safeArray(
            await this.expenseRepository.findByDateRange(businessId, currentStartStr, currentEndStr)
        );

        const currentTotalExpenses = currentExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const currentPureSales = this._safeNumber(currentRevenue.salesRevenue ?? currentRevenue.totalRevenue);
        const currentOtherIncome = this._safeNumber(currentRevenue.otherRevenue);
        const currentCombinedRevenue = currentPureSales + currentOtherIncome;

        const currentProfit = await this.profitCalculator.calculate({
            userId, businessId, startDate: currentStartStr, endDate: currentEndStr,
            revenueData: { totalRevenue: currentPureSales },
            cogsData: { totalCogs: currentCogs.totalCogs },
            expenseData: { total: currentTotalExpenses },
            incomeData: { total: currentOtherIncome },
        });

        const [currentCash, currentInventory] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: currentStartStr, endDate: currentEndStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // =============================================
        // DEBTORS & CREDITORS DATA
        // =============================================

        const activeDebtors = await this.debtorRepository.findActive(businessId);
        const debtorSummary = await this.debtorRepository.getSummary(businessId);

        const activeCreditors = await this.creditorRepository.findActive(businessId);
        const creditorSummary = await this.creditorRepository.getSummary(businessId);

        const debtorsData = {
            count: debtorSummary.active_count || 0,
            totalAmount: debtorSummary.total_outstanding || 0,
            top3: activeDebtors.slice(0, 3).map(d => ({
                name: d.customer_name || 'Unknown',
                amount: d.balance_remaining || 0
            }))
        };

        const creditorsData = {
            count: creditorSummary.active_count || 0,
            totalAmount: creditorSummary.total_outstanding || 0,
            top3: activeCreditors.slice(0, 3).map(c => ({
                name: c.supplier_name || 'Unknown',
                amount: c.balance_remaining || 0
            }))
        };

        // =============================================
        // TOP PRODUCTS & CUSTOMERS
        // =============================================

        const currentSales = this._safeArray(currentRevenue.sales);

        const productSalesMap = {};
        for (const sale of currentSales) {
            const key = sale.item_name || 'Unknown';
            if (!productSalesMap[key]) productSalesMap[key] = 0;
            productSalesMap[key] += this._safeNumber(sale.total_price);
        }

        const topProducts = Object.entries(productSalesMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const customerSalesMap = {};
        for (const sale of currentSales) {
            const key = sale.customer_name || 'Unknown';
            if (!customerSalesMap[key]) customerSalesMap[key] = 0;
            customerSalesMap[key] += this._safeNumber(sale.total_price);
        }

        const topCustomers = Object.entries(customerSalesMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // =============================================
        // PREVIOUS YEAR DATA
        // =============================================

        const prevRevenue = await this.revenueCalculator.calculate({
            userId, businessId, startDate: prevStartStr, endDate: prevEndStr,
        });

        const prevCogs = await this.cogsCalculator.calculate({
            userId, businessId, startDate: prevStartStr, endDate: prevEndStr,
        });

        const prevExpensesList = this._safeArray(
            await this.expenseRepository.findByDateRange(businessId, prevStartStr, prevEndStr)
        );

        const prevTotalExpenses = prevExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const prevPureSales = this._safeNumber(prevRevenue.salesRevenue ?? prevRevenue.totalRevenue);
        const prevOtherIncome = this._safeNumber(prevRevenue.otherRevenue);
        const prevCombinedRevenue = prevPureSales + prevOtherIncome;

        const prevProfit = await this.profitCalculator.calculate({
            userId, businessId, startDate: prevStartStr, endDate: prevEndStr,
            revenueData: { totalRevenue: prevPureSales },
            cogsData: { totalCogs: prevCogs.totalCogs },
            expenseData: { total: prevTotalExpenses },
            incomeData: { total: prevOtherIncome },
        });

        // =============================================
        // CALCULATIONS
        // =============================================

        const grossProfit = currentPureSales - this._safeNumber(currentCogs.totalCogs);
        const grossMargin = currentPureSales > 0 ? (grossProfit / currentPureSales) * 100 : 0;
        const netProfit = currentProfit.netProfit || 0;
        const netMargin = currentCombinedRevenue > 0 ? (netProfit / currentCombinedRevenue) * 100 : 0;

        // =============================================
        // YEAR-OVER-YEAR COMPARISONS
        // =============================================

        const hasPriorYearData = prevCombinedRevenue > 0 || prevProfit.netProfit !== 0;

        let revenueChange = 0;
        let revenueAbsoluteChange = 0;
        let profitChange = 0;
        let profitAbsoluteChange = 0;

        if (hasPriorYearData) {
            const revenueComparison = this.comparisonCalculator.compareValues(
                currentCombinedRevenue, prevCombinedRevenue, 'Revenue'
            );
            const profitComparison = this.comparisonCalculator.compareValues(
                currentProfit.netProfit || 0, prevProfit.netProfit || 0, 'Net Profit'
            );

            revenueChange = revenueComparison.percentageChange || 0;
            revenueAbsoluteChange = revenueComparison.absoluteChange || 0;
            profitChange = profitComparison.percentageChange || 0;
            profitAbsoluteChange = profitComparison.absoluteChange || 0;
        }

        return {
            year,
            period: {
                start: currentStartStr,
                end: currentEndStr,
            },
            revenue: currentCombinedRevenue,
            grossProfit: this._round2(grossProfit),
            grossMargin: this._round2(grossMargin),
            expenses: currentTotalExpenses,
            netProfit: this._round2(netProfit),
            netMargin: this._round2(netMargin),
            salesCount: currentSales.length,

            executiveSummary: {
                totalRevenue: currentCombinedRevenue,
                netProfit: this._round2(netProfit),
                netMargin: this._round2(netMargin),
            },
            annualKpiDashboard: {
                grossMargin: this._round2(grossMargin),
                netMargin: this._round2(netMargin),
                cogs: currentCogs.totalCogs || 0,
                expenses: currentTotalExpenses,
                grossProfit: this._round2(grossProfit),
            },
            yearOverYear: {
                revenueChange: revenueChange,
                profitChange: profitChange,
                revenueAbsoluteChange: revenueAbsoluteChange,
                profitAbsoluteChange: profitAbsoluteChange,
                hasPriorYearData: hasPriorYearData,
                previousYear: {
                    revenue: prevCombinedRevenue || 0,
                    netProfit: prevProfit.netProfit || 0,
                },
            },
            inventory: {
                totalItems: currentInventory.totalItems || 0,
                totalValue: currentInventory.totalCostValue || 0,
                lowStockCount: currentInventory.lowStockCount || 0,
            },
            topProducts,
            topCustomers,
            debtors: debtorsData,
            creditors: creditorsData,
        };
    }
}

module.exports = YearlyReportService;