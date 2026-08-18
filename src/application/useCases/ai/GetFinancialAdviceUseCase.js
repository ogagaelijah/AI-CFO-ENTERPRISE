// src/application/useCases/ai/GetFinancialAdviceUseCase.js

class GetFinancialAdviceUseCase {
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

    async execute({ businessId, topic = 'general' }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Gather business data
        const now = new Date();
        const startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);

        const sales = await this.saleRepository.findByDateRange(businessId, startDate, now);
        const incomes = await this.incomeRepository.findByDateRange(businessId, startDate, now);
        const purchases = await this.purchaseRepository.findByDateRange(businessId, startDate, now);
        const expenses = await this.expenseRepository.findByDateRange(businessId, startDate, now);
        const debtors = await this.debtorRepository.findByBusinessId(businessId);
        const creditors = await this.creditorRepository.findByBusinessId(businessId);
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

        const inventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

        // Build context based on topic
        const context = {
            businessId,
            period: 'Last 6 months',
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
                inventoryValue,
                debtorCount: debtors.filter(d => d.status !== 'PAID').length,
                creditorCount: creditors.filter(c => c.status !== 'PAID').length,
            },
            topics: {
                revenue: {
                    total: totalRevenue,
                    trend: this.calculateTrend(sales, incomes, 'revenue'),
                },
                expenses: {
                    total: totalCosts,
                    breakdown: this.getExpenseBreakdown(expenses, purchases),
                },
                debtors: {
                    total: totalOutstanding,
                    overdue: totalOverdue,
                    count: debtors.filter(d => d.status !== 'PAID').length,
                },
                inventory: {
                    value: inventoryValue,
                    count: inventory.length,
                    lowStock: inventory.filter(i => i.isLowStock()).length,
                },
            },
        };

        // Get AI advice
        const advice = await this.aiService.getFinancialAdvice(topic, context);

        return {
            success: true,
            topic,
            advice,
            context: {
                period: 'Last 6 months',
                metrics: context.metrics,
            },
            recommendations: advice.recommendations || [],
        };
    }

    calculateTrend(sales, incomes, type) {
        // Group by month
        const monthlyData = {};
        const allItems = type === 'revenue' ? [...sales, ...incomes] : [];

        for (const item of allItems) {
            const date = item.saleDate || item.date;
            const key = date.getFullYear() + '-' + (date.getMonth() + 1);
            if (!monthlyData[key]) monthlyData[key] = 0;
            monthlyData[key] += item.totalAmount || item.amount || 0;
        }

        const values = Object.values(monthlyData);
        if (values.length === 0) return { direction: 'stable', change: 0 };

        const first = values[0] || 0;
        const last = values[values.length - 1] || 0;
        const change = first > 0 ? ((last - first) / first) * 100 : 0;

        return {
            direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
            change: change.toFixed(1) + '%',
        };
    }

    getExpenseBreakdown(expenses, purchases) {
        const breakdown = {};

        for (const expense of expenses) {
            const type = expense.expenseType || 'Other';
            if (!breakdown[type]) breakdown[type] = 0;
            breakdown[type] += expense.amount;
        }

        for (const purchase of purchases) {
            if (!breakdown['Purchases']) breakdown['Purchases'] = 0;
            breakdown['Purchases'] += purchase.totalAmount;
        }

        return breakdown;
    }
}

module.exports = GetFinancialAdviceUseCase;