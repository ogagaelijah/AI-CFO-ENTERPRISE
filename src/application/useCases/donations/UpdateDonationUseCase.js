// src/application/useCases/donations/UpdateDonationUseCase.js
// Editing a donation is restricted: amount, donorId, and pledgeId are
// locked once recorded. Only category, notes, referenceNumber, and
// metadata can change. This preserves ledger integrity — if you need
// to change the amount, delete this donation and record a new one.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class UpdateDonationUseCase {
    constructor({ donationRepository, customerRepository = null }) {
        if (!donationRepository) throw new Error('donationRepository is required');
        this.donationRepository = donationRepository;
        this.customerRepository = customerRepository;
    }

    async execute({
        donationId,
        businessId,
        category,
        method,
        referenceNumber,
        notes,
        metadata,
    }) {
        if (!donationId) throw new Error('Donation ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const existing = await this.donationRepository.findById(donationId, businessId);
        if (!existing) throw new Error('Donation not found');

        const updateData = {};
        if (category !== undefined) {
            const Donation = require('../../../domain/entities/Donation');
            if (!Donation.VALID_CATEGORIES.includes(category)) {
                throw new Error(`Invalid category: ${category}`);
            }
            updateData.category = category;
        }
        if (method !== undefined) {
            const Donation = require('../../../domain/entities/Donation');
            if (!Donation.VALID_METHODS.includes(method)) {
                throw new Error(`Invalid method: ${method}`);
            }
            updateData.method = method;
        }
        if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber;
        if (notes !== undefined) updateData.notes = notes;
        if (metadata !== undefined) updateData.metadata = metadata;

        if (Object.keys(updateData).length === 0) {
            return { success: true, donation: existing.toJSON(), message: 'No changes made' };
        }

        const updated = await withTransaction(async () =>
            this.donationRepository.update(donationId, businessId, updateData)
        );

        return {
            success: true,
            donation: updated.toJSON(),
            message: 'Donation updated successfully',
        };
    }
}

module.exports = UpdateDonationUseCase;