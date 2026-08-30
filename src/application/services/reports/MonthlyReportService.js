// src/application/services/reports/MonthlyReportService.js

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

/**
 * Monthly Report Service - Refactored to use canonical calculators
 * 
 * Management analysis report
 * Shows MoM trends, YTD, KPIs, Risks, AI Insights
 * 
 * All data flows through canonical calculators (single source of truth)
 */
class MonthlyReportService {
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

    _getLastDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    async generate({ userId, businessId, date }) {
        const targetDate = date ? this._parseDate(date) : new Date();
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const monthName = targetDate.toLocaleString('default', { month: 'long' });

        const monthStart = new Date(year, month, 1);
        const monthEnd = this._getLastDayOfMonth(monthStart);
        const monthStartStr = this._formatDateStr(monthStart);
        const monthEndStr = this._formatDateStr(monthEnd);

        const prevMonthStart = new Date(year, month - 1, 1);
        const prevMonthEnd = this._getLastDayOfMonth(prevMonthStart);
        const prevMonthStartStr = this._formatDateStr(prevMonthStart);
        const prevMonthEndStr = this._formatDateStr(prevMonthEnd);

        const ytdStart = new Date(year, 0, 1);
        const ytdStartStr = this._formatDateStr(ytdStart);

        // =============================================
        // CURRENT MONTH DATA
        // =============================================

        const currentRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: monthStartStr,
            endDate: monthEndStr,
        });

        const currentCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: monthStartStr,
            endDate: monthEndStr,
        });

        const currentProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: monthStartStr,
            endDate: monthEndStr,
            revenueData: { totalRevenue: currentRevenue.totalRevenue },
            cogsData: { totalCogs: currentCogs.totalCogs },
        });

        const [currentCash, currentAr, currentAp, currentInventory] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: monthStartStr, endDate: monthEndStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: monthEndStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: monthEndStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // =============================================
        // PREVIOUS MONTH DATA
        // =============================================

        const prevRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: prevMonthStartStr,
            endDate: prevMonthEndStr,
        });

        const prevCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: prevMonthStartStr,
            endDate: prevMonthEndStr,
        });

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevMonthStartStr,
            endDate: prevMonthEndStr,
            revenueData: { totalRevenue: prevRevenue.totalRevenue },
            cogsData: { totalCogs: prevCogs.totalCogs },
        });

        // =============================================
        // YEAR-TO-DATE DATA
        // =============================================

        const ytdRevenue = await this.revenueCalculator.calculate({
            userId,
            businessId,
            startDate: ytdStartStr,
            endDate: monthEndStr,
        });

        const ytdCogs = await this.cogsCalculator.calculate({
            userId,
            businessId,
            startDate: ytdStartStr,
            endDate: monthEndStr,
        });

        // ✅ PERMANENT FIX: Pass revenueData and cogsData to YTD profit calculation
        const ytdProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: ytdStartStr,
            endDate: monthEndStr,
            revenueData: { totalRevenue: ytdRevenue.totalRevenue },
            cogsData: { totalCogs: ytdCogs.totalCogs },
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
        // RISKS
        // =============================================

        const risks = [];
        if (currentAr.overdueAmount > 0) {
            risks.push({
                type: 'High Risk',
                description: `Significant overdue receivables: ₦${currentAr.overdueAmount.toLocaleString()}`,
            });
        }
        if (currentInventory.lowStockCount > 0) {
            risks.push({
                type: 'Medium Risk',
                description: `${currentInventory.lowStockCount} items are below reorder level`,
            });
        }
        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange < -10) {
            risks.push({
                type: 'High Risk',
                description: `Revenue declined ${Math.abs(revenueComparison.percentageChange).toFixed(1)}% month-over-month`,
            });
        }
        if (currentProfit.netProfit < 0) {
            risks.push({
                type: 'High Risk',
                description: 'Business is operating at a loss this month',
            });
        }

        // =============================================
        // AI INSIGHTS
        // =============================================

        const insights = [];
        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange > 0) {
            insights.push(`Revenue increased by ${revenueComparison.percentageChange.toFixed(1)}% compared to previous month.`);
        } else if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange < 0) {
            insights.push(`Revenue decreased by ${Math.abs(revenueComparison.percentageChange).toFixed(1)}% compared to previous month.`);
        }

        if (currentProfit.netProfit > 0) {
            insights.push(`Business is profitable with a net margin of ${netMargin.toFixed(1)}%.`);
        } else if (currentProfit.netProfit < 0) {
            insights.push(`Business is operating at a loss. Review expenses and pricing.`);
        }

        if (currentInventory.lowStockCount > 0) {
            insights.push(`${currentInventory.lowStockCount} items are below reorder level.`);
        }

        // =============================================
        // RECOMMENDATIONS
        // =============================================

        const recommendations = [];
        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange < 0) {
            recommendations.push('Review marketing and sales strategy to increase revenue.');
        }
        if (currentAr.overdueAmount > 0) {
            recommendations.push('Follow up on overdue receivables.');
        }
        if (currentInventory.lowStockCount > 0) {
            recommendations.push('Reorder low stock items to prevent stockouts.');
        }
        if (netMargin < 10 && netMargin > 0) {
            recommendations.push('Review expense categories to improve net margin.');
        }

        // =============================================
        // GET TRANSACTIONS
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

        let currentExpenses = [];
        try {
            const result = await this.expenseRepository.findByDateRange(userId, monthStartStr, monthEndStr);
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
            month: monthName,
            year,
            period: {
                start: monthStartStr,
                end: monthEndStr,
            },
            executiveSummary: {
                totalRevenue: productRevenue,
                netProfit: netProfit,
                netMargin: netMargin,
                revenueChange: revenueComparison.percentageChange,
                profitChange: profitComparison.percentageChange,
            },
            kpiDashboard: {
                revenue: productRevenue,
                cogs: currentCogs.totalCogs || 0,
                grossProfit: currentProfit.grossProfit || 0,
                grossMargin: currentProfit.grossMargin || 0,
                expenses: currentProfit.totalExpenses || 0,
                netProfit: netProfit,
                netMargin: netMargin,
                ytdRevenue: ytdRevenue.totalRevenue || 0,
                ytdNetProfit: ytdProfit.netProfit || 0,
            },
            revenuePerformance: {
                productSales: productRevenue,
                otherRevenue: 0,
                totalRevenue: productRevenue,
                monthOverMonth: {
                    revenueChange: revenueComparison.percentageChange,
                    profitChange: profitComparison.percentageChange,
                },
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
            cashFlow: {
                opening: currentCash.openingCash || 0,
                closing: currentCash.closingCash || 0,
            },
            accountsReceivable: {
                totalOutstanding: currentAr.totalOutstanding || 0,
                activeCount: currentAr.activeCount || 0,
                overdueCount: currentAr.overdueCount || 0,
                overdueAmount: currentAr.overdueAmount || 0,
            },
            accountsPayable: {
                totalOutstanding: currentAp.totalOutstanding || 0,
                activeCount: currentAp.activeCount || 0,
                overdueCount: currentAp.overdueCount || 0,
                overdueAmount: currentAp.overdueAmount || 0,
            },
            inventory: {
                totalItems: currentInventory.totalItems || 0,
                totalValue: currentInventory.totalCostValue || 0,
                potentialProfit: currentInventory.totalPotentialProfit || 0,
                lowStockCount: currentInventory.lowStockCount || 0,
            },
            financialRatios: ratios,
            monthOverMonth: {
                revenueChange: revenueComparison.percentageChange,
                profitChange: profitComparison.percentageChange,
                previousMonth: {
                    revenue: prevRevenue.totalRevenue || 0,
                    grossProfit: prevProfit.grossProfit || 0,
                    netProfit: prevProfit.netProfit || 0,
                },
            },
            yearToDate: {
                revenue: ytdRevenue.totalRevenue || 0,
                netProfit: ytdProfit.netProfit || 0,
            },
            risks,
            aiInsights: insights,
            recommendations,
            topProducts,
            topCustomers,
            topExpenses,
        };
    }
}

module.exports = MonthlyReportService;