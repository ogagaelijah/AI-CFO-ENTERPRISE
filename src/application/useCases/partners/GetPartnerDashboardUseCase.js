const PartnerRepository = require('../../../infrastructure/database/sqlite/repositories/PartnerRepository');
const ReferralRepository = require('../../../infrastructure/database/sqlite/repositories/ReferralRepository');
const { query } = require('../../../infrastructure/database/sqlite/connection');

class GetPartnerDashboardUseCase {
  constructor() {
    this.partnerRepo = new PartnerRepository();
    this.referralRepo = new ReferralRepository();
  }

  async execute({ userId }) {
    const partner = await this.partnerRepo.findByUserId(userId);
    if (!partner) throw new Error('Partner profile not found.');

    // Fetch referral details with business names
    const referralsResult = await query(
      `SELECT r.*, b.name as business_name, b.industry
       FROM referrals r
       JOIN businesses b ON b.id = r.referred_business_id
       WHERE r.partner_id = $1
       ORDER BY r.created_at DESC`,
      [partner.id]
    );

    return {
      partner,
      referrals: referralsResult.rows,
      withdrawalThreshold: 10000
    };
  }
}

module.exports = GetPartnerDashboardUseCase;