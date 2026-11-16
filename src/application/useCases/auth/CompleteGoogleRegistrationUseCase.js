// src/application/useCases/auth/CompleteGoogleRegistrationUseCase.js
// v1.0.0 — Creates a user and business for a new Google sign-up.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const crypto = require('crypto');
const plans = require('../../../config/plans');

class CompleteGoogleRegistrationUseCase {
    constructor(userRepo, businessRepo, memberRepo, subscriptionRepo, partnerRepo, referralRepo) {
        this.userRepo = userRepo;
        this.businessRepo = businessRepo;
        this.memberRepo = memberRepo;
        this.subscriptionRepo = subscriptionRepo;
        this.partnerRepo = partnerRepo;
        this.referralRepo = referralRepo;
    }

    async execute({ email, fullName, googleId, businessName, industry, normalizedPhone, ref }) {
        let partnerId = null;
        if (ref) {
            const partner = await this.partnerRepo.findByCode(ref);
            if (partner) partnerId = partner.id;
        }

        const uniqueTelegramId = `web_google_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        return await withTransaction(async () => {
            const u = await this.userRepo.create({ 
                telegramId: uniqueTelegramId, 
                email, 
                phoneNumber: normalizedPhone, 
                fullName, 
                emailVerified: true, // Google verified
                googleId,
                authProvider: 'google',
                passwordChangedAt: new Date().toISOString() 
            });

            const b = await this.businessRepo.create({ userId: u.id, name: businessName, industry });
            
            if (partnerId) {
                await this.businessRepo.updateReferredBy(b.id, partnerId);
                await this.referralRepo.create({ partnerId, referredBusinessId: b.id });
            }

            await this.memberRepo.create({ businessId: b.id, userId: u.id, role: 'OWNER', status: 'ACTIVE', invitedBy: null, invitedAt: null, acceptedAt: new Date().toISOString() });
            
            const tpId = plans.getTrialPlan(); 
            const tp = plans.getPlan(tpId); 
            const tDays = plans.getTrialDays(tpId);
            const tEnd = new Date(); 
            tEnd.setDate(tEnd.getDate() + tDays);
            
            await this.subscriptionRepo.create({ businessId: b.id, planId: tpId, status: 'trial', billingCycle: 'trial', startDate: new Date(), endDate: null, trialEndDate: tEnd, features: tp.features });
            
            return { user: u, business: b, trialPlanId: tpId, trialPlan: tp, trialDays: tDays, trialEndDate: tEnd };
        });
    }
}

module.exports = CompleteGoogleRegistrationUseCase;