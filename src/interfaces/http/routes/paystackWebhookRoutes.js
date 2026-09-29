// src/interfaces/http/routes/paystackWebhookRoutes.js
// v1.0.0-prod
//
// Paystack webhook endpoint. Mounted BEFORE express.json() in server.js so
// req.body arrives as a raw Buffer and signature verification can run against
// the exact bytes Paystack signed.
//
// This file contains NO business logic. It hands the raw request to
// HandlePaystackWebhookUseCase and forwards the use case's response as-is.

const express = require('express');
const router = express.Router();

const HandlePaystackWebhookUseCase = require('../../../application/useCases/payment/HandlePaystackWebhookUseCase');

const handleWebhook = new HandlePaystackWebhookUseCase();

// Scoped raw-body parser — ONLY for this router. Does not affect other routes.
router.use(express.raw({ type: 'application/json', limit: '1mb' }));

router.post('/paystack', async (req, res) => {
    try {
        const { httpStatus, body } = await handleWebhook.execute(req);
        return res.status(httpStatus).json(body);
    } catch (err) {
        // Contract: HandlePaystackWebhookUseCase never throws. If this fires,
        // log and return 200 so Paystack stops retrying.
        // eslint-disable-next-line no-console
        console.error('❌ paystackWebhookRoutes: unexpected throw', err);
        return res.status(200).json({ status: 'error', message: 'Internal handling error' });
    }
});

// Legacy Flutterwave webhook — returns 404 now. Full removal in P-10.
router.post('/flutterwave', (_req, res) => {
    return res.status(404).json({ status: 'error', message: 'Not found' });
});

module.exports = router;