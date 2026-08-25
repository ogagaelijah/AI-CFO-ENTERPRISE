// src/application/services/report/ReportGenerator.js
const ReportHelpers = require('./ReportHelpers');
const ReportFormulas = require('./ReportFormulas');

class ReportGenerator {
    constructor(repositories) {
        this.saleRepo = repositories.saleRepository;
        this.incomeRepo = repositories.incomeRepository;
        this.expenseRepo = repositories.expenseRepository;
        this.purchaseRepo = repositories.purchaseRepository;
        this.debtorRepo = repositories.debtorRepository;
        this.creditorRepo = repositories.creditorRepository;
        this.inventoryRepo = repositories.inventoryRepository;
        this.customerRepo = repositories.customerRepository;
    }

    async generate(userId, startDate, endDate, options = {}) {
        const startStr = ReportHelpers.formatDate(startDate);
        const endStr = ReportHelpers.formatDate(endDate);

        const [sales, incomes, expenses, purchases, debtors, creditors, inventory] = await Promise.all([
            this.saleRepo.findByDateRange(userId, startStr, endStr),
            this.incomeRepo.findByDateRange(userId, startStr, endStr),
            this.expenseRepo.findByDateRange(userId, startStr, endStr),
            this.purchaseRepo.findByDateRange(userId, startStr, endStr),
            this.debtorRepo.findActiveByUser(userId),
            this.creditorRepo.findActiveByUser(userId),
            this.inventoryRepo.findByUserId(userId),
        ]);

        const totalSales = ReportHelpers.sumArray(sales, 'total_price');
        const totalIncome = ReportHelpers.sumArray(incomes, 'amount');
        const totalPurchases = ReportHelpers.sumArray(purchases, 'total_price');
        const totalExpenses = ReportHelpers.sumArray(expenses, 'amount');
        const totalCogs = ReportHelpers.sumArray(sales, 'cogs');

        const profitability = ReportFormulas.calculateMargins(totalSales, totalCogs, totalExpenses, totalIncome);
        const productAgg = ReportHelpers.aggregateProducts(sales);
        const customerAgg = ReportHelpers.aggregateCustomers(sales);
        const inventoryMetrics = ReportHelpers.getInventoryMetrics(inventory);
        const alerts = ReportHelpers.buildAlerts(sales, inventory, debtors);

        const totalDebtors = debtors.reduce((s, d) => s + (d.balance_remaining || 0), 0);
        const totalCreditors = creditors.reduce((s, c) => s + (c.balance_remaining || 0), 0);

        return {
            period: { startDate: startStr, endDate: endStr },
            revenue: { sales: totalSales, income: totalIncome, total: totalSales + totalIncome },
            costs: { purchases: totalPurchases, expenses: totalExpenses, total: totalPurchases + totalExpenses },
            profitability,
            transactions: { sales: sales.length, incomes: incomes.length, expenses: expenses.length, purchases: purchases.length },
            topProducts: ReportHelpers.getTopItems(productAgg, 'revenue', 5),
            topCustomers: ReportHelpers.getTopItems(customerAgg, 'total', 5),
            customers: { total: Object.keys(customerAgg).length, top: ReportHelpers.getTopItems(customerAgg, 'total', 3) },
            inventory: inventoryMetrics,
            receivables: { debtors: totalDebtors, creditors: totalCreditors, debtorCount: debtors.length, creditorCount: creditors.length },
            alerts,
            raw: { sales, incomes, expenses, purchases },
        };
    }
}

module.exports = ReportGenerator;