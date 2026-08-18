// src/application/useCases/reports/GetMonthlyReportUseCase.js

class GetMonthlyReportUseCase {
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

    async execute({ businessId, month = new Date().getMonth(), year = new Date().getFullYear() }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Set date range for the month
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        // Get all transactions for the month
        const transactions = await this.transactionRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get sales for the month
        const sales = await this.saleRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get income for the month
        const incomes = await this.incomeRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get purchases for the month
        const purchases = await this.purchaseRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get expenses for the month
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

        // Weekly breakdown
        const weeklyData = [];
        const weeks = Math.ceil(endDate.getDate() / 7);
        for (let w = 0; w < weeks; w++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() + (w * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            if (weekEnd > endDate) {
                weekEnd.setTime(endDate.getTime());
            }

            const weekSales = sales.filter(s =>
                new Date(s.saleDate) >= weekStart && new Date(s.saleDate) <= weekEnd
            );
            const weekIncomes = incomes.filter(i =>
                new Date(i.date) >= weekStart && new Date(i.date) <= weekEnd
            );
            const weekPurchases = purchases.filter(p =>
                new Date(p.purchaseDate) >= weekStart && new Date(p.purchaseDate) <= weekEnd
            );
            const weekExpenses = expenses.filter(e =>
                new Date(e.date) >= weekStart && new Date(e.date) <= weekEnd
            );

            weeklyData.push({
                week: w + 1,
                start: weekStart,
                end: weekEnd,
                revenue: weekSales.reduce((sum, s) => sum + s.totalAmount, 0) +
                         weekIncomes.reduce((sum, i) => sum + i.amount, 0),
                costs: weekPurchases.reduce((sum, p) => sum + p.totalAmount, 0) +
                       weekExpenses.reduce((sum, e) => sum + e.amount, 0),
                profit: (weekSales.reduce((sum, s) => sum + s.totalAmount, 0) +
                        weekIncomes.reduce((sum, i) => sum + i.amount, 0)) -
                       (weekPurchases.reduce((sum, p) => sum + p.totalAmount, 0) +
                        weekExpenses.reduce((sum, e) => sum + e.amount, 0)),
                sales: weekSales.length,
                purchases: weekPurchases.length,
                expenses: weekExpenses.length,
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

        // Compare with previous month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevStart = new Date(prevYear, prevMonth, 1);
        const prevEnd = new Date(prevYear, prevMonth + 1, 0);
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

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        return {
            success: true,
            month: monthNames[month],
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
                monthOverMonth: {
                    revenueChange: revenueChange.toFixed(1) + '%',
                    profitChange: profitChange.toFixed(1) + '%',
                    prevRevenue,
                    prevProfit,
                },
            },
            weeklyBreakdown: weeklyData,
            sales: sales.map(s => s.toJSON()),
            incomes: incomes.map(i => i.toJSON()),
            purchases: purchases.map(p => p.toJSON()),
            expenses: expenses.map(e => e.toJSON()),
        };
    }
}

module.exports = GetMonthlyReportUseCase;