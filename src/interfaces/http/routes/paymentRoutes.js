// src/interfaces/http/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/authMiddleware');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();

const FLW_SECRET = process.env.FLW_SECRET_KEY;
const FLW_PUBLIC = process.env.FLW_PUBLIC_KEY;
const FLW_ENCRYPTION = process.env.FLW_ENCRYPTION_KEY;

// =============================================
// INITIALIZE PAYMENT
// =============================================
router.post('/initialize', authMiddleware, async (req, res) => {
    try {
        const { plan, email, amount } = req.body;
        const userId = req.user.id;
        const userEmail = email || req.user.email;
        const userName = req.user.fullName || 'User';

        // Get user's business
        const businesses = await businessRepo.findByUserId(userId);
        const business = businesses && businesses.length > 0 ? businesses[0] : null;

        if (!business) {
            return res.status(400).json({
                success: false,
                message: 'Business not found'
            });
        }

        // Plan configuration
        const plans = {
            'pro': { amount: 5000, name: 'Pro Plan' },
            'business': { amount: 15000, name: 'Business Plan' }
        };

        const planConfig = plans[plan];
        if (!planConfig) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan selected'
            });
        }

        // Generate transaction reference
        const reference = `AICFO_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        console.log('🔍 Initializing payment:', {
            plan,
            userId,
            businessId: business.id,
            reference,
            amount: planConfig.amount
        });

        // Initialize Flutterwave transaction
        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            {
                tx_ref: reference,
                amount: planConfig.amount,
                currency: 'NGN',
                redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
                meta: {
                    userId: userId,
                    businessId: business.id,
                    plan: plan,
                },
                customer: {
                    email: userEmail,
                    name: userName,
                },
                customizations: {
                    title: 'AI CFO ENTERPRISE',
                    description: `${planConfig.name} Subscription`,
                    logo: 'https://your-logo-url.com/logo.png',
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${FLW_SECRET}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.data.status === 'success') {
            res.json({
                success: true,
                data: {
                    link: response.data.data.link,
                    reference: reference,
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.data.message || 'Payment initialization failed'
            });
        }
    } catch (error) {
        console.error('Payment initialization error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Payment initialization failed'
        });
    }
});

// =============================================
// VERIFY PAYMENT
// =============================================
router.get('/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        
        console.log('🔍 Verifying payment for reference:', reference);

        // Verify transaction with Flutterwave
        const response = await axios.get(
            `https://api.flutterwave.com/v3/transactions/${reference}/verify`,
            {
                headers: {
                    'Authorization': `Bearer ${FLW_SECRET}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        console.log('🔍 Flutterwave response status:', response.data.status);
        console.log('🔍 Transaction status:', response.data.data?.status);

        if (response.data.status === 'success' && response.data.data.status === 'successful') {
            const data = response.data.data;
            const meta = data.meta || {};
            
            // Get businessId from meta
            let businessId = meta.businessId;
            let userId = meta.userId;
            
            console.log('🔍 Meta from Flutterwave:', meta);

            // If not in meta, try to find by user from cookie
            if (!businessId) {
                try {
                    const token = req.cookies.token;
                    if (token) {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                        userId = decoded.id;
                        const businesses = await businessRepo.findByUserId(userId);
                        const business = businesses && businesses.length > 0 ? businesses[0] : null;
                        if (business) {
                            businessId = business.id;
                        }
                    }
                } catch (e) {
                    console.error('Auth error:', e.message);
                }
            }

            // If still no businessId, try to find by user from database
            if (!businessId && userId) {
                const businesses = await businessRepo.findByUserId(userId);
                const business = businesses && businesses.length > 0 ? businesses[0] : null;
                if (business) {
                    businessId = business.id;
                }
            }

            const plan = meta.plan || 'pro';

            console.log('🔍 Updating subscription for business:', businessId, 'plan:', plan);

            // Update subscription
            if (businessId) {
                // Check if subscription exists
                let existingSubscription = null;
                try {
                    existingSubscription = await subscriptionRepo.findActiveByBusinessId(businessId);
                } catch (e) {
                    console.log('⚠️ No active subscription found, will create new');
                }

                console.log('🔍 Existing subscription:', existingSubscription ? 'Found' : 'None');

                if (existingSubscription) {
                    await subscriptionRepo.update(existingSubscription.id, {
                        planId: plan,
                        status: 'active',
                    });
                    console.log('✅ Updated existing subscription to:', plan);
                } else {
                    await subscriptionRepo.create({
                        businessId: businessId,
                        planId: plan,
                        status: 'active',
                        startDate: new Date(),
                    });
                    console.log('✅ Created new subscription for plan:', plan);
                }
            } else {
                console.log('⚠️ No businessId found, skipping subscription update');
            }

            res.json({
                success: true,
                message: 'Payment verified successfully',
                data: {
                    plan: plan,
                    amount: data.amount,
                    reference: reference,
                    businessId: businessId,
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment verification failed',
                details: response.data
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Payment verification failed'
        });
    }
});

// =============================================
// WEBHOOK HANDLER
// =============================================
router.post('/webhook', async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['verif-hash'];
        const secretHash = process.env.FLW_WEBHOOK_SECRET || FLW_SECRET;

        if (signature !== secretHash) {
            return res.status(401).json({ status: 'error', message: 'Invalid signature' });
        }

        const event = req.body;
        console.log('🔍 Webhook received:', event.event);

        // Handle different event types
        if (event.event === 'charge.completed') {
            const data = event.data;
            const meta = data.meta || {};
            const plan = meta.plan || 'pro';
            const businessId = meta.businessId;

            console.log('🔍 Webhook: Business ID:', businessId, 'Plan:', plan, 'Status:', data.status);

            if (data.status === 'successful') {
                if (businessId) {
                    // Update subscription in database
                    let existingSubscription = null;
                    try {
                        existingSubscription = await subscriptionRepo.findActiveByBusinessId(businessId);
                    } catch (e) {
                        console.log('⚠️ No active subscription found');
                    }

                    if (existingSubscription) {
                        await subscriptionRepo.update(existingSubscription.id, {
                            planId: plan,
                            status: 'active',
                        });
                        console.log(`✅ Webhook: Updated subscription for business ${businessId} to ${plan}`);
                    } else {
                        await subscriptionRepo.create({
                            businessId: businessId,
                            planId: plan,
                            status: 'active',
                            startDate: new Date(),
                        });
                        console.log(`✅ Webhook: Created subscription for business ${businessId} for ${plan}`);
                    }
                } else {
                    console.log('⚠️ Webhook: No businessId in meta');
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

// =============================================
// GET PAYMENT STATUS
// =============================================
router.get('/status/:reference', authMiddleware, async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await axios.get(
            `https://api.flutterwave.com/v3/transactions/${reference}/verify`,
            {
                headers: {
                    'Authorization': `Bearer ${FLW_SECRET}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        res.json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get payment status'
        });
    }
});

module.exports = router;