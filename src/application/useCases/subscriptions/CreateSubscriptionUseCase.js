// src/application/useCases/subscriptions/CreateSubscriptionUseCase.js
// v3.0.0-prod — All writes wrapped in withTransaction.
//               Fixed three missing awaits that made this file return a Promise<Promise>.
//               SSOT-driven plan lookup.

const plans = require('../../../config/plans');
const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class CreateSubscriptionUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
    }

    async execute({
        businessId,
        planId = null,
        billingCycle = null,
        trialDays = null,
        paymentReference = null,
        status = null,
    }) {
        if (!businessId) throw new Error('Business ID is required');

        const business = await this.businessRepository.findById(businessId);
        if (!business) throw new Error('Business not found');

        const effectivePlanId = planId || plans.getTrialPlan();
        const plan = plans.getPlan(effectivePlanId);
        if (!plan) throw new Error(`Plan not found: ${effectivePlanId}`);

        const effectiveTrialDays = trialDays != null ? trialDays : plan.trialDays;
        const isTrial = effectiveTrialDays > 0 && status !== 'active';
        const effectiveCycle = billingCycle || (isTrial ? 'trial' : 'monthly');

        const startDate = new Date();
        let endDate = null;
        let trialEndDate = null;

        if (isTrial) {
            trialEndDate = new Date(startDate);
            trialEndDate.setDate(trialEndDate.getDate() + effectiveTrialDays);
        } else {
            endDate = new Date(startDate);
            if (effectiveCycle === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                endDate.setMonth(endDate.getMonth() + 1);
            }
        }

        // Cancel existing + create new, atomically.
        const saved = await withTransaction(async () => {
            const existing = await this.subscriptionRepository.findActiveByBusinessId(businessId);
            if (existing) {
                await this.subscriptionRepository.update(existing.id, {
                    status: 'cancelled',
                    endDate: new Date(),
                });
            }

            return await this.subscriptionRepository.create({
                businessId,
                planId: effectivePlanId,
                status: isTrial ? 'trial' : 'active',
                billingCycle: effectiveCycle,
                startDate,
                endDate,
                trialEndDate,
                features: plan.features,
                paymentReference: paymentReference || null,
            });
        });

        return {
            success: true,
            subscription: saved.toJSON ? saved.toJSON() : saved,
            message: isTrial
                ? `Trial started. ${effectiveTrialDays} days of ${plan.name} access.`
                : `${plan.name} subscription activated.`,
        };
    }
}

module.exports = CreateSubscriptionUseCase;