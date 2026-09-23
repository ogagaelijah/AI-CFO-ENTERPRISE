// src/application/useCases/pledges/UpdatePledgeUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class UpdatePledgeUseCase {
    constructor({ pledgeRepository, customerRepository = null }) {
        if (!pledgeRepository) throw new Error('pledgeRepository is required');
        this.pledgeRepository = pledgeRepository;
        this.customerRepository = customerRepository;
    }

    async execute({
        pledgeId,
        businessId,
        donorId,
        amount,
        category,
        dueDate,
        status,
        notes,
        metadata,
    }) {
        if (!pledgeId) throw new Error('Pledge ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const existing = await this.pledgeRepository.findById(pledgeId, businessId);
        if (!existing) throw new Error('Pledge not found');

        // Terminal state
        if (existing.status === 'CANCELLED') {
            const allowed = {};
            if (notes !== undefined) allowed.notes = notes;
            if (metadata !== undefined) allowed.metadata = metadata;
            if (Object.keys(allowed).length === 0) {
                throw new Error('CANCELLED pledges cannot be edited');
            }
            const updated = await withTransaction(async () =>
                this.pledgeRepository.update(pledgeId, businessId, allowed)
            );
            return {
                success: true,
                pledge: updated.toJSON(),
                message: 'Pledge updated (CANCELLED: only notes/metadata allowed)',
            };
        }

        // Amount changes locked once partial fulfilment exists.
        if (amount !== undefined && Number(amount) !== Number(existing.amount)) {
            if (existing.amountFulfilled > 0) {
                throw new Error('Cannot change amount on a partially-fulfilled pledge');
            }
        }

        // Verify new donor ownership if changing
        if (donorId !== undefined && donorId && this.customerRepository) {
            const donor = await this.customerRepository.findById(donorId);
            if (!donor) throw new Error('Donor not found');
            const bizId = Number(donor.business_id ?? donor.businessId);
            if (bizId !== Number(businessId)) {
                throw new Error('Access denied: Donor does not belong to this business');
            }
        }

        const updateData = {};
        if (donorId !== undefined) updateData.donorId = donorId;
        if (amount !== undefined) {
            const amt = Number(amount);
            if (!Number.isFinite(amt) || amt <= 0) {
                throw new Error('Amount must be a positive number');
            }
            updateData.amount = amt;
        }
        if (category !== undefined) updateData.category = category;
        if (dueDate !== undefined) updateData.dueDate = dueDate;
        if (notes !== undefined) updateData.notes = notes;
        if (metadata !== undefined) updateData.metadata = metadata;

        // Status transition — validate via entity rules
        if (status !== undefined && status !== existing.status) {
            const Pledge = require('../../../domain/entities/Pledge');
            const clone = new Pledge(existing.toJSON());
            clone.updateStatus(status);
            updateData.status = clone.status;
        }

        if (Object.keys(updateData).length === 0) {
            return { success: true, pledge: existing.toJSON(), message: 'No changes made' };
        }

        const updated = await withTransaction(async () =>
            this.pledgeRepository.update(pledgeId, businessId, updateData)
        );

        return {
            success: true,
            pledge: updated.toJSON(),
            message: 'Pledge updated successfully',
        };
    }
}

module.exports = UpdatePledgeUseCase;