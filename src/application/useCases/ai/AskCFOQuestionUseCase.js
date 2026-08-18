// src/application/useCases/ai/AskCFOQuestionUseCase.js

class AskCFOQuestionUseCase {
    constructor({
        saleRepository,
        incomeRepository,
        purchaseRepository,
        expenseRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        aiService,
    }) {
        this.saleRepository = saleRepository;
        this.incomeRepository = incomeRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
        this.aiService = aiService;
    }

    async execute({ businessId, question }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!question || question.trim().length === 0) {
            throw new Error('Question is required');
        }

        // Gather business data for context
        const now = new Date();
        const startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);

        // Get financial data
        const sales = await this.saleRepository.findByDateRange(businessId, startDate, now);
        const incomes = await this.incomeRepository.findByDateRange(businessId, startDate, now);
        const purchases = await this.purchaseRepository.findByDateRange(businessId, startDate, now);
        const expenses = await this.expenseRepository.findByDateRange(businessId, startDate, now);

        // Get debtors and creditors
        const debtors = await this.debtorRepository.findByBusinessId(businessId);
        const creditors = await this.creditorRepository.findByBusinessId(businessId);

        // Get inventory
        const inventory = await this.inventoryRepository.findByBusinessId(businessId);

        // Calculate key metrics
        const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const totalRevenue = totalSales + totalIncome;
        const totalCosts = totalPurchases + totalExpenses;
        const netProfit = totalRevenue - totalCosts;
        const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

        const totalOutstanding = debtors
            .filter(d => d.status !== 'PAID')
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        const totalOverdue = debtors
            .filter(d => d.isOverdue())
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        const totalCreditorOutstanding = creditors
            .filter(c => c.status !== 'PAID')
            .reduce((sum, c) => sum + c.balanceRemaining, 0);

        const inventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
        const lowStockCount = inventory.filter(item => item.isLowStock()).length;

        // Build context for AI
        const context = {
            businessId,
            dateRange: {
                start: startDate,
                end: now,
            },
            metrics: {
                totalRevenue,
                totalCosts,
                netProfit,
                profitMargin: profitMargin.toFixed(1) + '%',
                totalSales,
                totalIncome,
                totalPurchases,
                totalExpenses,
                totalOutstanding,
                totalOverdue,
                totalCreditorOutstanding,
                inventoryValue,
                lowStockCount,
                debtorCount: debtors.filter(d => d.status !== 'PAID').length,
                creditorCount: creditors.filter(c => c.status !== 'PAID').length,
                totalTransactions: sales.length + incomes.length + purchases.length + expenses.length,
            },
            topProducts: this.getTopProducts(sales, 5),
            recentActivity: this.getRecentActivity(sales, incomes, purchases, expenses, 10),
        };

        // Get AI response
        const response = await this.aiService.askQuestion(question, context);

        return {
            success: true,
            question: question.trim(),
            response,
            context: {
                period: 'Last 3 months',
                metrics: context.metrics,
            },
        };
    }

    getTopProducts(sales, limit = 5) {
        const productMap = {};
        for (const sale of sales) {
            for (const item of sale.items || []) {
                const name = item.name || 'Unknown';
                if (!productMap[name]) {
                    productMap[name] = { quantity: 0, revenue: 0, count: 0 };
                }
                productMap[name].quantity += item.quantity || 0;
                productMap[name].revenue += item.totalPrice || 0;
                productMap[name].count += 1;
            }
        }

        return Object.entries(productMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);
    }

    getRecentActivity(sales, incomes, purchases, expenses, limit = 10) {
        const activities = [];

        for (const sale of sales) {
            activities.push({
                type: 'SALE',
                date: sale.saleDate,
                amount: sale.totalAmount,
                description: `Sale #${sale.invoiceNumber || sale.id}`,
            });
        }

        for (const income of incomes) {
            activities.push({
                type: 'INCOME',
                date: income.date,
                amount: income.amount,
                description: `Income: ${income.sourceType || 'Other'}`,
            });
        }

        for (const purchase of purchases) {
            activities.push({
                type: 'PURCHASE',
                date: purchase.purchaseDate,
                amount: purchase.totalAmount,
                description: `Purchase #${purchase.invoiceNumber || purchase.id}`,
            });
        }

        for (const expense of expenses) {
            activities.push({
                type: 'EXPENSE',
                date: expense.date,
                amount: expense.amount,
                description: `Expense: ${expense.expenseType || 'Other'}`,
            });
        }

        return activities
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }
}

module.exports = AskCFOQuestionUseCase;