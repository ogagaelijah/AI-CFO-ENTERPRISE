// src/application/useCases/debtors/GetDebtorByIdUseCase.js

class GetDebtorByIdUseCase {
    constructor({ debtorRepository }) {
        this.debtorRepository = debtorRepository;
    }

    async execute({ debtorId, businessId }) {
        if (!debtorId) {
            throw new Error('Debtor ID is required');
        }

        const debtor = await this.debtorRepository.findById(debtorId);
        if (!debtor) {
            throw new Error('Debtor not found');
        }

        // Verify business ownership
        if (debtor.businessId !== businessId) {
            throw new Error('Access denied: Debtor does not belong to this business');
        }

        return {
            success: true,
            debtor: debtor.toJSON(),
        };
    }
}

module.exports = GetDebtorByIdUseCase;