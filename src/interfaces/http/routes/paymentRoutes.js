// src/interfaces/http/routes/paymentRoutes.js
// v2.0.0-prod — SSOT-driven prices, monthly/yearly cycles

const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const { authMiddleware } = require('../middleware/authMiddleware');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const plans = require('../../../config/plans');

const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();

const FLW_SECRET = process.env.FLW_SECRET_KEY;

// ─────────────────────────────────────────────
// POST /api/payment/initialize
// Body: { plan: 'basic'|'pro'|'enterprise', billingCycle: 'monthly'|'yearly', email?, }
// ─────────────────────────────────────────────
router.post('/initialize', authMiddleware, async (req, res) => {
    try {
        const { plan, billingCycle = 'monthly', email } = req.body;
        const userId = req.user.id;
        const userEmail = email || req.user.email;
        const userName = req.user.fullName || 'User';

        // ── Get business
        const businesses = await businessRepo.findByUserId(userId);
        const business = businesses && businesses.length > 0 ? businesses[0] : null;
        if (!business) {
            return res.status(400).json({ success: false, message: 'Business not found' });
        }

        // ── Validate plan + cycle against SSOT
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

        const planName = plans.getPlan(plan).name;
        const cycleLabel = billingCycle === 'yearly' ? 'Annual' : 'Monthly';

        // ── Generate reference
        const reference = `AICFO_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        console.log('🔍 [payment/initialize]', {
            plan, billingCycle, amount, userId, businessId: business.id, reference,
        });

        // ── Call Flutterwave
        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            {
                tx_ref: reference,
                amount,
                currency: plans.getPlan(plan).currency,
                redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
                meta: {
                    userId,
                    businessId: business.id,
                    plan,
                    billingCycle,
                },
                customer: { email: userEmail, name: userName },
                customizations: {
                    title: 'AI CFO ENTERPRISE',
                    description: `${planName} Plan (${cycleLabel})`,
                    logo: 'https://your-logo-url.com/logo.png',
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.status === 'success') {
            return res.json({
                success: true,
                data: {
                    link: response.data.data.link,
                    reference,
                    amount,
                    plan,
                    billingCycle,
                },
            });
        }

        return res.status(400).json({
            success: false,
            message: response.data.message || 'Payment initialization failed',
        });
    } catch (error) {
        console.error('❌ Payment initialization error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Payment initialization failed',
        });
    }
});

// ─────────────────────────────────────────────
// GET /api/payment/verify/:reference
// ─────────────────────────────────────────────
router.get('/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await axios.get(
            `https://api.flutterwave.com/v3/transactions/${reference}/verify`,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.status !== 'success' || response.data.data.status !== 'successful') {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed',
                details: response.data,
            });
        }

        const data = response.data.data;
        const meta = data.meta || {};
        const plan = meta.plan;
        const billingCycle = meta.billingCycle || 'monthly';
        let businessId = meta.businessId;
        let userId = meta.userId;

        // Fallbacks if meta missing
        if (!businessId && userId) {
            const businesses = await businessRepo.findByUserId(userId);
            businessId = businesses?.[0]?.id || null;
        }

        // Validate plan
        if (!plan || !plans.getPlan(plan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan in payment metadata',
            });
        }

        // Update or create subscription
        if (businessId) {
            const existing = subscriptionRepo.findActiveByBusinessId(businessId);

            const now = new Date();
            const endDate = new Date(now);
            if (billingCycle === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                endDate.setMonth(endDate.getMonth() + 1);
            }

            if (existing) {
                subscriptionRepo.update(existing.id, {
                    planId: plan,
                    billingCycle,
                    status: 'active',
                    startDate: now,
                    endDate,
                    trialEndDate: null,
                    features: plans.getFeatures(plan),
                });
            } else {
                subscriptionRepo.create({
                    businessId,
                    planId: plan,
                    billingCycle,
                    status: 'active',
                    startDate: now,
                    endDate,
                    features: plans.getFeatures(plan),
                });
            }
        }

        return res.json({
            success: true,
            message: 'Payment verified successfully',
            data: { plan, billingCycle, amount: data.amount, reference, businessId },
        });
    } catch (error) {
        console.error('❌ Payment verification error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Payment verification failed',
        });
    }
});

// ─────────────────────────────────────────────
// POST /api/payment/webhook  (PUBLIC — Flutterwave calls this)
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['verif-hash'];
        const secretHash = process.env.FLW_WEBHOOK_SECRET || FLW_SECRET;

        if (signature !== secretHash) {
            return res.status(401).json({ status: 'error', message: 'Invalid signature' });
        }

        const event = req.body;
        if (event.event !== 'charge.completed') return res.sendStatus(200);

        const data = event.data;
        const meta = data.meta || {};
        const plan = meta.plan;
        const billingCycle = meta.billingCycle || 'monthly';
        const businessId = meta.businessId;

        if (data.status === 'successful' && businessId && plan && plans.getPlan(plan)) {
            const existing = subscriptionRepo.findActiveByBusinessId(businessId);

            const now = new Date();
            const endDate = new Date(now);
            if (billingCycle === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                endDate.setMonth(endDate.getMonth() + 1);
            }

            if (existing) {
                subscriptionRepo.update(existing.id, {
                    planId: plan,
                    billingCycle,
                    status: 'active',
                    startDate: now,
                    endDate,
                    trialEndDate: null,
                    features: plans.getFeatures(plan),
                });
            } else {
                subscriptionRepo.create({
                    businessId,
                    planId: plan,
                    billingCycle,
                    status: 'active',
                    startDate: now,
                    endDate,
                    features: plans.getFeatures(plan),
                });
            }
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        return res.sendStatus(500);
    }
});

module.exports = router;