// src/application/useCases/partners/RequestPayoutUseCase.js
const PartnerRepository = require('../../../infrastructure/database/sqlite/repositories/PartnerRepository');
const { query } = require('../../../infrastructure/database/sqlite/connection');

class RequestPayoutUseCase {
  constructor() {
    this.partnerRepo = new PartnerRepository();
  }

  async execute({ userId, amount, bankDetails }) {
    const partner = await this.partnerRepo.findByUserId(userId);
    if (!partner) throw new Error('Partner profile not found');

    const requestAmount = Number(amount);
    if (!Number.isFinite(requestAmount) || requestAmount < 10000) {
      throw new Error('Minimum withdrawal amount is ₦10,000');
    }

    if (partner.walletBalance < requestAmount) {
      throw new Error('Insufficient wallet balance');
    }

    // 1. Deduct from wallet immediately to prevent double-spending
    const newBalance = await this.partnerRepo.deductFromWallet(partner.id, requestAmount);
    if (newBalance === null) throw new Error('Failed to deduct wallet balance');

    // 2. Create the payout record
    const result = await query(
      `INSERT INTO partner_payouts (partner_id, amount, status, bank_details)
       VALUES ($1, $2, 'PENDING', $3)
       RETURNING id`,
      [partner.id, requestAmount, bankDetails ? JSON.stringify(bankDetails) : null]
    );

    return { payoutId: result.rows[0].id, newBalance };
  }
}

module.exports = RequestPayoutUseCase;