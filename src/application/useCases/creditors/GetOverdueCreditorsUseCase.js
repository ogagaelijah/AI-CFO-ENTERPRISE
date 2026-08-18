// src/application/useCases/creditors/GetOverdueCreditorsUseCase.js

class GetOverdueCreditorsUseCase {
    constructor({ creditorRepository }) {
        this.creditorRepository = creditorRepository;
    }

    async execute({
        businessId,
        daysOverdue = null, // null = all overdue, or specific days (e.g., 30)
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const allCreditors = await this.creditorRepository.findByBusinessId(businessId);

        // Filter overdue creditors
        const overdueCreditors = allCreditors.filter(creditor => {
            if (creditor.isFullyPaid()) return false;
            if (!creditor.dueDate) return false;

            const days = Math.floor((new Date() - new Date(creditor.dueDate)) / (1000 * 60 * 60 * 24));
            if (daysOverdue !== null && days < daysOverdue) return false;

            return creditor.isOverdue();
        });

        // Sort by days overdue (most overdue first)
        overdueCreditors.sort((a, b) => {
            const daysA = Math.floor((new Date() - new Date(a.dueDate)) / (1000 * 60 * 60 * 24));
            const daysB = Math.floor((new Date() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24));
            return daysB - daysA;
        });

        const totalOverdue = overdueCreditors.reduce((sum, c) => sum + c.balanceRemaining, 0);

        return {
            success: true,
            totalOverdue,
            count: overdueCreditors.length,
            overdueCreditors: overdueCreditors.map(c => ({
                ...c.toJSON(),
                daysOverdue: c.dueDate
                    ? Math.floor((new Date() - new Date(c.dueDate)) / (1000 * 60 * 60 * 24))
                    : 0,
            })),
        };
    }
}

module.exports = GetOverdueCreditorsUseCase;