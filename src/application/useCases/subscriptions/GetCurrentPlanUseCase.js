// src/application/useCases/subscriptions/GetCurrentPlanUseCase.js

class GetCurrentPlanUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
        plansConfig,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
        this.plansConfig = plansConfig;
    }

    async execute({ businessId }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Check if business exists
        const business = await this.businessRepository.findById(businessId);
        if (!business) {
            throw new Error('Business not found');
        }

        // Get active subscription
        const subscription = await this.subscriptionRepository.findActiveByBusinessId(businessId);

        let planId = 'free';
        let planDetails = this.plansConfig.free;
        let status = 'inactive';
        let daysRemaining = 0;

        if (subscription) {
            planId = subscription.planId;
            planDetails = this.plansConfig[planId] || this.plansConfig.free;
            status = subscription.status;

            // Calculate days remaining for trial
            if (subscription.trialEndDate) {
                const now = new Date();
                const trialEnd = new Date(subscription.trialEndDate);
                daysRemaining = Math.max(0, Math.floor((trialEnd - now) / (1000 * 60 * 60 * 24)));
            }

            // Check if subscription is expired
            if (subscription.endDate && new Date() > new Date(subscription.endDate)) {
                status = 'expired';
            }
        }

        const isTrial = status === 'trial' && daysRemaining > 0;
        const isActive = status === 'active' || status === 'trial';

        return {
            success: true,
            plan: {
                id: planId,
                name: planDetails.name || planId,
                description: planDetails.description || '',
                status,
                isActive,
                isTrial,
                daysRemaining: isTrial ? daysRemaining : 0,
                features: planDetails.features || {},
                limits: planDetails.limits || {},
                price: planDetails.price || 0,
            },
            subscription: subscription ? subscription.toJSON() : null,
            availablePlans: Object.keys(this.plansConfig).map(key => ({
                id: key,
                name: this.plansConfig[key].name || key,
                price: this.plansConfig[key].price || 0,
            })),
        };
    }
}

module.exports = GetCurrentPlanUseCase;