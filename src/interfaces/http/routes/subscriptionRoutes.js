// src/interfaces/http/routes/subscriptionRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');

const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();

// Get current subscription
router.get('/current', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('🔍 Getting subscription for user:', userId);
        
        // Get user's business
        const businesses = await businessRepo.findByUserId(userId);
        const business = businesses && businesses.length > 0 ? businesses[0] : null;
        
        if (!business) {
            console.log('⚠️ No business found for user:', userId);
            return res.json({
                success: true,
                plan: 'free',
                status: 'active',
            });
        }
        
        console.log('🔍 Business found:', business.id);
        
        // Get subscription
        const subscription = await subscriptionRepo.findActiveByBusinessId(business.id);
        
        if (subscription) {
            console.log('✅ Subscription found:', subscription.planId);
            res.json({
                success: true,
                plan: subscription.planId || 'free',
                status: subscription.status || 'active',
                features: subscription.features || {},
            });
        } else {
            console.log('⚠️ No active subscription found, defaulting to free');
            res.json({
                success: true,
                plan: 'free',
                status: 'active',
            });
        }
    } catch (error) {
        console.error('❌ Get subscription error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get subscription'
        });
    }
});

module.exports = router;