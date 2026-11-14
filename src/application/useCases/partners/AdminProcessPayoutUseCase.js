// src/application/useCases/partners/AdminProcessPayoutUseCase.js
const PartnerRepository = require('../../../infrastructure/database/sqlite/repositories/PartnerRepository');
const { query } = require('../../../infrastructure/database/sqlite/connection');

class AdminProcessPayoutUseCase {
  constructor() {
    this.partnerRepo = new PartnerRepository();
  }

  async execute({ payoutId, status }) {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new Error('Invalid status');
    }

    // 1. Find the payout
    const payoutRes = await query('SELECT * FROM partner_payouts WHERE id = $1', [payoutId]);
    const payout = payoutRes.rows[0];
    if (!payout) throw new Error('Payout not found');
    if (payout.status !== 'PENDING') throw new Error('Payout already processed');

    // 2. Update status
    await query(
      `UPDATE partner_payouts 
       SET status = $1, processed_at = NOW() 
       WHERE id = $2`,
      [status, payoutId]
    );

    // 3. If REJECTED, refund the money back to the partner's wallet
    if (status === 'REJECTED') {
      await this.partnerRepo.addToWallet(payout.partner_id, Number(payout.amount));
    }

    return { success: true };
  }
}

module.exports = AdminProcessPayoutUseCase;