const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

/**
 * Executive Report Service
 *
 * Composite corporate report combining P&L indicators, cash track, and balance sheet metrics.
 * Follows proper real-world accounting standards: IFRS / GAAP
 * - Product Sales = Pure core operating top-line revenue
 * - Gross Profit = Product Sales - COGS
 * - Total Revenue (Combined Top-Line) = Product Sales + Other Income
 * - Net Profit = Gross Profit - Operating Expenses + Other Income
 * - Gross Margin = Gross Profit / Product Sales
 * - Net Margin = Net Profit / Total Revenue <-- Business Standard
 */
class ExecutiveReportService {
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

    async generate({ userId, businessId, startDate, endDate }) {
        const start = startDate
            ? this._parseDate(startDate)
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? this._parseDate(endDate) : new Date();

        const startStr = this._formatDateStr(start);
        const endStr = this._formatDateStr(end);

        // 1. Fetch core calculators in parallel
        const [revenueData, cogsData] = await Promise.all([
            this.revenueCalculator.calculate({
                userId,
                businessId,
                startDate: startStr,
                endDate: endStr,
            }),
            this.cogsCalculator.calculate({
                userId,
                businessId,
                startDate: startStr,
                endDate: endStr,
            }),
        ]);

        // 2. Synchronous repository calls (better-sqlite3 is sync)
        const expenses = this._safeArray(
            this.expenseRepository.findByDateRange(userId, startStr, endStr)
        );
        const income = this._safeArray(
            this.incomeRepository.findByDateRange(userId, startStr, endStr)
        );

        const totalOperatingExpenses = expenses.reduce(
            (sum, e) => sum + this._safeNumber(e.amount),
            0
        );
        const totalOtherIncome = income.reduce(
            (sum, i) => sum + this._safeNumber(i.amount),
            0
        );

        const pureProductRevenue = this._safeNumber(revenueData.totalRevenue);
        const totalCogs = this._safeNumber(cogsData.totalCogs);

        // 3. Profit calculation (single source of truth)
        const profitData = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: startStr,
            endDate: endStr,
            revenueData: { totalRevenue: pureProductRevenue },
            cogsData: { totalCogs },
            expenseData: { total: totalOperatingExpenses },
            incomeData: { total: totalOtherIncome },
        });

        // 4. Supporting metrics in parallel
        const [cashData, arData, apData, inventoryData] = await Promise.all([
            this.cashCalculator.calculate({
                userId,
                businessId,
                startDate: startStr,
                endDate: endStr,
            }),
            this.arCalculator.calculate({
                userId,
                businessId,
                asAtDate: endStr,
            }),
            this.apCalculator.calculate({
                userId,
                businessId,
                asAtDate: endStr,
            }),
            this.inventoryCalculator.calculate({
                userId,
                businessId,
                includeDetails: false,
                lowStockThreshold: 5,
            }),
        ]);

        // 5. Top products & customers
        const sales = this._safeArray(revenueData.sales);
        const uniqueCustomerSet = new Set();
        const productSales = {};
        const customerSales = {};

        for (const sale of sales) {
            const productKey = sale.item_name || 'Unknown';
            productSales[productKey] = (productSales[productKey] || 0) + this._safeNumber(sale.total_price);

            const customerKey = sale.customer_name || 'Unknown';
            customerSales[customerKey] = (customerSales[customerKey] || 0) + this._safeNumber(sale.total_price);

            if (sale.customer_name) {
                uniqueCustomerSet.add(sale.customer_name);
            }
        }

        const topProducts = Object.entries(productSales)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const topCustomers = Object.entries(customerSales)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // 6. Top expense categories
        const expenseDrivers = {};
        for (const expense of expenses) {
            const key = expense.category || 'Other';
            expenseDrivers[key] = (expenseDrivers[key] || 0) + this._safeNumber(expense.amount);
        }

        const topExpenses = Object.entries(expenseDrivers)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // 7. Core accounting calculations (IFRS / GAAP aligned)
        const grossProfit = pureProductRevenue - totalCogs;
        const netProfit = grossProfit - totalOperatingExpenses + totalOtherIncome;
        const combinedRevenueBase = pureProductRevenue + totalOtherIncome;

        const grossMargin = pureProductRevenue > 0
            ? (grossProfit / pureProductRevenue) * 100
            : 0;

        const netMargin = combinedRevenueBase > 0
            ? (netProfit / combinedRevenueBase) * 100
            : 0;

        const expenseRatio = pureProductRevenue > 0
            ? (totalOperatingExpenses / pureProductRevenue) * 100
            : 0;

        // 8. Final structured response
        return {
            period: {
                start: startStr,
                end: endStr,
            },
            executiveSummary: {
                revenue: this._round2(combinedRevenueBase),
                grossProfit: this._round2(grossProfit),
                grossMargin: this._round2(grossMargin),
                netProfit: this._round2(netProfit),
                netMargin: this._round2(netMargin),
                expenses: this._round2(totalOperatingExpenses),
                cash: this._safeNumber(cashData.closingCash),
                receivables: this._safeNumber(arData.totalOutstanding),
                payables: this._safeNumber(apData.totalOutstanding),
                inventory: this._safeNumber(inventoryData.totalCostValue),
            },
            kpiDashboard: {
                revenue: this._round2(combinedRevenueBase),
                grossProfit: this._round2(grossProfit),
                netProfit: this._round2(netProfit),
                totalSales: sales.length,
                uniqueCustomers: uniqueCustomerSet.size,
            },
            revenuePerformance: {
                topProducts,
                topCustomers,
            },
            expenseAnalysis: {
                total: this._round2(totalOperatingExpenses),
                topExpenses,
            },
            cashFlow: {
                opening: this._safeNumber(cashData.openingCash),
                closing: this._safeNumber(cashData.closingCash),
            },
            receivables: {
                totalOutstanding: this._safeNumber(arData.totalOutstanding),
            },
            payables: {
                totalOutstanding: this._safeNumber(apData.totalOutstanding),
            },
            inventory: {
                totalItems: this._safeNumber(inventoryData.totalItems),
                totalValue: this._safeNumber(inventoryData.totalCostValue),
            },
            financialRatios: {
                grossMargin: this._round2(grossMargin),
                netMargin: this._round2(netMargin),
                expenseRatio: this._round2(expenseRatio),
            },
            // Permanent API contract fields
            risks: [],
            insights: [],
            recommendations: [],
            managementActionPlan: [],
        };
    }
}

module.exports = ExecutiveReportService;