// src/application/useCases/creditors/GetCreditorByIdUseCase.js

class GetCreditorByIdUseCase {
    constructor({ creditorRepository }) {
        this.creditorRepository = creditorRepository;
    }

    async execute({ creditorId, businessId }) {
        if (!creditorId) {
            throw new Error('Creditor ID is required');
        }

        const creditor = await this.creditorRepository.findById(creditorId);
        if (!creditor) {
            throw new Error('Creditor not found');
        }

        // Verify business ownership
        if (creditor.businessId !== businessId) {
            throw new Error('Access denied: Creditor does not belong to this business');
        }

        return {
            success: true,
            creditor: creditor.toJSON(),
        };
    }
}

module.exports = GetCreditorByIdUseCase;