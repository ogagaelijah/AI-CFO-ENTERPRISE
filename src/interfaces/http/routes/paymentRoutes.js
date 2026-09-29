// src/interfaces/http/routes/paymentRoutes.js
// v3.0.0-prod — Paystack integration. Flutterwave removed.

const express = require('express');
const router = express.Router();
const axios = require('axios');

const { authMiddleware } = require('../middleware/authMiddleware');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const ActivateSubscriptionUseCase = require('../../../application/useCases/subscription/ActivateSubscriptionUseCase');
const plans = require('../../../config/plans');
const logger = require('../../../shared/utils/logger');

const businessRepo = new BusinessRepository();
const activateSubscription = new ActivateSubscriptionUseCase();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

function paystackClient() {
    if (!PAYSTACK_SECRET) {
        throw new Error('PAYSTACK_SECRET_KEY is not set');
    }
    return axios.create({
        baseURL: PAYSTACK_BASE,
        timeout: 20000,
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
        },
    });
}

router.post('/initialize', authMiddleware, async (req, res) => {
    try {
        const { plan, billingCycle = 'monthly', email } = req.body || {};
        const userId = req.user.id;
        const userEmail = email || req.user.email;

        if (!userEmail) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const business = await businessRepo.findByUserIdFirst(userId);
        if (!business) {
            return res.status(400).json({ success: false, message: 'Business not found' });
        }

        const publicPlanIds = plans.getPublicPlanIds();
        if (!publicPlanIds.includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan selected' });
        }
        if (!['monthly', 'yearly'].includes(billingCycle)) {
            return res.status(400).json({ success: false, message: 'Invalid billing cycle' });
        }
        const amount = plans.getPricing(plan, billingCycle);
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid plan pricing' });
        }
        const planMeta = plans.getPlan(plan);

        const amountInKobo = Math.round(amount * 100);
        const reference = `AICFO_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const payload = {
            email: userEmail,
            amount: amountInKobo,
            currency: planMeta.currency,
            reference,
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
            metadata: {
                businessId: business.id,
                userId,
                plan,
                billingCycle,
            },
        };

        logger.info(
            { plan, billingCycle, amount, userId, businessId: business.id, reference },
            'paystack /initialize: requesting'
        );

        const client = paystackClient();
        const response = await client.post('/transaction/initialize', payload);

        if (!response.data || response.data.status !== true) {
            logger.error(
                { paystackResponse: response.data, reference },
                'paystack /initialize: non-success response'
            );
            return res.status(400).json({
                success: false,
                message: response.data?.message || 'Payment initialization failed',
            });
        }

        return res.json({
            success: true,
            data: {
                authorization_url: response.data.data.authorization_url,
                access_code: response.data.data.access_code,
                reference: response.data.data.reference,
                amount,
                plan,
                billingCycle,
            },
        });
    } catch (err) {
        logger.error({ err: err.message, stack: err.stack }, 'paystack /initialize: error');
        return res.status(500).json({
            success: false,
            message: err.message || 'Payment initialization failed',
        });
    }
});

router.get('/verify/:reference', authMiddleware, async (req, res) => {
    try {
        const { reference } = req.params;
        if (!reference) {
            return res.status(400).json({ success: false, message: 'Reference required' });
        }

        const client = paystackClient();
        const response = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);

        if (!response.data || response.data.status !== true) {
            return res.status(400).json({
                success: false,
                message: response.data?.message || 'Payment verification failed',
            });
        }

        const tx = response.data.data;
        if (tx.status !== 'success') {
            return res.status(400).json({
                success: false,
                message: `Transaction status is "${tx.status}"`,
                data: { status: tx.status, reference },
            });
        }

        const meta = tx.metadata || {};
        const planId = meta.plan;
        const billingCycle = meta.billingCycle === 'yearly' ? 'yearly' : 'monthly';
        let businessId = Number(meta.businessId);

        if (!Number.isInteger(businessId) || businessId <= 0) {
            const business = await businessRepo.findByUserIdFirst(req.user.id);
            businessId = business?.id;
        }

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot determine business for this transaction',
            });
        }
        if (!planId || !plans.getPlan(planId) || !plans.isPaidPlan(planId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan in payment metadata',
            });
        }

        const result = await activateSubscription.execute({
            businessId,
            planId,
            billingCycle,
            paystackReference: reference,
        });

        return res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                plan: planId,
                billingCycle,
                amount: tx.amount / 100,
                reference,
                businessId,
                activated: result.activated,
                skipped: result.skipped,
            },
        });
    } catch (err) {
        logger.error(
            { err: err.message, stack: err.stack, reference: req.params.reference },
            'paystack /verify: error'
        );
        return res.status(500).json({
            success: false,
            message: err.message || 'Payment verification failed',
        });
    }
});

module.exports = router;
