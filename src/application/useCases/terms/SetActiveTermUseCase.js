// src/application/useCases/terms/SetActiveTermUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class SetActiveTermUseCase {
    constructor({ termRepository }) {
        this.termRepository = termRepository;
    }

    /**
     * Marks the given term ACTIVE and every other term for this business
     * COMPLETED. Only one ACTIVE term at a time, enforced atomically.
     */
    async execute({ termId, businessId }) {
        if (!termId) {
            throw new Error('Term ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.termRepository.findById(termId, businessId);
        if (!existing) {
            throw new Error('Term not found');
        }

        const result = await withTransaction(async () => {
            // Deactivate every other ACTIVE term for this business.
            await this.termRepository.deactivateAllExcept(businessId, termId);

            // Ensure this one is ACTIVE.
            const updated = await this.termRepository.update(termId, businessId, {
                status: 'ACTIVE',
            });

            return updated;
        });

        return {
            success: true,
            term: result.toJSON(),
            message: `Term "${result.name}" is now active`,
        };
    }
}

module.exports = SetActiveTermUseCase;