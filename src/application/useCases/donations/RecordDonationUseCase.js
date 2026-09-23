// src/application/useCases/donations/RecordDonationUseCase.js
// v1.0.0-prod — Records a donation atomically:
//   1. Insert donations row
//   2. If pledgeId set: apply amount to pledge (increments amountFulfilled,
//      flips to FULFILLED when settled)
//   3. Insert income row (Source: DONATION)
//   4. Insert payments row (payment_type='RECEIVED', reference_type='DONATION')

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class RecordDonationUseCase {
    constructor({
        donationRepository,
        pledgeRepository = null,
        customerRepository = null,
        incomeRepository,
        paymentRepository,
    }) {
        if (!donationRepository) throw new Error('donationRepository is required');
        if (!incomeRepository) throw new Error('incomeRepository is required');
        if (!paymentRepository) throw new Error('paymentRepository is required');
        this.donationRepository = donationRepository;
        this.pledgeRepository = pledgeRepository;
        this.customerRepository = customerRepository;
        this.incomeRepository = incomeRepository;
        this.paymentRepository = paymentRepository;
    }

    async execute({
        businessId,
        userId = null,
        donorId = null,
        pledgeId = null,
        amount,
        category = 'GENERAL',
        method = 'CASH',
        donationDate = new Date(),
        referenceNumber = null,
        notes = '',
        metadata = {},
    }) {
        if (!businessId) throw new Error('Business ID is required');

        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Donation amount must be a positive number');
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

        // Verify pledge ownership if provided
        let pledge = null;
        if (pledgeId) {
            if (!this.pledgeRepository) {
                throw new Error('pledgeRepository is required when pledgeId is set');
            }
            pledge = await this.pledgeRepository.findById(pledgeId, businessId);
            if (!pledge) throw new Error('Pledge not found');
            if (pledge.status === 'CANCELLED') {
                throw new Error('Cannot apply donation to a cancelled pledge');
            }
            if (pledge.status === 'FULFILLED') {
                throw new Error('Pledge is already fully fulfilled');
            }
            if (amt > pledge.balance) {
                throw new Error(
                    `Donation exceeds remaining pledge balance (₦${pledge.balance.toLocaleString()})`
                );
            }
        }

        const Donation = require('../../../domain/entities/Donation');
        const donation = new Donation({
            businessId,
            donorId: donorId || null,
            pledgeId: pledgeId || null,
            amount: amt,
            currency: 'NGN',
            category,
            method,
            donationDate,
            referenceNumber,
            notes,
            metadata,
        });

        const result = await withTransaction(async () => {
            // 1. Insert donation
            const saved = await this.donationRepository.create(donation);

            // 2. Apply to pledge (if linked)
            if (pledge) {
                const newFulfilled = Number(pledge.amountFulfilled) + amt;
                const newStatus = newFulfilled >= Number(pledge.amount)
                    ? 'FULFILLED'
                    : pledge.status;
                await this.pledgeRepository.update(pledge.id, businessId, {
                    amountFulfilled: newFulfilled,
                    status: newStatus,
                });
            }

            // 3. Income row (for the P&L)
            await this.incomeRepository.create({
                businessId,
                userId,
                amount: amt,
                source: `Donation — ${category}${donorId ? '' : ' (Anonymous)'}`,
                description: notes || `Donation recorded on ${String(donationDate).slice(0, 10)}`,
                date: donationDate,
                referenceType: 'DONATION',
                referenceId: saved.id,
                metadata: { donationId: saved.id, category, method },
            });

            // 4. Payments row (for the cash ledger)
            await this.paymentRepository.create({
                businessId,
                userId,
                type: 'RECEIVED',
                amount: amt,
                referenceType: 'DONATION',
                referenceId: saved.id,
                paymentDate: donationDate,
                paymentMethod: method,
                referenceNumber: referenceNumber || null,
                notes: notes || `Donation — ${category}`,
                metadata: { donationId: saved.id, category },
            });

            return saved;
        });

        return {
            success: true,
            donation: result.toJSON(),
            message: `Donation of ₦${amt.toLocaleString()} recorded`,
        };
    }
}

module.exports = RecordDonationUseCase;