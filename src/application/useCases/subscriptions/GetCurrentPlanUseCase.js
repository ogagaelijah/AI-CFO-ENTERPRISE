// src/application/useCases/subscriptions/GetCurrentPlanUseCase.js
// v2.0.0-prod — Returns plan + trial + read-only state

const plans = require('../../../config/plans');

class GetCurrentPlanUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
    }

    async execute({ businessId }) {
        if (!businessId) throw new Error('Business ID is required');

        const business = await this.businessRepository.findById(businessId);
        if (!business) throw new Error('Business not found');

        const subscription = await this.subscriptionRepository.findActiveByBusinessId(businessId);

        // ── No subscription
        if (!subscription) {
            const fallbackPlanId = plans.getFallbackPlan();
            const fallbackPlan = plans.getPlan(fallbackPlanId);
            return {
                success: true,
                plan: {
                    id: fallbackPlanId,
                    name: fallbackPlan.name,
                    description: fallbackPlan.description,
                    price: fallbackPlan.pricing.monthly,
                    pricing: fallbackPlan.pricing,
                    currency: fallbackPlan.currency,
                    features: fallbackPlan.features,
                    limits: fallbackPlan.limits,
                },
                status: 'none',
                billingCycle: null,
                isActive: false,
                isTrial: false,
                isReadOnly: true,
                daysRemaining: 0,
                startDate: null,
                endDate: null,
                trialEndDate: null,
                message: 'No active subscription. Please subscribe to continue.',
            };
        }

        // ── Determine effective plan (trial upgrades to pro)
        const isTrial = subscription.isTrialActive();
        const effectivePlanId = isTrial ? plans.getTrialPlan() : subscription.planId;
        const plan = plans.getPlan(effectivePlanId);

        const isReadOnly = subscription.isReadOnly();
        const daysRemaining = subscription.daysRemaining();

        // Override status if read-only
        const status = isReadOnly
            ? 'expired'
            : (isTrial ? 'trial' : subscription.status);

        const message = isReadOnly
            ? 'Your trial has ended. Upgrade to continue.'
            : isTrial
              ? `Trial active — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining.`
              : 'Subscription active.';

        return {
            success: true,
            plan: {
                id: effectivePlanId,
                name: plan.name,
                description: plan.description,
                price: plan.pricing.monthly,
                pricing: plan.pricing,
                currency: plan.currency,
                features: plan.features,
                limits: plan.limits,
                trialDays: plan.trialDays,
            },
            status,
            subscriptionPlanId: subscription.planId,
            billingCycle: subscription.billingCycle,
            isActive: !isReadOnly,
            isTrial,
            isReadOnly,
            daysRemaining,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            trialEndDate: subscription.trialEndDate,
            message,
        };
    }
}

module.exports = GetCurrentPlanUseCase;