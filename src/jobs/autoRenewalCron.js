const cron = require('node-cron');
const SubscriptionRepository = require('../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const UserRepository = require('../infrastructure/database/sqlite/repositories/UserRepository');
const PaystackRecurringChargeService = require('../infrastructure/services/payment/PaystackRecurringChargeService');
const plans = require('../config/plans');
const logger = require('../shared/utils/logger');

const subRepo = new SubscriptionRepository();
const userRepo = new UserRepository();
const chargeService = new PaystackRecurringChargeService();

async function processAutoRenewals() {
    logger.info('auto-renewal: cron started');
    
    try {
        const dueSubscriptions = await subRepo.findDueForRenewal();
        
        for (const sub of dueSubscriptions) {
            // Find the owner's email
            const business = await subRepo._query('SELECT user_id FROM businesses WHERE id = $1', [sub.businessId]);
            const owner = await userRepo.findById(business.rows[0].user_id);
            
            if (!owner || !owner.email) continue;

            const plan = plans.getPlan(sub.planId);
            const amountKobo = plan.pricing.monthly * 100; // convert Naira to Kobo

            try {
                logger.info({ businessId: sub.businessId, planId: sub.planId }, 'auto-renewal: charging card');
                await chargeService.charge(sub.paystackAuthorizationCode, owner.email, amountKobo, sub.planId);
                
                // NOTE: We do NOT manually update the DB here. 
                // Paystack will fire the `charge.success` webhook, which our HandlePaystackWebhookUseCase 
                // will process to extend the subscription and pay the partner!
                
            } catch (error) {
                logger.error({ businessId: sub.businessId, err: error.message }, 'auto-renewal: charge failed');
                // Optional: If charge fails, mark subscription as expired or send an email to the user to manually pay.
            }
        }
    } catch (error) {
        logger.error({ err: error.message }, 'auto-renewal: cron crashed');
    }
}

const startAutoRenewalCron = () => {
    // Runs every day at 2:00 AM Africa/Lagos
    cron.schedule('0 2 * * *', processAutoRenewals, { timezone: 'Africa/Lagos' });
};

module.exports = { startAutoRenewalCron };