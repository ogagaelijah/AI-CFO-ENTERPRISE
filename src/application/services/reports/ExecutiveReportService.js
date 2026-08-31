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
        return Array.isArray(result)? result : [];
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num)? 0 : num;
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
        const start = startDate? this._parseDate(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate? this._parseDate(endDate) : new Date();
        const startStr = this._formatDateStr(start);
        const endStr = this._formatDateStr(end);

        // 1. Parallel collection for high performance pipeline execution
        const [revenueData, cogsData, expenses, income] = await Promise.all([
            this.revenueCalculator.calculate({ userId, businessId, startDate: startStr, endDate: endStr }),
            this.cogsCalculator.calculate({ userId, businessId, startDate: startStr, endDate: endStr }),
            this.expenseRepository.findByDateRange(userId, startStr, endStr).catch(() => []),
            this.incomeRepository.findByDateRange(userId, startStr, endStr).catch(() => [])
        ]);

        const totalOperatingExpenses = this._safeArray(expenses).reduce((s, e) => s + this._safeNumber(e.amount), 0);
        const totalOtherIncome = this._safeArray(income).reduce((s, i) => s + this._safeNumber(i.amount), 0);
        const pureProductRevenue = this._safeNumber(revenueData.totalRevenue);
        const totalCogs = this._safeNumber(cogsData.totalCogs);

        // Calculate single source of truth analytics objects
        const profitData = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: startStr,
            endDate: endStr,
            revenueData: { totalRevenue: pureProductRevenue },
            cogsData: { totalCogs: totalCogs },
            expenseData: { total: totalOperatingExpenses },
            incomeData: { total: totalOtherIncome },
        });

        const [cashData, arData, apData, inventoryData] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: startStr, endDate: endStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: endStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: endStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // 2. Compute Top Operational Items
        const sales = this._safeArray(revenueData.sales);
        const uniqueCustomerSet = new Set();
        const productSales = {};

        for (const sale of sales) {
            const key = sale.item_name || 'Unknown';
            if (!productSales[key]) productSales[key] = 0;
            productSales[key] += this._safeNumber(sale.total_price);
            if (sale.customer_name) uniqueCustomerSet.add(sale.customer_name);
        }

        const topProducts = Object.entries(productSales)
           .map(([name, amount]) => ({ name, amount }))
           .sort((a, b) => b.amount - a.amount)
           .slice(0, 5);

        const customerSales = {};
        for (const sale of sales) {
            const key = sale.customer_name || 'Unknown';
            if (!customerSales[key]) customerSales[key] = 0;
            customerSales[key] += this._safeNumber(sale.total_price);
        }

        const topCustomers = Object.entries(customerSales)
           .map(([name, amount]) => ({ name, amount }))
           .sort((a, b) => b.amount - a.amount)
           .slice(0, 5);

        // 3. Aggregate Top Expenses
        const expenseDrivers = {};
        for (const expense of this._safeArray(expenses)) {
            const key = expense.category || 'Other';
            if (!expenseDrivers[key]) expenseDrivers[key] = 0;
            expenseDrivers[key] += this._safeNumber(expense.amount);
        }

        const topExpenses = Object.entries(expenseDrivers)
           .map(([category, amount]) => ({ category, amount }))
           .sort((a, b) => b.amount - a.amount)
           .slice(0, 5);

        // 4. Clean Business Accounting Formulation Engine - SSOT
        const grossProfit = pureProductRevenue - totalCogs;
        const netProfit = grossProfit - totalOperatingExpenses + totalOtherIncome;
        const combinedRevenueBase = pureProductRevenue + totalOtherIncome; // Total Revenue per IFRS

        const grossMargin = pureProductRevenue > 0? (grossProfit / pureProductRevenue) * 100 : 0;
        const netMargin = combinedRevenueBase > 0? (netProfit / combinedRevenueBase) * 100 : 0; // Business Standard
        const expenseRatio = pureProductRevenue > 0? (totalOperatingExpenses / pureProductRevenue) * 100 : 0;

        return {
            period: { start: startStr, end: endStr },
            executiveSummary: {
                revenue: combinedRevenueBase,
                grossProfit,
                grossMargin: this._round2(grossMargin),
                netProfit,
                netMargin: this._round2(netMargin), // Now 50.82
                expenses: totalOperatingExpenses,
                cash: this._safeNumber(cashData.closingCash),
                receivables: this._safeNumber(arData.totalOutstanding),
                payables: this._safeNumber(apData.totalOutstanding),
                inventory: this._safeNumber(inventoryData.totalCostValue),
            },
            kpiDashboard: {
                revenue: combinedRevenueBase,
                grossProfit,
                netProfit,
                totalSales: sales.length,
                uniqueCustomers: uniqueCustomerSet.size,
            },
            revenuePerformance: {
                topProducts,
                topCustomers,
            },
            expenseAnalysis: {
                total: totalOperatingExpenses,
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
                netMargin: this._round2(netMargin), // Now 50.82
                expenseRatio: this._round2(expenseRatio)
            },
            risks: [],
            insights: [], // Permanent API contract
            recommendations: [], // Permanent API contract
            managementActionPlan: [], // Permanent API contract
        };
    }
}

module.exports = ExecutiveReportService;