// src/interfaces/http/middleware/planGuard.js
// v1.0.0-prod — Route-level plan enforcement
//
// Behavior:
//   • No subscription → 403 upgradeRequired: NO_SUBSCRIPTION
//   • Read-only mode (expired trial/subscription):
//       - GET requests allowed (view-only)
//       - POST/PUT/PATCH/DELETE blocked with TRIAL_EXPIRED
//   • Feature not in plan → 403 upgradeRequired: PLAN_UPGRADE_REQUIRED
//
// Requires authMiddleware to have run first (req.user must be populated).

const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const plans = require('../../../config/plans');

const subscriptionRepo = new SubscriptionRepository();

/**
 * @param {Object} options
 * @param {string} options.feature - Feature key to check (e.g., 'analytics')
 * @param {boolean} [options.allowReadOnly=true] - Allow GET requests in read-only mode
 * @returns {Function} Express middleware
 */
const planGuard = ({ feature, allowReadOnly = true } = {}) => {
    if (!feature) {
        throw new Error('planGuard: `feature` option is required');
    }

    return async (req, res, next) => {
        try {
            const businessId = req.user?.businessId;

            // ── No auth context
            if (!businessId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
            }

            // ── Load subscription
            const subscription = subscriptionRepo.findActiveByBusinessId(businessId);

            // ── No subscription
            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    upgradeRequired: true,
                    reason: 'NO_SUBSCRIPTION',
                    message: 'No active subscription. Please subscribe to continue.',
                });
            }

            // ── Read-only mode
            if (subscription.isReadOnly()) {
                // Allow safe reads
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

            // ── Feature check (SSOT via plans.js)
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

            // ── Access granted
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