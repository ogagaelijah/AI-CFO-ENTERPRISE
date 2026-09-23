// src/application/useCases/pledges/CreatePledgeUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class CreatePledgeUseCase {
    constructor({ pledgeRepository, customerRepository = null }) {
        if (!pledgeRepository) throw new Error('pledgeRepository is required');
        this.pledgeRepository = pledgeRepository;
        this.customerRepository = customerRepository;
    }

    async execute({
        businessId,
        donorId = null,
        amount,
        category = 'GENERAL',
        pledgeDate = new Date(),
        dueDate = null,
        notes = '',
        metadata = {},
    }) {
        if (!businessId) throw new Error('Business ID is required');

        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Pledge amount must be a positive number');
        }

        // Verify donor ownership if provided
        if (donorId && this.customerRepository) {
            const donor = await this.customerRepository.findById(donorId);
            if (!donor) throw new Error('Donor not found');
            const bizId = Number(donor.business_id ?? donor.businessId);
            if (bizId !== Number(businessId)) {
                throw new Error('Access denied: Donor does not belong to this business');
            }
        }

        const Pledge = require('../../../domain/entities/Pledge');
        const pledge = new Pledge({
            businessId,
            donorId: donorId || null,
            amount: amt,
            amountFulfilled: 0,
            currency: 'NGN',
            category,
            status: 'ACTIVE',
            pledgeDate,
            dueDate,
            notes,
            metadata,
        });

        const saved = await withTransaction(async () => {
            return await this.pledgeRepository.create(pledge);
        });

        return {
            success: true,
            pledge: saved.toJSON(),
            message: `Pledge of ₦${amt.toLocaleString()} created`,
        };
    }
}

module.exports = CreatePledgeUseCase;