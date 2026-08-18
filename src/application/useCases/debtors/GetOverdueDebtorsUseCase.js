// src/application/useCases/debtors/GetOverdueDebtorsUseCase.js

class GetOverdueDebtorsUseCase {
    constructor({ debtorRepository }) {
        this.debtorRepository = debtorRepository;
    }

    async execute({
        businessId,
        daysOverdue = null, // null = all overdue, or specific days (e.g., 30)
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const allDebtors = await this.debtorRepository.findByBusinessId(businessId);

        // Filter overdue debtors
        const overdueDebtors = allDebtors.filter(debtor => {
            if (debtor.isFullyPaid()) return false;
            if (!debtor.dueDate) return false;

            const days = Math.floor((new Date() - new Date(debtor.dueDate)) / (1000 * 60 * 60 * 24));
            if (daysOverdue !== null && days < daysOverdue) return false;

            return debtor.isOverdue();
        });

        // Sort by days overdue (most overdue first)
        overdueDebtors.sort((a, b) => {
            const daysA = Math.floor((new Date() - new Date(a.dueDate)) / (1000 * 60 * 60 * 24));
            const daysB = Math.floor((new Date() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24));
            return daysB - daysA;
        });

        const totalOverdue = overdueDebtors.reduce((sum, d) => sum + d.balanceRemaining, 0);

        return {
            success: true,
            totalOverdue,
            count: overdueDebtors.length,
            overdueDebtors: overdueDebtors.map(d => ({
                ...d.toJSON(),
                daysOverdue: d.dueDate
                    ? Math.floor((new Date() - new Date(d.dueDate)) / (1000 * 60 * 60 * 24))
                    : 0,
            })),
        };
    }
}

module.exports = GetOverdueDebtorsUseCase;