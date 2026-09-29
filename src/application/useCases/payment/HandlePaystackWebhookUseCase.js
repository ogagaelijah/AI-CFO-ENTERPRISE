// src/application/useCases/payment/HandlePaystackWebhookUseCase.js
// v1.1.0-prod
//
// Orchestrator for incoming Paystack webhook events.
//
// v1.1.0 change — fixes a bug found in P-9.3 testing:
//   A charge.success event with a metadata.businessId that does not exist in
//   the businesses table previously caused the subscription activation to
//   attempt an INSERT, which tripped a foreign key constraint. The FK error
//   propagated out of _dispatch, was caught by execute(), and marked the
//   event FAILED. The retry sweep would then retry five times and eventually
//   dead-letter an event that could never succeed.
//   Fix: _handleChargeSuccess now validates the business exists BEFORE calling
//   ActivateSubscriptionUseCase. If the business is missing, the event is
//   marked PROCESSED (nothing to retry) with a warning logged, and the row's
//   business_id remains NULL (the FK allows NULL by design).
//
// Contract with the route (paystackWebhookRoutes.js):
//   - Returns { httpStatus, body } — the route sends this as-is
//   - httpStatus is ALWAYS 200 for events that were recorded (even on failure),
//     because Paystack retries on non-2xx and we control retries via our own
//     FAILED-status sweep
//   - httpStatus is 401 ONLY when signature verification fails — in that case
//     we do NOT write to the DB
//   - httpStatus is 400 ONLY for malformed payloads AFTER signature verification
//     passed
//
// Never throws to the route. All errors are caught, logged, and returned as
// structured responses.

const PaystackSignatureVerifier = require('../../services/payment/PaystackSignatureVerifier');
const ActivateSubscriptionUseCase = require('../subscription/ActivateSubscriptionUseCase');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const { query } = require('../../../infrastructure/database/sqlite/connection');
const logger = require('../../../shared/utils/logger');

class HandlePaystackWebhookUseCase {
    constructor(opts = {}) {
        this.verifier = opts.verifier || new PaystackSignatureVerifier();
        this.activate = opts.activate || new ActivateSubscriptionUseCase();
        this.businessRepo = opts.businessRepo || new BusinessRepository();
        this.logger = opts.logger || logger;
    }

    /**
     * @param {import('express').Request} req — MUST have req.body as Buffer
     * @returns {Promise<{ httpStatus: number, body: object }>}
     */
    async execute(req) {
        // ── 1. Signature verification (fail closed)
        const verifyResult = this.verifier.verify(req);
        if (!verifyResult.valid) {
            this.logger.warn(
                { reason: verifyResult.reason, url: req.originalUrl },
                'paystack webhook: signature rejected'
            );
            return {
                httpStatus: 401,
                body: { status: 'error', message: 'Invalid signature' },
            };
        }

        // ── 2. Parse the raw body
        let event;
        try {
            event = JSON.parse(req.body.toString('utf8'));
        } catch (err) {
            this.logger.error(
                { err: err.message, url: req.originalUrl },
                'paystack webhook: JSON parse failed after valid signature'
            );
            return {
                httpStatus: 400,
                body: { status: 'error', message: 'Malformed payload' },
            };
        }

        // ── 3. Extract minimal identity
        const eventId = event?.data?.id ? `evt_${event.data.id}` : null;
        const eventType = event?.event || null;
        const paystackRef = event?.data?.reference || null;

        if (!eventId || !eventType) {
            this.logger.error(
                { hasEventId: Boolean(eventId), eventType, url: req.originalUrl },
                'paystack webhook: missing event.id or event type'
            );
            return {
                httpStatus: 200,
                body: { status: 'error', message: 'Missing event identity' },
            };
        }

        // ── 4. Idempotency: insert with ON CONFLICT DO NOTHING
        let eventRowId = null;
        let isDuplicate = false;
        try {
            const insertResult = await query(
                `INSERT INTO paystack_webhook_events
                    (event_id, event_type, paystack_ref, payload, status)
                 VALUES ($1, $2, $3, $4, 'PROCESSING')
                 ON CONFLICT (event_id) DO NOTHING
                 RETURNING id`,
                [eventId, eventType, paystackRef, JSON.stringify(event)]
            );

            if (insertResult.rowCount === 0) {
                isDuplicate = true;
            } else {
                eventRowId = insertResult.rows[0].id;
            }
        } catch (err) {
            this.logger.error(
                { err: err.message, eventId, eventType },
                'paystack webhook: failed to record event'
            );
            return {
                httpStatus: 200,
                body: { status: 'error', message: 'Recording failed' },
            };
        }

        if (isDuplicate) {
            this.logger.info(
                { eventId, eventType },
                'paystack webhook: duplicate event, skipped'
            );
            return {
                httpStatus: 200,
                body: { status: 'success', message: 'Duplicate event ignored' },
            };
        }

        // ── 5. Dispatch by event type
        try {
            const dispatchResult = await this._dispatch(eventType, event);

            // ── 6. Mark PROCESSED
            await query(
                `UPDATE paystack_webhook_events
                 SET status = 'PROCESSED',
                     processed_at = NOW(),
                     business_id = COALESCE($1, business_id),
                     subscription_id = COALESCE($2, subscription_id)
                 WHERE id = $3`,
                [
                    dispatchResult.businessId ?? null,
                    dispatchResult.subscriptionId ?? null,
                    eventRowId,
                ]
            );

            this.logger.info(
                {
                    eventId,
                    eventType,
                    businessId: dispatchResult.businessId,
                    activated: dispatchResult.activated,
                    skipped: dispatchResult.skipped,
                },
                'paystack webhook: processed'
            );

            return {
                httpStatus: 200,
                body: { status: 'success' },
            };
        } catch (err) {
            // ── 7. Mark FAILED — the retry sweep will pick this up
            try {
                await query(
                    `UPDATE paystack_webhook_events
                     SET status = 'FAILED',
                         error_message = $1
                     WHERE id = $2`,
                    [String(err.message || err).slice(0, 1000), eventRowId]
                );
            } catch (updateErr) {
                this.logger.error(
                    { err: updateErr.message, eventRowId },
                    'paystack webhook: failed to mark event FAILED'
                );
            }

            this.logger.error(
                { err: err.message, stack: err.stack, eventId, eventType },
                'paystack webhook: dispatch failed'
            );

            return {
                httpStatus: 200,
                body: { status: 'success', message: 'Accepted for retry' },
            };
        }
    }

