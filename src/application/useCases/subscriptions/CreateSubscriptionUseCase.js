// src/application/useCases/subscriptions/CreateSubscriptionUseCase.js
// v2.0.1-prod — 14-day Pro trial by default, SSOT-driven, no entity import

const plans = require('../../../config/plans');

class CreateSubscriptionUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
    }

    /**
     * Create a subscription.
     *
     * @param {Object} params
     * @param {number} params.businessId
     * @param {string} [params.planId] - Defaults to plans.getTrialPlan() ('pro')
     * @param {string} [params.billingCycle] - 'monthly' | 'yearly' | 'trial'
     * @param {number} [params.trialDays] - Defaults to plan's trialDays
     * @param {string} [params.paymentReference]
     * @param {string} [params.status] - 'trial' | 'active'
     */
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

        // ── Determine plan
        const effectivePlanId = planId || plans.getTrialPlan();
        const plan = plans.getPlan(effectivePlanId);
        if (!plan) throw new Error(`Plan not found: ${effectivePlanId}`);

        // ── Determine trial duration
        const effectiveTrialDays = trialDays != null
            ? trialDays
            : plan.trialDays;

        const isTrial = effectiveTrialDays > 0 && status !== 'active';

        // ── Determine billing cycle
        const effectiveCycle = billingCycle || (isTrial ? 'trial' : 'monthly');

        // ── Cancel any existing active subscription
        const existing = this.subscriptionRepository.findActiveByBusinessId(businessId);
        if (existing) {
            this.subscriptionRepository.update(existing.id, {
                status: 'cancelled',
                endDate: new Date(),
            });
        }

        // ── Calculate dates
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

        // ── Create subscription (plain object — repo hydrates the entity)
        const saved = this.subscriptionRepository.create({
            businessId,
            planId: effectivePlanId,
            status: isTrial ? 'trial' : 'active',
            billingCycle: effectiveCycle,
            startDate,
            endDate,
            trialEndDate,
            features: plan.features,
        });

        return {
            success: true,
            subscription: saved.toJSON(),
            message: isTrial
                ? `Trial started. ${effectiveTrialDays} days of ${plan.name} access.`
                : `${plan.name} subscription activated.`,
        };
    }
}

module.exports = CreateSubscriptionUseCase;