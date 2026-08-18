// src/application/useCases/income/GetIncomeSummaryUseCase.js

class GetIncomeSummaryUseCase {
    constructor({ incomeRepository }) {
        this.incomeRepository = incomeRepository;
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

        const incomes = await this.incomeRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        const totalIncomes = incomes.length;
        const totalAmount = incomes.reduce((sum, income) => sum + income.amount, 0);
        const totalPaid = incomes
            .filter(i => i.paymentStatus === 'PAID')
            .reduce((sum, income) => sum + income.amount, 0);
        const totalUnpaid = incomes
            .filter(i => i.paymentStatus === 'UNPAID' || i.paymentStatus === 'PARTIAL')
            .reduce((sum, income) => sum + income.amount, 0);

        // Group by source type
        const sourceBreakdown = {};
        for (const income of incomes) {
            const source = income.sourceType || 'OTHER';
            if (!sourceBreakdown[source]) {
                sourceBreakdown[source] = { count: 0, total: 0 };
            }
            sourceBreakdown[source].count++;
            sourceBreakdown[source].total += income.amount;
        }

        // Payment status breakdown
        const statusBreakdown = {
            paid: incomes.filter(i => i.paymentStatus === 'PAID').length,
            partial: incomes.filter(i => i.paymentStatus === 'PARTIAL').length,
            unpaid: incomes.filter(i => i.paymentStatus === 'UNPAID').length,
        };

        return {
            period,
            startDate,
            endDate,
            totalIncomes,
            totalAmount,
            totalPaid,
            totalUnpaid,
            averageIncomeValue: totalIncomes > 0 ? totalAmount / totalIncomes : 0,
            sourceBreakdown,
            statusBreakdown,
            incomes: incomes.map(i => i.toJSON()),
        };
    }
}

module.exports = GetIncomeSummaryUseCase;