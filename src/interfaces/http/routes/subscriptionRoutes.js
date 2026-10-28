// src/interfaces/http/routes/subscriptionRoutes.js
// v2.2.1-prod — Team members inherit business subscription status.

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const CancelSubscriptionUseCase = require('../../../application/useCases/subscriptions/CancelSubscriptionUseCase');
const { query } = require('../../../infrastructure/database/sqlite/connection');
const plans = require('../../../config/plans');

const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();

const cancelSubscriptionUseCase = new CancelSubscriptionUseCase({
    subscriptionRepository: subscriptionRepo,
    businessRepository: businessRepo,
});

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

// ─────────────────────────────────────────────
// PUBLIC ROUTE
// ─────────────────────────────────────────────
router.get('/plans', (req, res) => {
    try {
        const publicPlans = plans.getPublicPlans().map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            pricing: p.pricing,
            currency: p.currency,
            trialDays: p.trialDays,
            features: p.features,
            limits: p.limits,
        }));

        res.json({ success: true, plans: publicPlans });
    } catch (error) {
        console.error('❌ Get plans error:', error.message);
        res.status(classifyError(error)).json({
            success: false,
            message: error.message || 'Failed to get plans',
        });
    }
});

router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/subscription/current — ALL ROLES
// ─────────────────────────────────────────────
router.get('/current', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Try to find a business owned by this user
        const ownedBusinesses = await businessRepo.findByUserId(userId);
        let business = ownedBusinesses?.[0] || null;

        // 2. If no owned business, check if they are a team member
        if (!business) {
            const memberQuery = await query(
                'SELECT business_id FROM business_members WHERE user_id = $1 AND status = $2 LIMIT 1',
                [userId, 'ACTIVE']
            );
            
            if (memberQuery.rows.length > 0) {
                const memberBusinessId = memberQuery.rows[0].business_id;
                business = await businessRepo.findById(memberBusinessId);
            }
        }

        if (!business) {
            return res.json({
                success: true,
                plan: null,
                status: 'none',
                isActive: false,
                isReadOnly: true,
                message: 'No business found',
            });
        }

        const subscription = await subscriptionRepo.findActiveByBusinessId(business.id);

        if (!subscription) {
            const fallbackPlanId = plans.getFallbackPlan();
            const fallbackPlan = plans.getPlan(fallbackPlanId);
            return res.json({
                success: true,
                plan: {
                    id: fallbackPlanId,
                    name: fallbackPlan.name,
                    description: fallbackPlan.description,
                    features: fallbackPlan.features,
                    limits: fallbackPlan.limits,
                    pricing: fallbackPlan.pricing,
                },
                status: 'none',
                isActive: false,
                isReadOnly: true,
                daysRemaining: 0,
                message: 'No active subscription',
            });
        }

        const isTrial = subscription.isTrialActive();
        const effectivePlanId = isTrial ? plans.getTrialPlan() : subscription.planId;
        const plan = plans.getPlan(effectivePlanId);

        const isReadOnly = subscription.isReadOnly();
        const status = isReadOnly
            ? 'expired'
            : (isTrial ? 'trial' : subscription.status);

        return res.json({
            success: true,
            plan: {
                id: effectivePlanId,
                name: plan.name,
                description: plan.description,
                features: plan.features,
                limits: plan.limits,
                pricing: plan.pricing,
            },
            subscriptionPlanId: subscription.planId,
            billingCycle: subscription.billingCycle,
            status,
            isActive: !isReadOnly,
            isTrial,
            isReadOnly,
            daysRemaining: subscription.daysRemaining(),
            trialEndDate: subscription.trialEndDate,
            endDate: subscription.endDate,
            message: isReadOnly
                ? 'Your trial has ended. Upgrade to continue.'
                : isTrial
                    ? `Trial active — ${subscription.daysRemaining()} day(s) remaining.`
                    : 'Subscription active.',
        });
    } catch (error) {
        console.error('❌ Get subscription error:', error.message);
        return res.status(classifyError(error)).json({
            success: false,
            message: error.message || 'Failed to get subscription',
        });
    }
});

// ─────────────────────────────────────────────
// POST /api/subscription/cancel — OWNER only
// ─────────────────────────────────────────────
router.post('/cancel', requireRole('OWNER'), async (req, res) => {
    try {
        const userId = req.user.id;
        const businesses = await businessRepo.findByUserId(userId);
        const business = businesses?.[0] || null;

        if (!business) {
            return res.status(400).json({
                success: false,
                message: 'Business not found or you are not the owner',
            });
        }

        const result = await cancelSubscriptionUseCase.execute({
            businessId: business.id,
            reason: req.body?.reason || '',
        });

        return res.json(result);
    } catch (error) {
        console.error('❌ Cancel subscription error:', error.message);
        return res.status(classifyError(error)).json({
            success: false,
            message: error.message || 'Failed to cancel subscription',
        });
    }
});

module.exports = router;