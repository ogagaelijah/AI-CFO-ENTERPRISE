// src/application/useCases/fees/DeleteFeeUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class DeleteFeeUseCase {
    constructor({ feeRepository, debtorRepository = null }) {
        if (!feeRepository) throw new Error('feeRepository is required');
        this.feeRepository = feeRepository;
        this.debtorRepository = debtorRepository;
    }

    async execute({ feeId, businessId }) {
        if (!feeId) throw new Error('Fee ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const existing = await this.feeRepository.findById(feeId, businessId);
        if (!existing) throw new Error('Fee not found');

        // Block delete if payments have been recorded
        if (Number(existing.amountPaid) > 0) {
            throw new Error(
                'Cannot delete a fee that has recorded payments. Mark it CANCELLED instead.'
            );
        }

        const deleted = await withTransaction(async () => {
            // If a linked debtor exists (from SENT transition), remove it too.
            if (this.debtorRepository) {
                await this.debtorRepository.deleteByReference(businessId, 'FEE', feeId);
            }
            return await this.feeRepository.delete(feeId, businessId);
        });

        if (!deleted) throw new Error('Fee could not be deleted');

        return {
            success: true,
            message: `Fee ${existing.feeNumber} deleted`,
        };
    }
}

module.exports = DeleteFeeUseCase;