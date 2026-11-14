const PartnerRepository = require('../../../infrastructure/database/sqlite/repositories/PartnerRepository');

class BecomePartnerUseCase {
  constructor() {
    this.partnerRepo = new PartnerRepository();
  }

  async execute({ userId, businessId, fullName }) {
    const existing = await this.partnerRepo.findByUserId(userId);
    if (existing) throw new Error('You are already a registered partner.');

    // Generate a unique code from name (e.g., "john-doe-829")
    let baseCode = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    let partnerCode = baseCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const check = await this.partnerRepo.findByCode(partnerCode);
      if (!check) {
        isUnique = true;
      } else {
        partnerCode = `${baseCode}-${Math.floor(100 + Math.random() * 900)}`;
        attempts++;
      }
    }

    const partner = await this.partnerRepo.create({
      userId,
      businessId,
      partnerCode
    });

    return partner;
  }
}

module.exports = BecomePartnerUseCase;