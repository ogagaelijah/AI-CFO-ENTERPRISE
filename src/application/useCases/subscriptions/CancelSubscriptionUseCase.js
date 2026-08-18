// src/application/useCases/subscriptions/CancelSubscriptionUseCase.js

class CancelSubscriptionUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
    }

    async execute({ businessId, reason = '' }) {
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
        if (!subscription) {
            throw new Error('No active subscription found');
        }

        // Cancel subscription
        subscription.cancel(reason);
        await this.subscriptionRepository.update(subscription.id, subscription);

        // Update business features to free plan
        // (This will be handled by the subscription guard)

        return {
            success: true,
            subscription: subscription.toJSON(),
            message: 'Subscription cancelled successfully. You will be downgraded to the Free plan.',
        };
    }
}

module.exports = CancelSubscriptionUseCase;