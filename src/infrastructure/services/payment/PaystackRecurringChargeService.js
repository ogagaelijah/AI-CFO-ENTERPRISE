const axios = require('axios'); // Assuming you have axios, or use native fetch
const logger = require('../../../shared/utils/logger');

class PaystackRecurringChargeService {
    async charge(authorizationCode, email, amountKobo, planId) {
        try {
            const response = await axios.post(
                'https://api.paystack.co/transaction/charge_authorization',
                {
                    authorization_code: authorizationCode,
                    email: email,
                    amount: amountKobo,
                    metadata: {
                        planId,
                        billingCycle: 'monthly'
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.data;
        } catch (error) {
            logger.error({ err: error.message, authCode: authorizationCode }, 'Paystack recurring charge failed');
            throw error;
        }
    }
}

module.exports = PaystackRecurringChargeService;