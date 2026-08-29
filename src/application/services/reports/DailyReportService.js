// src/application/services/reports/DailyReportService.js

/**
 * Daily Report Service
 * Operational control report
 * Shows today's numbers vs yesterday
 */
class DailyReportService {
    constructor({
        saleRepository,
        purchaseRepository,
        expenseRepository,
        incomeRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
    }) {
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
    }

    async generate({ userId, businessId, date }) {
        const targetDate = date ? new Date(date) : new Date();
        const dateStr = targetDate.toISOString().split('T')[0];
        
        const prevDate = new Date(targetDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        // Today's sales - using findByDateRange with sale_date
        const todaySales = await this.saleRepository.findByDateRange(
            userId,
            dateStr,
            dateStr
        );

        const todayIncome = await this.incomeRepository.findByDateRange(
            userId,
            dateStr,
            dateStr
        );

        const todayExpenses = await this.expenseRepository.findByDateRange(
            userId,
            dateStr,
            dateStr
        );

        const todayPurchases = await this.purchaseRepository.findByDateRange(
            userId,
            dateStr,
            dateStr
        );

        // Previous day
        const prevSales = await this.saleRepository.findByDateRange(
            userId,
            prevDateStr,
            prevDateStr
        );

        const prevIncome = await this.incomeRepository.findByDateRange(
            userId,
            prevDateStr,
            prevDateStr
        );

        const prevExpenses = await this.expenseRepository.findByDateRange(
            userId,
            prevDateStr,
            prevDateStr
        );

        const prevPurchases = await this.purchaseRepository.findByDateRange(
            userId,
            prevDateStr,
            prevDateStr
        );

        // Calculate today
        const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const todayCogs = todaySales.reduce((sum, s) => sum + (s.cogs || 0), 0);
        const todayIncomeTotal = todayIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
        const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const todayPurchasesTotal = todayPurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

        const todayGrossProfit = todayRevenue - todayCogs;
        const todayGrossMargin = todayRevenue > 0 ? (todayGrossProfit / todayRevenue) * 100 : 0;
        const todayNetProfit = todayGrossProfit - todayExpensesTotal;
        const todayNetMargin = todayRevenue > 0 ? (todayNetProfit / todayRevenue) * 100 : 0;

        // Calculate previous day
        const prevRevenue = prevSales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const prevCogs = prevSales.reduce((sum, s) => sum + (s.cogs || 0), 0);
        const prevIncomeTotal = prevIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
        const prevExpensesTotal = prevExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const prevPurchasesTotal = prevPurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

        const prevGrossProfit = prevRevenue - prevCogs;
        const prevNetProfit = prevGrossProfit - prevExpensesTotal;

        // Comparisons
        const revenueChange = prevRevenue > 0 ? ((todayRevenue - prevRevenue) / prevRevenue) * 100 : 0;
        const netProfitChange = prevNetProfit > 0 ? ((todayNetProfit - prevNetProfit) / prevNetProfit) * 100 : 0;

        // Low stock alerts
        const lowStockItems = await this.inventoryRepository.findLowStock(userId, 5);

        // Key transactions (Last 5)
        const keyTransactions = [
            ...todaySales.map(s => ({ type: 'SALE', description: s.item_name, amount: s.total_price, date: s.sale_date })),
            ...todayIncome.map(i => ({ type: 'INCOME', description: i.source, amount: i.amount, date: i.created_at })),
            ...todayExpenses.map(e => ({ type: 'EXPENSE', description: e.category, amount: e.amount, date: e.created_at })),
            ...todayPurchases.map(p => ({ type: 'PURCHASE', description: p.item_name, amount: p.total_cost, date: p.purchase_date })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        return {
            date: dateStr,
            previousDate: prevDateStr,
            today: {
                revenue: todayRevenue,
                cogs: todayCogs,
                grossProfit: todayGrossProfit,
                grossMargin: todayGrossMargin,
                expenses: todayExpensesTotal,
                netProfit: todayNetProfit,
                netMargin: todayNetMargin,
                purchases: todayPurchasesTotal,
                income: todayIncomeTotal,
            },
            comparison: {
                revenueChange,
                netProfitChange,
                previousDay: {
                    revenue: prevRevenue,
                    grossProfit: prevGrossProfit,
                    netProfit: prevNetProfit,
                    expenses: prevExpensesTotal,
                    purchases: prevPurchasesTotal,
                },
            },
            alerts: {
                lowStock: lowStockItems,
            },
            transactions: keyTransactions,
        };
    }
}

module.exports = DailyReportService;