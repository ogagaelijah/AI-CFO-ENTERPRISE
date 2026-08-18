// src/application/useCases/reports/GetYearlyReportUseCase.js

class GetYearlyReportUseCase {
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

    async execute({ businessId, year = new Date().getFullYear() }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Set date range for the year
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        endDate.setHours(23, 59, 59, 999);

        // Get all transactions for the year
        const transactions = await this.transactionRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get sales for the year
        const sales = await this.saleRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get income for the year
        const incomes = await this.incomeRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get purchases for the year
        const purchases = await this.purchaseRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get expenses for the year
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

        // Monthly breakdown
        const monthlyData = [];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        for (let m = 0; m < 12; m++) {
            const monthStart = new Date(year, m, 1);
            const monthEnd = new Date(year, m + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);

            const monthSales = sales.filter(s =>
                new Date(s.saleDate) >= monthStart && new Date(s.saleDate) <= monthEnd
            );
            const monthIncomes = incomes.filter(i =>
                new Date(i.date) >= monthStart && new Date(i.date) <= monthEnd
            );
            const monthPurchases = purchases.filter(p =>
                new Date(p.purchaseDate) >= monthStart && new Date(p.purchaseDate) <= monthEnd
            );
            const monthExpenses = expenses.filter(e =>
                new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd
            );

            const monthRevenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0) +
                                monthIncomes.reduce((sum, i) => sum + i.amount, 0);
            const monthCosts = monthPurchases.reduce((sum, p) => sum + p.totalAmount, 0) +
                              monthExpenses.reduce((sum, e) => sum + e.amount, 0);

            monthlyData.push({
                month: monthNames[m],
                revenue: monthRevenue,
                costs: monthCosts,
                profit: monthRevenue - monthCosts,
                sales: monthSales.length,
                purchases: monthPurchases.length,
                expenses: monthExpenses.length,
            });
        }

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

        // Compare with previous year
        const prevYear = year - 1;
        const prevStart = new Date(prevYear, 0, 1);
        const prevEnd = new Date(prevYear, 11, 31);
        prevEnd.setHours(23, 59, 59, 999);

        const prevSales = await this.saleRepository.findByDateRange(
            businessId,
            prevStart,
            prevEnd
        );
        const prevIncome = await this.incomeRepository.findByDateRange(
            businessId,
            prevStart,
            prevEnd
        );
        const prevPurchases = await this.purchaseRepository.findByDateRange(
            businessId,
            prevStart,
            prevEnd
        );
        const prevExpenses = await this.expenseRepository.findByDateRange(
            businessId,
            prevStart,
            prevEnd
        );

        const prevRevenue = prevSales.reduce((sum, s) => sum + s.totalAmount, 0) +
                           prevIncome.reduce((sum, i) => sum + i.amount, 0);
        const prevCosts = prevPurchases.reduce((sum, p) => sum + p.totalAmount, 0) +
                         prevExpenses.reduce((sum, e) => sum + e.amount, 0);
        const prevProfit = prevRevenue - prevCosts;

        const revenueChange = prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
            : 0;
        const profitChange = prevProfit !== 0
            ? ((netProfit - prevProfit) / Math.abs(prevProfit)) * 100
            : 0;

        return {
            success: true,
            year,
            startDate,
            endDate,
            summary: {
                totalSales,
                totalIncome,
                totalRevenue,
                totalPurchases,
                totalExpenses,
                totalCosts,
                netProfit,
                profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%',
                transactionCount: transactions.length,
                debtors: {
                    totalOutstanding,
                    count: debtors.filter(d => d.status !== 'PAID').length,
                },
                creditors: {
                    totalOutstanding: totalCreditorsOutstanding,
                    count: creditors.filter(c => c.status !== 'PAID').length,
                },
                yearOverYear: {
                    revenueChange: revenueChange.toFixed(1) + '%',
                    profitChange: profitChange.toFixed(1) + '%',
                    prevRevenue,
                    prevProfit,
                },
            },
            monthlyBreakdown: monthlyData,
            sales: sales.map(s => s.toJSON()),
            incomes: incomes.map(i => i.toJSON()),
            purchases: purchases.map(p => p.toJSON()),
            expenses: expenses.map(e => e.toJSON()),
        };
    }
}

module.exports = GetYearlyReportUseCase;