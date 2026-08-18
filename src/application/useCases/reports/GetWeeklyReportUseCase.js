// src/application/useCases/reports/GetWeeklyReportUseCase.js

class GetWeeklyReportUseCase {
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

    async execute({ businessId, weekStartDate = new Date() }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Set date range for the week
        const startDate = new Date(weekStartDate);
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        // Get all transactions for the week
        const transactions = await this.transactionRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get sales for the week
        const sales = await this.saleRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get income for the week
        const incomes = await this.incomeRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get purchases for the week
        const purchases = await this.purchaseRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get expenses for the week
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

        // Daily breakdown
        const dailyData = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + i);

            const dayStart = new Date(dayDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            const daySales = sales.filter(s =>
                new Date(s.saleDate) >= dayStart && new Date(s.saleDate) <= dayEnd
            );
            const dayIncomes = incomes.filter(i =>
                new Date(i.date) >= dayStart && new Date(i.date) <= dayEnd
            );
            const dayPurchases = purchases.filter(p =>
                new Date(p.purchaseDate) >= dayStart && new Date(p.purchaseDate) <= dayEnd
            );
            const dayExpenses = expenses.filter(e =>
                new Date(e.date) >= dayStart && new Date(e.date) <= dayEnd
            );

            dailyData.push({
                date: dayDate,
                sales: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
                income: dayIncomes.reduce((sum, i) => sum + i.amount, 0),
                purchases: dayPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
                expenses: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
                profit: (daySales.reduce((sum, s) => sum + s.totalAmount, 0) +
                        dayIncomes.reduce((sum, i) => sum + i.amount, 0)) -
                       (dayPurchases.reduce((sum, p) => sum + p.totalAmount, 0) +
                        dayExpenses.reduce((sum, e) => sum + e.amount, 0)),
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

        // Compare with previous week
        const prevWeekStart = new Date(startDate);
        prevWeekStart.setDate(startDate.getDate() - 7);
        const prevWeekEnd = new Date(prevWeekStart);
        prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
        prevWeekEnd.setHours(23, 59, 59, 999);

        const prevSales = await this.saleRepository.findByDateRange(
            businessId,
            prevWeekStart,
            prevWeekEnd
        );
        const prevIncome = await this.incomeRepository.findByDateRange(
            businessId,
            prevWeekStart,
            prevWeekEnd
        );
        const prevPurchases = await this.purchaseRepository.findByDateRange(
            businessId,
            prevWeekStart,
            prevWeekEnd
        );
        const prevExpenses = await this.expenseRepository.findByDateRange(
            businessId,
            prevWeekStart,
            prevWeekEnd
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
            weekStart: startDate,
            weekEnd: endDate,
            summary: {
                totalSales,
                totalIncome,
                totalRevenue,
                totalPurchases,
                totalExpenses,
                totalCosts,
                netProfit,
                transactionCount: transactions.length,
                debtors: {
                    totalOutstanding,
                    count: debtors.filter(d => d.status !== 'PAID').length,
                },
                creditors: {
                    totalOutstanding: totalCreditorsOutstanding,
                    count: creditors.filter(c => c.status !== 'PAID').length,
                },
                weekOverWeek: {
                    revenueChange: revenueChange.toFixed(1) + '%',
                    profitChange: profitChange.toFixed(1) + '%',
                    prevRevenue,
                    prevProfit,
                },
            },
            dailyBreakdown: dailyData,
            sales: sales.map(s => s.toJSON()),
            incomes: incomes.map(i => i.toJSON()),
            purchases: purchases.map(p => p.toJSON()),
            expenses: expenses.map(e => e.toJSON()),
        };
    }
}

module.exports = GetWeeklyReportUseCase;