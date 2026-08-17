// src/application/useCases/reports/GetExecutiveSummaryUseCase.js

class GetExecutiveSummaryUseCase {
    constructor(saleRepo, incomeRepo, expenseRepo, debtorRepo, creditorRepo, inventoryRepo) {
        this.saleRepo = saleRepo;
        this.incomeRepo = incomeRepo;
        this.expenseRepo = expenseRepo;
        this.debtorRepo = debtorRepo;
        this.creditorRepo = creditorRepo;
        this.inventoryRepo = inventoryRepo;
    }

    async execute(userId) {
        // Get all data in parallel
        const [salesSummary, incomeSummary, expenseSummary, debtorSummary, creditorSummary, inventorySummary, recentSales] = await Promise.all([
            this.saleRepo.getSalesSummary(userId),
            this.incomeRepo.getIncomeSummary(userId),
            this.expenseRepo.getExpenseSummary(userId),
            this.debtorRepo.getSummary(userId),
            this.creditorRepo.getSummary(userId),
            this.inventoryRepo.getSummary(userId),
            this.saleRepo.findByUserId(userId, 10), // Last 10 sales
        ]);

        // Calculate totals
        const totalRevenue = (salesSummary.total_revenue || 0) + (incomeSummary.total_amount || 0);
        const totalExpenses = (expenseSummary.total_amount || 0);
        const netProfit = totalRevenue - totalExpenses;

        return {
            summary: {
                totalRevenue,
                totalExpenses,
                netProfit,
                totalSales: salesSummary.total_sales || 0,
                totalItemsSold: salesSummary.total_items_sold || 0,
                activeDebtors: debtorSummary.active_count || 0,
                activeCreditors: creditorSummary.active_count || 0,
                inventoryItems: inventorySummary.total_items || 0,
                inventoryValue: inventorySummary.total_selling_value || 0,
            },
            sales: recentSales,
        };
    }
}

module.exports = GetExecutiveSummaryUseCase;