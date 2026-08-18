// src/application/useCases/subscriptions/CreateSubscriptionUseCase.js

class CreateSubscriptionUseCase {
    constructor({
        subscriptionRepository,
        businessRepository,
        planRepository,
    }) {
        this.subscriptionRepository = subscriptionRepository;
        this.businessRepository = businessRepository;
        this.planRepository = planRepository;
    }

    async execute({
        businessId,
        planId = 'free',
        trialDays = 30,
        paymentReference = null,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Check if business exists
        const business = await this.businessRepository.findById(businessId);
        if (!business) {
            throw new Error('Business not found');
        }

        // Get plan details
        const plan = await this.planRepository.findById(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }

        // Check if business already has an active subscription
        const existingSubscription = await this.subscriptionRepository.findActiveByBusinessId(businessId);
        if (existingSubscription) {
            // Cancel existing subscription
            existingSubscription.status = 'cancelled';
            await this.subscriptionRepository.update(existingSubscription.id, existingSubscription);
        }

        // Calculate dates
        const startDate = new Date();
        let endDate = null;
        let trialEndDate = null;

        if (planId === 'free') {
            // Free plan has a trial period
            trialEndDate = new Date(startDate);
            trialEndDate.setDate(trialEndDate.getDate() + trialDays);
        } else {
            // Paid plans are monthly/yearly
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
        }

        // Create subscription
        const Subscription = require('../../../domain/entities/Subscription');
        const subscription = new Subscription({
            businessId,
            planId,
            status: 'trial',
            startDate,
            endDate,
            trialEndDate,
            features: plan.features || {},
            metadata: {
                paymentReference,
                trialDays,
            },
        });

        const savedSubscription = await this.subscriptionRepository.create(subscription);

        return {
            success: true,
            subscription: savedSubscription.toJSON(),
            message: `Subscription created successfully. ${planId === 'free' ? `Trial ends in ${trialDays} days.` : ''}`,
        };
    }
}

module.exports = CreateSubscriptionUseCase;