// src/interfaces/http/middleware/planGuard.js
// v1.1.0-prod — Postgres async. Awaits findActiveByBusinessId.

const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');

const subscriptionRepo = new SubscriptionRepository();

const planGuard = ({ feature, allowReadOnly = true } = {}) => {
    if (!feature) {
        throw new Error('planGuard: `feature` option is required');
    }

    return async (req, res, next) => {
        try {
            const businessId = req.user?.businessId;

            if (!businessId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }

            const subscription = await subscriptionRepo.findActiveByBusinessId(businessId);

            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    upgradeRequired: true,
                    reason: 'NO_SUBSCRIPTION',
                    message: 'No active subscription. Please subscribe to continue.',
                });
            }

            if (subscription.isReadOnly()) {
                if (allowReadOnly && req.method === 'GET') {
                    return next();
                }
                return res.status(403).json({
                    success: false,
                    upgradeRequired: true,
                    reason: 'TRIAL_EXPIRED',
                    message: 'Your trial has ended. Upgrade to continue.',
                    isReadOnly: true,
                });
            }

            if (!subscription.allows(feature)) {
                return res.status(403).json({
                    success: false,
                    upgradeRequired: true,
                    reason: 'PLAN_UPGRADE_REQUIRED',
                    feature,
                    currentPlan: subscription.planId,
                    message: `The ${feature} feature is not included in your current plan.`,
                });
            }

            return next();
        } catch (error) {
            console.error('❌ [planGuard] Error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify subscription access',
            });
        }
    };
};

module.exports = { planGuard };