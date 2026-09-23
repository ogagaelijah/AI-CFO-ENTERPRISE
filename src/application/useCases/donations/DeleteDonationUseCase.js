// src/application/useCases/donations/DeleteDonationUseCase.js
// Deletes a donation AND reverses its effects:
//   - If linked to a pledge, decrements pledge.amountFulfilled
//     (flipping FULFILLED back to ACTIVE if needed)
//   - Removes the linked payments row (reference_type='DONATION')
//   - Removes the linked income row (reference_type='DONATION')
// All in a single transaction.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class DeleteDonationUseCase {
    constructor({
        donationRepository,
        pledgeRepository = null,
        incomeRepository = null,
        paymentRepository = null,
    }) {
        if (!donationRepository) throw new Error('donationRepository is required');
        this.donationRepository = donationRepository;
        this.pledgeRepository = pledgeRepository;
        this.incomeRepository = incomeRepository;
        this.paymentRepository = paymentRepository;
    }

    async execute({ donationId, businessId }) {
        if (!donationId) throw new Error('Donation ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const donation = await this.donationRepository.findById(donationId, businessId);
        if (!donation) throw new Error('Donation not found');

        await withTransaction(async () => {
            // 1. Reverse pledge fulfilment if linked
            if (donation.pledgeId && this.pledgeRepository) {
                const pledge = await this.pledgeRepository.findById(
                    donation.pledgeId, businessId
                );
                if (pledge) {
                    const newFulfilled = Math.max(
                        0,
                        Number(pledge.amountFulfilled) - Number(donation.amount)
                    );
                    const newStatus = pledge.status === 'FULFILLED' && newFulfilled < Number(pledge.amount)
                        ? 'ACTIVE'
                        : pledge.status;
                    await this.pledgeRepository.update(pledge.id, businessId, {
                        amountFulfilled: newFulfilled,
                        status: newStatus,
                    });
                }
            }

            // 2. Delete the linked payments row
            if (this.paymentRepository) {
                const payments = await this.paymentRepository.findByReference(
                    businessId, 'DONATION', donationId
                );
                for (const p of payments) {
                    await this.paymentRepository.delete(p.id);
                }
            }

            // 3. Delete the linked income row
            if (this.incomeRepository) {
                const incomes = await this.incomeRepository.findByReference?.(businessId, 'DONATION', donationId) || [];
                for (const inc of incomes) {
                    await this.incomeRepository.delete(inc.id);
                }
            }

            // 4. Delete the donation itself
            await this.donationRepository.delete(donationId, businessId);
        });

        return {
            success: true,
            message: `Donation of ₦${Number(donation.amount).toLocaleString()} deleted`,
        };
    }
}

module.exports = DeleteDonationUseCase;