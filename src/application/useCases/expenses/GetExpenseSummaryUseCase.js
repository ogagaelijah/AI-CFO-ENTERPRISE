// src/application/useCases/expenses/GetExpenseSummaryUseCase.js

class GetExpenseSummaryUseCase {
    constructor({ expenseRepository }) {
        this.expenseRepository = expenseRepository;
    }

    async execute({ businessId, period = 'month' }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Determine date range based on period
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - day);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
        }

        const expenses = await this.expenseRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        const totalExpenses = expenses.length;
        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalPaid = expenses
            .filter(e => e.paymentStatus === 'PAID')
            .reduce((sum, e) => sum + e.amount, 0);
        const totalUnpaid = expenses
            .filter(e => e.paymentStatus === 'UNPAID' || e.paymentStatus === 'PARTIAL')
            .reduce((sum, e) => sum + e.amount, 0);

        // Group by expense type
        const typeBreakdown = {};
        for (const expense of expenses) {
            const type = expense.expenseType || 'OTHER';
            if (!typeBreakdown[type]) {
                typeBreakdown[type] = { count: 0, total: 0 };
            }
            typeBreakdown[type].count++;
            typeBreakdown[type].total += expense.amount;
        }

        // Payment status breakdown
        const statusBreakdown = {
            paid: expenses.filter(e => e.paymentStatus === 'PAID').length,
            partial: expenses.filter(e => e.paymentStatus === 'PARTIAL').length,
            unpaid: expenses.filter(e => e.paymentStatus === 'UNPAID').length,
        };

        return {
            period,
            startDate,
            endDate,
            totalExpenses,
            totalAmount,
            totalPaid,
            totalUnpaid,
            averageExpenseValue: totalExpenses > 0 ? totalAmount / totalExpenses : 0,
            typeBreakdown,
            statusBreakdown,
            expenses: expenses.map(e => e.toJSON()),
        };
    }
}

module.exports = GetExpenseSummaryUseCase;