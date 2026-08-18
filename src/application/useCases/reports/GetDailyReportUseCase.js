// src/application/useCases/reports/GetDailyReportUseCase.js

class GetDailyReportUseCase {
    constructor({
        saleRepository,
        incomeRepository,
        purchaseRepository,
        expenseRepository,
        debtorRepository,
        creditorRepository,
        transactionRepository,
    }) {
        this.saleRepository = saleRepository;
        this.incomeRepository = incomeRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.transactionRepository = transactionRepository;
    }

    async execute({ businessId, date = new Date() }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Set date range for the day
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        // Get all transactions for the day
        const transactions = await this.transactionRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get sales for the day
        const sales = await this.saleRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get income for the day
        const incomes = await this.incomeRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get purchases for the day
        const purchases = await this.purchaseRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get expenses for the day
        const expenses = await this.expenseRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Calculate totals
        const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const totalRevenue = totalSales + totalIncome;
        const totalCosts = totalPurchases + totalExpenses;
        const netProfit = totalRevenue - totalCosts;

        // Transaction count
        const transactionCount = transactions.length;

        // Get top products sold
        const productSales = {};
        for (const sale of sales) {
            for (const item of sale.items || []) {
                const name = item.name || 'Unknown';
                if (!productSales[name]) {
                    productSales[name] = { quantity: 0, revenue: 0 };
                }
                productSales[name].quantity += item.quantity || 0;
                productSales[name].revenue += item.totalPrice || 0;
            }
        }

        const topProducts = Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Get debtors summary
        const debtors = await this.debtorRepository.findByBusinessId(businessId);
        const totalOutstanding = debtors
            .filter(d => d.status !== 'PAID')
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        // Get creditors summary
        const creditors = await this.creditorRepository.findByBusinessId(businessId);
        const totalCreditorsOutstanding = creditors
            .filter(c => c.status !== 'PAID')
            .reduce((sum, c) => sum + c.balanceRemaining, 0);

        return {
            success: true,
            date: startDate,
            summary: {
                totalSales,
                totalIncome,
                totalRevenue,
                totalPurchases,
                totalExpenses,
                totalCosts,
                netProfit,
                transactionCount,
                topProducts,
                debtors: {
                    totalOutstanding,
                    count: debtors.filter(d => d.status !== 'PAID').length,
                },
                creditors: {
                    totalOutstanding: totalCreditorsOutstanding,
                    count: creditors.filter(c => c.status !== 'PAID').length,
                },
            },
            sales: sales.map(s => s.toJSON()),
            incomes: incomes.map(i => i.toJSON()),
            purchases: purchases.map(p => p.toJSON()),
            expenses: expenses.map(e => e.toJSON()),
        };
    }
}

module.exports = GetDailyReportUseCase;