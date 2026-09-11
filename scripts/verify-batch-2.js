// scripts/verify-batch-2.js
const { SubscriptionRepository } = require('../src/infrastructure/database/sqlite/repositories/SubscriptionRepository');
const CheckFeatureAccessUseCase = require('../src/application/useCases/subscriptions/CheckFeatureAccessUseCase');
const BusinessRepository = require('../src/infrastructure/database/sqlite/repositories/BusinessRepository');

(async () => {
    const subRepo = new SubscriptionRepository();
    const bizRepo = new BusinessRepository();

    const businessId = 1;
    const sub = subRepo.findActiveByBusinessId(businessId);

    console.log('=== Current subscription ===');
    console.log(sub ? sub.toJSON() : '(none)');
    console.log('');
    console.log('isTrialActive:', sub?.isTrialActive());
    console.log('isReadOnly:', sub?.isReadOnly());
    console.log('daysRemaining:', sub?.daysRemaining());

    const check = new CheckFeatureAccessUseCase({
        subscriptionRepository: subRepo,
        businessRepository: bizRepo,
    });

    console.log('');
    console.log('=== Feature access checks ===');
    for (const feature of ['sales', 'reports_executive', 'analytics', 'ai_advisor', 'reports_export']) {
        const result = await check.execute({ businessId, feature });
        console.log(`${feature.padEnd(20)} → hasAccess=${result.hasAccess}  reason=${result.reason || 'ok'}`);
    }
})();