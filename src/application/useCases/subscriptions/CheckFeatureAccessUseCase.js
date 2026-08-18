// src/application/useCases/subscriptions/CheckFeatureAccessUseCase.js

class CheckFeatureAccessUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
        plansConfig,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
        this.plansConfig = plansConfig;
    }

    async execute({ businessId, feature }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!feature) {
            throw new Error('Feature is required');
        }

        // Get business
        const business = await this.businessRepository.findById(businessId);
        if (!business) {
            throw new Error('Business not found');
        }

        // Get active subscription
        const subscription = await this.subscriptionRepository.findActiveByBusinessId(businessId);

        // If no subscription, use free plan
        const planId = subscription ? subscription.planId : 'free';
        const plan = this.plansConfig[planId];

        if (!plan) {
            return {
                success: true,
                hasAccess: false,
                feature,
                plan: planId,
                message: 'Plan not found',
            };
        }

        // Check if feature is available in the plan
        const hasAccess = plan.features && plan.features[feature] === true;

        // Check usage limits for certain features
        let usage = null;
        if (hasAccess && subscription && plan.limits) {
            // Check if feature has usage limits
            const limit = plan.limits[feature];
            if (limit) {
                // Get current usage from subscription
                const usageData = subscription.metadata?.usage || {};
                const currentUsage = usageData[feature] || 0;

                if (currentUsage >= limit) {
                    // Feature limit exceeded
                    return {
                        success: true,
                        hasAccess: false,
                        feature,
                        plan: planId,
                        limit,
                        usage: currentUsage,
                        message: `Feature limit exceeded (${currentUsage}/${limit})`,
                    };
                }

                usage = {
                    current: currentUsage,
                    limit,
                    remaining: limit - currentUsage,
                };
            }
        }

        return {
            success: true,
            hasAccess,
            feature,
            plan: planId,
            usage,
            message: hasAccess ? 'Feature available' : 'Feature not available in your plan',
        };
    }
}

module.exports = CheckFeatureAccessUseCase;