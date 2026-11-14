const PartnerRepository = require('../../../infrastructure/database/sqlite/repositories/PartnerRepository');
const ReferralRepository = require('../../../infrastructure/database/sqlite/repositories/ReferralRepository');

class ProcessReferralCommissionUseCase {
  constructor() {
    this.partnerRepo = new PartnerRepository();
    this.referralRepo = new ReferralRepository();
  }

  async execute({ businessId, amountPaid }) {
    // 1. Check if this business was referred
    const referral = await this.referralRepo.findByBusinessId(businessId);
    
    // If no referral, or referral is already expired, do nothing.
    if (!referral || referral.status === 'EXPIRED') return null;

    // 2. Calculate 20%
    const commission = amountPaid * 0.20;
    if (commission <= 0) return null;

    // 3. Add to partner wallet
    await this.partnerRepo.addToWallet(referral.partnerId, commission);

    // 4. Increment months paid (this auto-expires the referral if it hits 6 months)
    const updatedReferral = await this.referralRepo.incrementMonthsPaid(referral.id);

    return { commission, updatedReferral };
  }
}

module.exports = ProcessReferralCommissionUseCase;