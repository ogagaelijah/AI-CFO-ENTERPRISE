// src/application/useCases/pledges/DeletePledgeUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class DeletePledgeUseCase {
    constructor({ pledgeRepository, donationRepository = null }) {
        if (!pledgeRepository) throw new Error('pledgeRepository is required');
        this.pledgeRepository = pledgeRepository;
        this.donationRepository = donationRepository;
    }

    async execute({ pledgeId, businessId }) {
        if (!pledgeId) throw new Error('Pledge ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const existing = await this.pledgeRepository.findById(pledgeId, businessId);
        if (!existing) throw new Error('Pledge not found');

        // Block delete if any donations reference this pledge.
        // User must unlink or cancel the pledge instead.
        if (this.donationRepository) {
            const linked = await this.donationRepository.findByPledge(businessId, pledgeId);
            if (linked.length > 0) {
                throw new Error(
                    `Cannot delete pledge — ${linked.length} donation(s) reference it. Mark it CANCELLED instead.`
                );
            }
        }

        // Also block if it's been partially fulfilled
        if (existing.amountFulfilled > 0) {
            throw new Error(
                'Cannot delete a partially-fulfilled pledge. Mark it CANCELLED instead.'
            );
        }

        const deleted = await withTransaction(async () =>
            this.pledgeRepository.delete(pledgeId, businessId)
        );

        if (!deleted) throw new Error('Pledge could not be deleted');

        return {
            success: true,
            message: `Pledge deleted`,
        };
    }
}

module.exports = DeletePledgeUseCase;