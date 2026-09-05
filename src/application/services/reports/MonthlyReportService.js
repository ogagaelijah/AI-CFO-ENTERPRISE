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

    _round2(value) {
        return Math.round((value || 0) * 100) / 100;
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

        // Get expenses & other income
        let currentExpensesList = [];
        let currentIncomeList = [];

        try {
            const result = await this.expenseRepository.findByDateRange(userId, monthStartStr, monthEndStr);
            currentExpensesList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        try {
            const result = await this.incomeRepository.findByDateRange(userId, monthStartStr, monthEndStr);
            currentIncomeList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        const currentTotalExpenses = currentExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const currentOtherIncome = currentIncomeList.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const currentPureSales = this._safeNumber(currentRevenue.totalRevenue);
        const currentCombinedRevenue = currentPureSales + currentOtherIncome;

        const currentProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: monthStartStr,
            endDate: monthEndStr,
            revenueData: { totalRevenue: currentPureSales },
            cogsData: { totalCogs: currentCogs.totalCogs },
            expenseData: { total: currentTotalExpenses },
            incomeData: { total: currentOtherIncome },
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

        let prevExpensesList = [];
        let prevIncomeList = [];

        try {
            const result = await this.expenseRepository.findByDateRange(userId, prevMonthStartStr, prevMonthEndStr);
            prevExpensesList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        try {
            const result = await this.incomeRepository.findByDateRange(userId, prevMonthStartStr, prevMonthEndStr);
            prevIncomeList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        const prevTotalExpenses = prevExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const prevOtherIncome = prevIncomeList.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const prevPureSales = this._safeNumber(prevRevenue.totalRevenue);
        const prevCombinedRevenue = prevPureSales + prevOtherIncome;

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevMonthStartStr,
            endDate: prevMonthEndStr,
            revenueData: { totalRevenue: prevPureSales },
            cogsData: { totalCogs: prevCogs.totalCogs },
            expenseData: { total: prevTotalExpenses },
            incomeData: { total: prevOtherIncome },
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

        let ytdExpensesList = [];
        let ytdIncomeList = [];

        try {
            const result = await this.expenseRepository.findByDateRange(userId, ytdStartStr, monthEndStr);
            ytdExpensesList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        try {
            const result = await this.incomeRepository.findByDateRange(userId, ytdStartStr, monthEndStr);
            ytdIncomeList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        const ytdTotalExpenses = ytdExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const ytdOtherIncome = ytdIncomeList.reduce((s, i) => s + this._safeNumber(i.amount), 0);

        const ytdProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: ytdStartStr,
            endDate: monthEndStr,
            revenueData: { totalRevenue: ytdRevenue.totalRevenue },
            cogsData: { totalCogs: ytdCogs.totalCogs },
            expenseData: { total: ytdTotalExpenses },
            incomeData: { total: ytdOtherIncome },
        });

        // =============================================
        // COMPARISONS (using combined revenue)
        // =============================================

        const revenueComparison = this.comparisonCalculator.compareValues(
            currentCombinedRevenue,
            prevCombinedRevenue,
            'Revenue'
        );

        const profitComparison = this.comparisonCalculator.compareValues(
            currentProfit.netProfit || 0,
            prevProfit.netProfit || 0,
            'Net Profit'
        );

        // =============================================
        // CALCULATIONS
        // =============================================

        const grossProfit = currentPureSales - this._safeNumber(currentCogs.totalCogs);
        const grossMargin = currentPureSales > 0 ? (grossProfit / currentPureSales) * 100 : 0;
        const netProfit = currentProfit.netProfit || 0;
        const netMargin = currentCombinedRevenue > 0 ? (netProfit / currentCombinedRevenue) * 100 : 0;

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

        // Top Expenses
        const expenseDrivers = {};
        for (const expense of currentExpensesList) {
            const key = expense.category || 'Other';
            if (!expenseDrivers[key]) expenseDrivers[key] = 0;
            expenseDrivers[key] += this._safeNumber(expense.amount);
        }

        const topExpenses = Object.entries(expenseDrivers)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // =============================================
        // PROFESSIONAL RISKS
        // =============================================

        const risks = [];

        if (currentAr.overdueAmount > 0) {
            risks.push({
                type: 'High Risk',
                description: `Overdue receivables of ₦${currentAr.overdueAmount.toLocaleString()} represent a significant cash-flow constraint. Recommend immediate collection action to preserve working capital.`,
            });
        }

        if (currentInventory.lowStockCount > 0) {
            risks.push({
                type: 'Medium Risk',
                description: `${currentInventory.lowStockCount} inventory items are below reorder threshold. This may lead to stockouts, lost sales, and customer dissatisfaction. Review replenishment schedules.`,
            });
        }

        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange < -10) {
            risks.push({
                type: 'High Risk',
                description: `Revenue declined ${Math.abs(revenueComparison.percentageChange).toFixed(1)}% month-over-month. This trend requires immediate investigation into market conditions, pricing strategy, and competitive positioning.`,
            });
        }

        if (netProfit < 0) {
            risks.push({
                type: 'High Risk',
                description: `The business is operating at a net loss of ₦${Math.abs(netProfit).toLocaleString()}. Without corrective action, this trend may erode cash reserves and threaten operational sustainability.`,
            });
        }

        if (currentTotalExpenses > currentPureSales * 0.5 && currentPureSales > 0) {
            risks.push({
                type: 'Medium Risk',
                description: `Operating expenses (${this._round2((currentTotalExpenses / currentPureSales) * 100)}% of revenue) are high relative to revenue. Review non-essential spending and identify cost-saving opportunities.`,
            });
        }

        if (currentAr.totalOutstanding > currentPureSales * 0.3 && currentPureSales > 0) {
            risks.push({
                type: 'Medium Risk',
                description: `Accounts receivable (${this._round2((currentAr.totalOutstanding / currentPureSales) * 100)}% of revenue) are elevated. Consider tightening credit terms or accelerating collection efforts.`,
            });
        }

        // =============================================
        // PROFESSIONAL AI INSIGHTS
        // =============================================

        const insights = [];

        if (revenueComparison.percentageChange !== null) {
            if (revenueComparison.percentageChange > 0) {
                insights.push(`Revenue grew ${revenueComparison.percentageChange.toFixed(1)}% month-over-month. This positive momentum should be sustained through targeted marketing and customer retention initiatives.`);
            } else if (revenueComparison.percentageChange < 0) {
                insights.push(`Revenue declined ${Math.abs(revenueComparison.percentageChange).toFixed(1)}% month-over-month. Analyze customer churn, sales effectiveness, and market trends to identify the root cause.`);
            }
        }

        if (netProfit > 0 && netMargin > 15) {
            insights.push(`The business demonstrates healthy profitability with a net margin of ${this._round2(netMargin)}%. Continue monitoring expense growth to protect this position.`);
        } else if (netProfit > 0 && netMargin > 5) {
            insights.push(`The business maintains positive profitability with a net margin of ${this._round2(netMargin)}%. Focus on margin improvement through cost optimization and value-based pricing.`);
        } else if (netProfit > 0 && netMargin <= 5) {
            insights.push(`Net margin of ${this._round2(netMargin)}% is thin. Review pricing, supplier costs, and operational efficiency to strengthen profitability.`);
        } else if (netProfit < 0) {
            insights.push(`The business is currently unprofitable. Immediate focus should be on expense reduction, revenue generation, and cash preservation.`);
        }

        if (currentInventory.lowStockCount > 0) {
            insights.push(`${currentInventory.lowStockCount} items are below reorder level. Prioritize replenishment to maintain customer satisfaction and avoid stockout-related revenue loss.`);
        }

        if (currentAr.overdueAmount > 0) {
            insights.push(`Overdue receivables of ₦${currentAr.overdueAmount.toLocaleString()} represent tied-up capital. Accelerating collections could improve liquidity without additional borrowing.`);
        }

        // =============================================
        // PROFESSIONAL RECOMMENDATIONS
        // =============================================

        const recommendations = [];

        if (revenueComparison.percentageChange !== null && revenueComparison.percentageChange < 0) {
            recommendations.push('Conduct a comprehensive revenue review. Analyze sales channels, customer segments, and product performance to identify growth opportunities and reverse the decline.');
        }

        if (currentAr.overdueAmount > 0) {
            recommendations.push('Implement a structured collections process. Contact overdue customers, offer payment plans where appropriate, and consider tightening credit policies to prevent future accumulation.');
        }

        if (currentInventory.lowStockCount > 0) {
            recommendations.push('Prioritize replenishment of low-stock items. Review reorder levels and supplier lead times to maintain optimal inventory levels and prevent customer dissatisfaction.');
        }

        if (netMargin < 10 && netProfit > 0) {
            recommendations.push('Review all expense categories for optimization opportunities. Identify non-essential spending, negotiate supplier contracts, and consider automation to reduce operational costs.');
        }

        if (netProfit < 0) {
            recommendations.push('Immediate cost rationalization is required. Review fixed and variable expenses, delay non-critical capital expenditures, and focus on cash preservation while exploring revenue-enhancing strategies.');
        }

        if (currentAr.totalOutstanding > currentPureSales * 0.3 && currentPureSales > 0) {
            recommendations.push('Review customer credit terms and payment behaviour. Consider discounts for early payment and stricter enforcement of payment deadlines to improve cash flow.');
        }

        if (currentTotalExpenses > currentPureSales * 0.6 && currentPureSales > 0) {
            recommendations.push('Expense ratio is elevated. Conduct a line-by-line expense review to identify cost-saving opportunities without compromising operational effectiveness.');
        }

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
            // Flat fields for easy frontend consumption
            revenue: currentCombinedRevenue,
            grossProfit: this._round2(grossProfit),
            grossMargin: this._round2(grossMargin),
            expenses: currentTotalExpenses,
            netProfit: this._round2(netProfit),
            netMargin: this._round2(netMargin),

            executiveSummary: {
                totalRevenue: currentCombinedRevenue,
                grossProfit: this._round2(grossProfit),
                grossMargin: this._round2(grossMargin),
                expenses: currentTotalExpenses,
                netProfit: this._round2(netProfit),
                netMargin: this._round2(netMargin),
                revenueChange: revenueComparison.percentageChange,
                profitChange: profitComparison.percentageChange,
                revenueAbsoluteChange: revenueComparison.absoluteChange,
                profitAbsoluteChange: profitComparison.absoluteChange,
            },
            kpiDashboard: {
                revenue: currentCombinedRevenue,
                cogs: currentCogs.totalCogs || 0,
                grossProfit: this._round2(grossProfit),
                grossMargin: this._round2(grossMargin),
                expenses: currentTotalExpenses,
                netProfit: this._round2(netProfit),
                netMargin: this._round2(netMargin),
                ytdRevenue: (ytdRevenue.totalRevenue || 0) + ytdOtherIncome,
                ytdNetProfit: ytdProfit.netProfit || 0,
                totalSales: currentSales.length,
                uniqueCustomers: new Set(currentSales.map(s => s.customer_name)).size,
            },
            monthOverMonth: {
                revenueChange: revenueComparison.percentageChange,
                profitChange: profitComparison.percentageChange,
                revenueAbsoluteChange: revenueComparison.absoluteChange,
                profitAbsoluteChange: profitComparison.absoluteChange,
                previousMonth: {
                    revenue: prevCombinedRevenue,
                    grossProfit: prevProfit.grossProfit || 0,
                    netProfit: prevProfit.netProfit || 0,
                },
            },
            yearToDate: {
                revenue: (ytdRevenue.totalRevenue || 0) + ytdOtherIncome,
                netProfit: ytdProfit.netProfit || 0,
            },
            inventory: {
                totalItems: currentInventory.totalItems || 0,
                totalValue: currentInventory.totalCostValue || 0,
                lowStockCount: currentInventory.lowStockCount || 0,
                lowStockItems: currentInventory.lowStockItems || [],
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