    /**
     * Dispatch by event type. Returns { businessId, subscriptionId, activated, skipped }.
     * Throws if dispatch itself fails (caller marks event FAILED).
     *
     * @private
     */
    async _dispatch(eventType, event) {
        switch (eventType) {
            case 'charge.success':
                return this._handleChargeSuccess(event);

            case 'charge.failed':
                return {
                    businessId: this._extractBusinessId(event),
                    subscriptionId: null,
                    activated: false,
                    skipped: true,
                };

            case 'subscription.create':
            case 'subscription.disable':
            case 'invoice.create':
            case 'invoice.payment_failed':
                return {
                    businessId: this._extractBusinessId(event),
                    subscriptionId: null,
                    activated: false,
                    skipped: true,
                };

            default:
                this.logger.info(
                    { eventType },
                    'paystack webhook: unhandled event type, recorded only'
                );
                return {
                    businessId: this._extractBusinessId(event),
                    subscriptionId: null,
                    activated: false,
                    skipped: true,
                };
        }
    }

    /**
     * @private
     */
    async _handleChargeSuccess(event) {
        const businessId = this._extractBusinessId(event);
        const planId = this._extractPlanId(event);
        const billingCycle = this._extractBillingCycle(event);

        // No business in metadata — cannot activate, but this is not a
        // transient failure. Mark skipped, log a warning.
        if (!businessId) {
            this.logger.warn(
                { reference: event?.data?.reference },
                'paystack webhook: charge.success with no business_id in metadata'
            );
            return { businessId: null, subscriptionId: null, activated: false, skipped: true };
        }

        // No plan in metadata — same reasoning.
        if (!planId) {
            this.logger.warn(
                { businessId, reference: event?.data?.reference },
                'paystack webhook: charge.success with no plan in metadata'
            );
            return { businessId, subscriptionId: null, activated: false, skipped: true };
        }

        // v1.1.0 — validate the business exists BEFORE activation.
        // If the business does not exist, activation would trip a foreign key
        // constraint and mark the event FAILED, which then retries pointlessly
        // and eventually dead-letters. Missing business is a permanent
        // condition — log, skip, move on.
        const businessExists = await this._businessExists(businessId);
        if (!businessExists) {
            this.logger.warn(
                { businessId, reference: event?.data?.reference },
                'paystack webhook: charge.success for nonexistent business — skipping activation'
            );
            return { businessId: null, subscriptionId: null, activated: false, skipped: true };
        }

        const result = await this.activate.execute({
            businessId,
            planId,
            billingCycle,
            paystackEventId: `evt_${event?.data?.id}`,
            paystackReference: event?.data?.reference || null,
        });

        return {
            businessId: result.businessId,
            subscriptionId: result.subscription?.id ?? null,
            activated: result.activated,
            skipped: result.skipped,
        };
    }

    /**
     * @private
     */
    async _businessExists(businessId) {
        try {
            const biz = await this.businessRepo.findById(businessId);
            return biz !== null;
        } catch (err) {
            this.logger.error(
                { err: err.message, businessId },
                'paystack webhook: business existence check failed'
            );
            // Fail closed — if we cannot verify the business exists, do not
            // attempt activation (avoids the FK trip we are fixing). The event
            // is marked PROCESSED with a warning.
            return false;
        }
    }

    /**
     * @private
     */
    _extractBusinessId(event) {
        const meta = event?.data?.metadata || {};
        const raw = meta.businessId ?? meta.business_id;
        if (raw === undefined || raw === null) return null;
        const n = Number(raw);
        return Number.isInteger(n) && n > 0 ? n : null;
    }

    _extractPlanId(event) {
        const meta = event?.data?.metadata || {};
        const raw = meta.plan ?? meta.planId ?? meta.plan_id;
        return typeof raw === 'string' && raw.length > 0 ? raw : null;
    }

    _extractBillingCycle(event) {
        const meta = event?.data?.metadata || {};
        const raw = meta.billingCycle ?? meta.billing_cycle;
        return raw === 'yearly' ? 'yearly' : 'monthly';
    }
}

module.exports = HandlePaystackWebhookUseCase;