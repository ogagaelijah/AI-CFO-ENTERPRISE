// src/application/useCases/subscriptions/CancelSubscriptionUseCase.js
// v2.0.0-prod — Cancel → read-only until re-subscribe

class CancelSubscriptionUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
    }

    async execute({ businessId, reason = '' }) {
        if (!businessId) throw new Error('Business ID is required');

        const business = await this.businessRepository.findById(businessId);
        if (!business) throw new Error('Business not found');

        const subscription = await this.subscriptionRepository.findActiveByBusinessId(businessId);
        if (!subscription) throw new Error('No active subscription found');

        // Cancel immediately → read-only mode
        const updated = await this.subscriptionRepository.update(subscription.id, {
            status: 'cancelled',
            // End now so isReadOnly() returns true
            endDate: new Date(),
            trialEndDate: new Date(),
        });

        return {
            success: true,
            subscription: updated.toJSON(),
            isReadOnly: true,
            message: 'Subscription cancelled. Your account is now in read-only mode.',
        };
    }
}

module.exports = CancelSubscriptionUseCase;