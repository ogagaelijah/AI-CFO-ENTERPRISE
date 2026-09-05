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
 * Yearly Report Service - Strategic annual perspective
 * 
 * Provides annual performance summary with YoY comparisons,
 * strategic insights, major risks, and opportunities.
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

        let currentExpensesList = [];
        let currentIncomeList = [];

        try {
            const result = await this.expenseRepository.findByDateRange(userId, currentStartStr, currentEndStr);
            currentExpensesList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        try {
            const result = await this.incomeRepository.findByDateRange(userId, currentStartStr, currentEndStr);
            currentIncomeList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        const currentTotalExpenses = currentExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const currentOtherIncome = currentIncomeList.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const currentPureSales = this._safeNumber(currentRevenue.totalRevenue);
        const currentCombinedRevenue = currentPureSales + currentOtherIncome;

        const currentProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: currentStartStr,
            endDate: currentEndStr,
            revenueData: { totalRevenue: currentPureSales },
            cogsData: { totalCogs: currentCogs.totalCogs },
            expenseData: { total: currentTotalExpenses },
            incomeData: { total: currentOtherIncome },
        });

        const [currentCash, currentAr, currentAp, currentInventory] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: currentStartStr, endDate: currentEndStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: currentEndStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: currentEndStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // =============================================
        // PREVIOUS YEAR DATA (for YoY comparison)
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

        let prevExpensesList = [];
        let prevIncomeList = [];

        try {
            const result = await this.expenseRepository.findByDateRange(userId, prevStartStr, prevEndStr);
            prevExpensesList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        try {
            const result = await this.incomeRepository.findByDateRange(userId, prevStartStr, prevEndStr);
            prevIncomeList = this._safeArray(result);
        } catch (e) { /* ignore */ }

        const prevTotalExpenses = prevExpensesList.reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const prevOtherIncome = prevIncomeList.reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const prevPureSales = this._safeNumber(prevRevenue.totalRevenue);
        const prevCombinedRevenue = prevPureSales + prevOtherIncome;

        const prevProfit = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: prevStartStr,
            endDate: prevEndStr,
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

        // Check if previous year has data
        const hasPriorYearData = prevCombinedRevenue > 0 || prevProfit.netProfit !== 0;

        let revenueChange = 0;
        let revenueAbsoluteChange = 0;
        let profitChange = 0;
        let profitAbsoluteChange = 0;

        if (hasPriorYearData) {
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

            revenueChange = revenueComparison.percentageChange || 0;
            revenueAbsoluteChange = revenueComparison.absoluteChange || 0;
            profitChange = profitComparison.percentageChange || 0;
            profitAbsoluteChange = profitComparison.absoluteChange || 0;
        }

        // =============================================
        // CURRENT YEAR SALES FOR ANALYSIS
        // =============================================

        const currentSales = this._safeArray(currentRevenue.sales);

        // =============================================
        // PROFESSIONAL STRATEGIC INSIGHTS
        // =============================================

        const strategicInsights = [];

        if (hasPriorYearData && revenueChange > 5) {
            strategicInsights.push(`Revenue grew ${revenueChange.toFixed(1)}% year-over-year, indicating healthy business growth and market demand. This momentum should be sustained through continued customer acquisition and retention strategies.`);
        } else if (hasPriorYearData && revenueChange > 0 && revenueChange <= 5) {
            strategicInsights.push(`Revenue grew ${revenueChange.toFixed(1)}% year-over-year. While positive, the growth rate suggests opportunity for accelerated expansion through targeted marketing and sales initiatives.`);
        } else if (hasPriorYearData && revenueChange < 0) {
            strategicInsights.push(`Revenue declined ${Math.abs(revenueChange).toFixed(1)}% year-over-year. This trend requires strategic review of market positioning, competitive landscape, and sales effectiveness.`);
        } else if (!hasPriorYearData) {
            strategicInsights.push(`This is the first year of tracked data for ${year}. Establishing baseline performance metrics will enable meaningful year-over-year comparisons in future periods.`);
        }

        if (netProfit > 0 && netMargin > 20) {
            strategicInsights.push(`Net profit margin of ${this._round2(netMargin)}% demonstrates strong operational efficiency and healthy profitability. Consider reinvesting in growth initiatives to maximize returns.`);
        } else if (netProfit > 0 && netMargin > 10) {
            strategicInsights.push(`Net profit margin of ${this._round2(netMargin)}% indicates solid profitability. Focus on optimizing costs to improve margins and increase shareholder value.`);
        } else if (netProfit > 0 && netMargin <= 10) {
            strategicInsights.push(`Net profit margin of ${this._round2(netMargin)}% is thin. Strategic focus on cost optimization and revenue growth is recommended to strengthen profitability.`);
        } else if (netProfit < 0) {
            strategicInsights.push(`The business is currently unprofitable with a net loss of ₦${Math.abs(netProfit).toLocaleString()}. Strategic restructuring, expense reduction, and revenue enhancement initiatives are critical.`);
        }

        if (currentInventory.lowStockCount > 0) {
            strategicInsights.push(`${currentInventory.lowStockCount} inventory items are below reorder level. Implementing optimized inventory management practices will improve operational efficiency and customer satisfaction.`);
        }

        if (currentAr.overdueAmount > 0) {
            strategicInsights.push(`Overdue receivables of ₦${currentAr.overdueAmount.toLocaleString()} represent tied-up working capital. Strengthening collections processes will improve cash flow and financial flexibility.`);
        }

        if (currentTotalExpenses > currentPureSales * 0.4 && currentPureSales > 0) {
            strategicInsights.push(`Operating expenses represent ${this._round2((currentTotalExpenses / currentPureSales) * 100)}% of revenue. Strategic cost optimization could significantly improve profitability.`);
        }

        // =============================================
        // PROFESSIONAL MAJOR RISKS
        // =============================================

        const majorRisks = [];

        if (hasPriorYearData && revenueChange < -5) {
            majorRisks.push(`Revenue declined ${Math.abs(revenueChange).toFixed(1)}% year-over-year. This sustained decline may indicate market share erosion, competitive pressure, or changing customer preferences requiring strategic intervention.`);
        }

        if (netProfit < 0) {
            majorRisks.push(`The business is operating at a net loss of ₦${Math.abs(netProfit).toLocaleString()}. Without corrective action, this trajectory may threaten business sustainability and operational continuity.`);
        }

        if (currentAr.overdueAmount > 0) {
            majorRisks.push(`Significant overdue receivables of ₦${currentAr.overdueAmount.toLocaleString()} pose a liquidity risk. These funds represent tied-up capital that could otherwise support business operations and growth.`);
        }

        if (currentInventory.lowStockCount > 0) {
            majorRisks.push(`${currentInventory.lowStockCount} inventory items below reorder level present a potential revenue risk. Stockouts may result in lost sales, customer dissatisfaction, and competitive disadvantage.`);
        }

        if (netMargin > 0 && netMargin < 5) {
            majorRisks.push(`Net margin of ${this._round2(netMargin)}% is below sustainable thresholds. Profitability erosion may limit future investment capacity and business resilience.`);
        }

        if (currentTotalExpenses > currentPureSales * 0.6 && currentPureSales > 0) {
            majorRisks.push(`Operating expenses (${this._round2((currentTotalExpenses / currentPureSales) * 100)}% of revenue) are elevated. Expense management is critical to maintaining profitability and operational sustainability.`);
        }

        // =============================================
        // PROFESSIONAL MAJOR OPPORTUNITIES
        // =============================================

        const majorOpportunities = [];

        if (hasPriorYearData && revenueChange > 0) {
            majorOpportunities.push(`Revenue growth of ${revenueChange.toFixed(1)}% indicates positive market demand. Leverage this momentum through expanded marketing, product development, and customer acquisition strategies.`);
        }

        if (!hasPriorYearData) {
            majorOpportunities.push(`As this is the first year of tracked data, establish robust reporting and analytics to enable data-driven decision-making and performance optimization going forward.`);
        }

        if (netProfit > 0 && netMargin > 15) {
            majorOpportunities.push(`Strong net margin of ${this._round2(netMargin)}% provides financial capacity for strategic investments in growth, innovation, and market expansion.`);
        }

        if (currentInventory.lowStockCount === 0 && currentInventory.totalItems > 0) {
            majorOpportunities.push(`Inventory levels are well-maintained with no low-stock items. This operational efficiency positions the business well for consistent customer satisfaction and revenue generation.`);
        }

        if (currentAr.overdueAmount === 0 && currentAr.totalOutstanding > 0) {
            majorOpportunities.push(`All receivables are current with no overdue amounts. This disciplined collections approach strengthens cash flow and financial stability.`);
        }

        if (currentSales.length > 0) {
            const avgTransactionValue = currentCombinedRevenue / currentSales.length;
            if (avgTransactionValue > 10000) {
                majorOpportunities.push(`High average transaction value of ₦${Math.round(avgTransactionValue).toLocaleString()} suggests strong customer purchasing power. Focus on upselling and cross-selling to maximize revenue per customer.`);
            }
        }

        if (netProfit > 0) {
            majorOpportunities.push(`Sustained profitability provides a foundation for strategic growth. Consider reinvesting profits into areas with highest growth potential and operational improvement.`);
        }

        // =============================================
        // RETURN REPORT
        // =============================================

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
            majorRisks,
            majorOpportunities,
            strategicInsights,
        };
    }
}

module.exports = YearlyReportService;