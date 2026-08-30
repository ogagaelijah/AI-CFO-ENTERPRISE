// src/application/services/reports/YearlyReportService.js

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

/**
 * Yearly Report Service - Refactored to use canonical calculators
 * 
 * Strategic analysis report
 * Shows YoY comparisons, Balance Sheet, Strategic Insights
 * 
 * All data flows through canonical calculators (single source of truth)
 */
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
        return Array.isArray(result) ? result : [];
    }

    /**
     * Safely get number
     */
    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Parse date string to local Date
     */
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

    /**
     * Format date to YYYY-MM-DD
     */
    _formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async generate({ userId, businessId, date }) {
        const targetDate = date ? this._parseDate(date) : new Date();
        const year = targetDate.getFullYear();

        // Current year
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        const yearStartStr = this._formatDateStr(yearStart);
        const yearEndStr = this._formatDateStr(yearEnd);

        // Previous year
        const prevYear = year - 1;
        const prevYearStart = new Date(prevYear, 0, 1);
        const prevYearEnd = new Date(prevYear, 11, 31);
        const prevYearStartStr = this._formatDateStr(prevYearStart);
        const prevYearEndStr = this._formatDateStr(prevYearEnd);

        // =============================================
        // CURRENT YEAR DATA
        // =============================================

        const currentRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: yearStartStr,
            endDate: yearEndStr,
        });

        const currentCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: yearStartStr,
            endDate: yearEndStr,
        });

        const currentProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: yearStartStr,
            endDate: yearEndStr,
            revenueData: { totalRevenue: currentRevenue.totalRevenue },
            cogsData: { totalCogs: currentCogs.totalCogs },
        });

        const [currentCash, currentAr, currentAp, currentInventory] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: yearStartStr, endDate: yearEndStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: yearEndStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: yearEndStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // =============================================
        // PREVIOUS YEAR DATA
        // =============================================

        const prevRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: prevYearStartStr,
            endDate: prevYearEndStr,
        });

        const prevCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: prevYearStartStr,
            endDate: prevYearEndStr,
        });

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevYearStartStr,
            endDate: prevYearEndStr,
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
        // PERMANENT FIX: Calculate netMargin using productRevenue
        // =============================================
        const productRevenue = currentRevenue.totalRevenue || 0;
        const netProfit = currentProfit.netProfit || 0;
        const netMargin = productRevenue > 0 ? (netProfit / productRevenue) * 100 : 0;

        // =============================================
        // FINANCIAL RATIOS
        // =============================================

        const ratios = {
            grossMargin: currentProfit.grossMargin || 0,
            netMargin: netMargin,
            expenseRatio: productRevenue > 0 ? (currentProfit.totalExpenses / productRevenue) * 100 : 0,
        };

        // =============================================
        // MAJOR RISKS & OPPORTUNITIES
        // =============================================

        const majorRisks = [];
        const majorOpportunities = [];

        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange < 0) {
            majorRisks.push(`Revenue declined by ${Math.abs(revenueComparison.percentageChange).toFixed(1)}% year-over-year.`);
        }

        if (currentAr.overdueAmount > 0) {
            majorRisks.push(`Significant overdue receivables: ₦${currentAr.overdueAmount.toLocaleString()}.`);
        }

        if (currentInventory.lowStockCount > 0) {
            majorRisks.push(`${currentInventory.lowStockCount} items below reorder level.`);
        }

        if (currentProfit.netProfit < 0) {
            majorRisks.push('Business is operating at a loss for the year.');
        }

        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange > 0) {
            majorOpportunities.push(`Revenue grew by ${revenueComparison.percentageChange.toFixed(1)}% year-over-year.`);
        }

        if (currentProfit.netProfit > 0) {
            majorOpportunities.push('Business is profitable with a positive net margin.');
        }

        if (currentProfit.grossMargin > 50) {
            majorOpportunities.push(`Strong gross margin of ${currentProfit.grossMargin.toFixed(1)}% — good pricing power.`);
        }

        // =============================================
        // STRATEGIC INSIGHTS
        // =============================================

        const strategicInsights = [
            `Revenue ${revenueComparison.percentageChange !== null && revenueComparison.percentageChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueComparison.percentageChange !== null ? revenueComparison.percentageChange : 0).toFixed(1)}% year-over-year.`,
            `Net profit margin is ${netMargin.toFixed(1)}%.`,
        ];

        // =============================================
        // RECOMMENDATIONS
        // =============================================

        const recommendations = [];
        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange < 0) {
            recommendations.push('Review business strategy to reverse revenue decline.');
        }
        if (currentAr.overdueAmount > 0) {
            recommendations.push('Implement stricter credit policies for customers.');
        }
        if (currentInventory.lowStockCount > 0) {
            recommendations.push('Optimize inventory reorder levels to prevent stockouts.');
        }
        if (netMargin < 10 && netMargin > 0) {
            recommendations.push('Review expense structure to improve net margin.');
        }

        // =============================================
        // GET TOP PRODUCTS
        // =============================================

        let currentSales = this._safeArray(currentRevenue.sales);

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
        // TOP CUSTOMERS
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
        // TOP EXPENSES
        // =============================================

        let currentExpenses = [];
        try {
            const result = await this.expenseRepository.findByDateRange(userId, yearStartStr, yearEndStr);
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
        // RETURN REPORT
        // =============================================

        return {
            year,
            period: {
                start: yearStartStr,
                end: yearEndStr,
            },
            executiveSummary: {
                totalRevenue: productRevenue,
                netProfit: netProfit,
                netMargin: netMargin,
                revenueChange: revenueComparison.percentageChange,
                profitChange: profitComparison.percentageChange,
            },
            annualKpiDashboard: {
                revenue: productRevenue,
                cogs: currentCogs.totalCogs || 0,
                grossProfit: currentProfit.grossProfit || 0,
                grossMargin: currentProfit.grossMargin || 0,
                expenses: currentProfit.totalExpenses || 0,
                netProfit: netProfit,
                netMargin: netMargin,
            },
            annualPl: {
                revenue: {
                    productSales: productRevenue,
                    otherRevenue: 0,
                    totalRevenue: productRevenue,
                },
                cogs: {
                    total: currentCogs.totalCogs || 0,
                },
                grossProfit: {
                    amount: currentProfit.grossProfit || 0,
                    margin: currentProfit.grossMargin || 0,
                },
                operatingExpenses: {
                    total: currentProfit.totalExpenses || 0,
                    topExpenses,
                },
                netProfit: {
                    amount: netProfit,
                    margin: netMargin,
                },
            },
            cashFlow: {
                opening: currentCash.openingCash || 0,
                closing: currentCash.closingCash || 0,
            },
            balanceSheet: {
                cash: currentCash.closingCash || 0,
                receivables: currentAr.totalOutstanding || 0,
                inventory: currentInventory.totalCostValue || 0,
                payables: currentAp.totalOutstanding || 0,
            },
            trends: {
                revenue: {
                    currentYear: productRevenue,
                    previousYear: prevRevenue.totalRevenue || 0,
                    change: revenueComparison.percentageChange,
                },
                profit: {
                    currentYear: netProfit,
                    previousYear: prevProfit.netProfit || 0,
                    change: profitComparison.percentageChange,
                },
                margin: {
                    currentYear: currentProfit.grossMargin || 0,
                    previousYear: prevProfit.grossMargin || 0,
                    change: marginComparison.absoluteChange,
                },
            },
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
                overdueAmount: currentAr.overdueAmount || 0,
            },
            payables: {
                totalOutstanding: currentAp.totalOutstanding || 0,
                activeCount: currentAp.activeCount || 0,
                overdueCount: currentAp.overdueCount || 0,
                overdueAmount: currentAp.overdueAmount || 0,
            },
            financialRatios: ratios,
            yearOverYear: {
                revenueChange: revenueComparison.percentageChange,
                profitChange: profitComparison.percentageChange,
                marginChange: marginComparison.percentageChange,
                previousYear: {
                    revenue: prevRevenue.totalRevenue || 0,
                    grossProfit: prevProfit.grossProfit || 0,
                    netProfit: prevProfit.netProfit || 0,
                },
            },
            majorRisks,
            majorOpportunities,
            strategicInsights,
            recommendations,
            topProducts,
            topCustomers,
            topExpenses,
        };
    }
}

module.exports = YearlyReportService;