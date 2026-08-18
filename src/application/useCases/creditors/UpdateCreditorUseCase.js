// src/application/useCases/creditors/UpdateCreditorUseCase.js

class UpdateCreditorUseCase {
    constructor({ creditorRepository }) {
        this.creditorRepository = creditorRepository;
    }

    async execute({
        creditorId,
        businessId,
        dueDate = null,
        notes = null,
        status = null,
        supplierId = null,
    }) {
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

        // Update fields
        if (dueDate !== undefined) {
            creditor.dueDate = dueDate;
        }

        if (notes !== undefined) {
            creditor.notes = notes;
        }

        if (status !== undefined) {
            const validStatuses = ['ACTIVE', 'PAID', 'OVERDUE'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            creditor.status = status;
        }

        if (supplierId !== undefined) {
            creditor.supplierId = supplierId;
        }

        creditor.updatedAt = new Date();

        // If status is being set to PAID, ensure balance is 0
        if (status === 'PAID' && creditor.balanceRemaining > 0) {
            throw new Error('Cannot mark as PAID when balance remaining is greater than 0');
        }

        await this.creditorRepository.update(creditor.id, creditor);

        return {
            success: true,
            creditor: creditor.toJSON(),
            message: 'Creditor updated successfully',
        };
    }
}

module.exports = UpdateCreditorUseCase;