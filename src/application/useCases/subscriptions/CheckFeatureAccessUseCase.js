// src/application/useCases/subscriptions/CheckFeatureAccessUseCase.js
// v2.0.0-prod — SSOT-based feature gating + read-only mode

const plans = require('../../../config/plans');

class CheckFeatureAccessUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
    }

    /**
     * Check if a business has access to a feature.
     *
     * @param {Object} params
     * @param {number} params.businessId
     * @param {string} params.feature
     * @returns {Promise<Object>} {
     *   success, hasAccess, feature, plan, isReadOnly, isTrial,
     *   daysRemaining, reason, message
     * }
     */
    async execute({ businessId, feature }) {
        if (!businessId) throw new Error('Business ID is required');
        if (!feature) throw new Error('Feature is required');

        const business = await this.businessRepository.findById(businessId);
        if (!business) throw new Error('Business not found');

        const subscription = await this.subscriptionRepository.findActiveByBusinessId(businessId);

        // ── No subscription at all → fallback plan, read-only if fallback has no access
        if (!subscription) {
            const fallbackPlanId = plans.getFallbackPlan();
            const hasAccess = plans.hasFeature(fallbackPlanId, feature);
            return {
                success: true,
                hasAccess: false,
                feature,
                plan: fallbackPlanId,
                isReadOnly: true,
                isTrial: false,
                daysRemaining: 0,
                reason: 'NO_SUBSCRIPTION',
                message: 'No active subscription. Please subscribe to access this feature.',
            };
        }

        // ── Read-only mode (expired trial or expired paid cycle)
        if (subscription.isReadOnly()) {
            return {
                success: true,
                hasAccess: false,
                feature,
                plan: subscription.planId,
                isReadOnly: true,
                isTrial: false,
                daysRemaining: 0,
                reason: 'TRIAL_EXPIRED',
                message: 'Your trial has ended. Upgrade to continue.',
            };
        }

        // ── During trial: grant pro-level access
        const effectivePlanId = subscription.isTrialActive()
            ? plans.getTrialPlan()
            : subscription.planId;

        const hasAccess = plans.hasFeature(effectivePlanId, feature);

        if (!hasAccess) {
            return {
                success: true,
                hasAccess: false,
                feature,
                plan: subscription.planId,
                effectivePlan: effectivePlanId,
                isReadOnly: false,
                isTrial: subscription.isTrialActive(),
                daysRemaining: subscription.daysRemaining(),
                reason: 'PLAN_UPGRADE_REQUIRED',
                message: `Your plan does not include this feature.`,
            };
        }

        return {
            success: true,
            hasAccess: true,
            feature,
            plan: subscription.planId,
            effectivePlan: effectivePlanId,
            isReadOnly: false,
            isTrial: subscription.isTrialActive(),
            daysRemaining: subscription.daysRemaining(),
            reason: null,
            message: 'Feature available',
        };
    }
}

module.exports = CheckFeatureAccessUseCase;