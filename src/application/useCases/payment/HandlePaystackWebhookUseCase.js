// src/application/useCases/payment/HandlePaystackWebhookUseCase.js
// v1.0.0-prod
//
// Orchestrator for incoming Paystack webhook events.
//
// Called by paystackWebhookRoutes.js (P-6) after the route has already:
//   1. Mounted express.raw({ type: 'application/json' }) so req.body is a Buffer
//   2. NOT parsed the body
//
// This use case is responsible for:
//   1. Verifying the signature (delegates to PaystackSignatureVerifier, P-3)
//   2. Recording the event in paystack_webhook_events (idempotency by event.id)
//   3. Dispatching by event type
//   4. Calling ActivateSubscriptionUseCase on charge.success (P-4)
//   5. Marking the event PROCESSED / FAILED
//
// Design contract with the route (P-6):
//   - Returns { httpStatus, body } — the route sends this as-is
//   - httpStatus is ALWAYS 200 for events that were recorded (even on failure),
//     because Paystack retries on non-2xx and we want to control retries ourselves
//   - httpStatus is 401 ONLY when signature verification fails — and in that
//     case we do NOT write to the DB
//   - httpStatus is 400 ONLY for malformed payloads AFTER signature verification
//     passed (shouldn't happen with real Paystack, but we fail safe)
//
// Never throws to the route. All errors are caught, logged, and returned as
// structured responses so the route never crashes.

const PaystackSignatureVerifier = require('../../services/payment/PaystackSignatureVerifier');
const ActivateSubscriptionUseCase = require('../subscription/ActivateSubscriptionUseCase');
const { query, withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const logger = require('../../../shared/utils/logger');

class HandlePaystackWebhookUseCase {
    constructor(opts = {}) {
        this.verifier = opts.verifier || new PaystackSignatureVerifier();
        this.activate = opts.activate || new ActivateSubscriptionUseCase();
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

        // ── 2. Parse the raw body (we KNOW it's valid JSON now — signature passed)
        let event;
        try {
            event = JSON.parse(req.body.toString('utf8'));
        } catch (err) {
            this.logger.error(
                { err: err.message, url: req.originalUrl },
                'paystack webhook: JSON parse failed after valid signature'
            );
            // Signature was valid but body is not valid JSON. Record nothing,
            // return 400 so Paystack does NOT retry (this is a hard failure).
            return {
                httpStatus: 400,
                body: { status: 'error', message: 'Malformed payload' },
            };
        }

        // ── 3. Extract minimal identity (before inserting)
        const eventId = event?.data?.id ? `evt_${event.data.id}` : null;
        const eventType = event?.event || null;
        const paystackRef = event?.data?.reference || null;

        // Paystack always sends data.id on charge events. If missing, we cannot
        // idempotency-key it. Fail closed rather than risk double-activation.
        if (!eventId || !eventType) {
            this.logger.error(
                { hasEventId: Boolean(eventId), eventType, url: req.originalUrl },
                'paystack webhook: missing event.id or event type'
            );
            return {
                httpStatus: 200, // Return 200 — do NOT make Paystack retry garbage
                body: { status: 'error', message: 'Missing event identity' },
            };
        }

        // ── 4. Idempotency: insert the event, ON CONFLICT DO NOTHING.
        //    If a row already exists for this event_id, we know it's a duplicate.
        //    We mark status='PROCESSING' immediately to claim it, in case two
        //    webhook deliveries arrive simultaneously.
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
            // DB is unhealthy. Return 200 so Paystack does NOT aggressively retry
            // while we're down. The retry sweep (P-7) will not see this event
            // because nothing was inserted — but the app is broken anyway, and
            // screaming 500 just amplifies the outage.
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

        // ── 5. Dispatch by event type. Only charge.success activates.
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
            // ── 7. Mark FAILED — the retry sweep (P-7) will pick this up
            try {
                await query(
                    `UPDATE paystack_webhook_events
                     SET status = 'FAILED',
                         error_message = $1,
                         retry_count = retry_count
                     WHERE id = $2`,
                    [String(err.message || err).slice(0, 1000), eventRowId]
                );
            } catch (updateErr) {
                // If even the UPDATE fails, log and move on. We already returned
                // 200 (below) so Paystack won't retry. The record stays PROCESSING
                // and can be reconciled manually.
                this.logger.error(
                    { err: updateErr.message, eventRowId },
                    'paystack webhook: failed to mark event FAILED'
                );
            }

            this.logger.error(
                { err: err.message, stack: err.stack, eventId, eventType },
                'paystack webhook: dispatch failed'
            );

            // Return 200 — Paystack should NOT retry. Our own sweep retries.
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
                // Deliberately no-op. Recorded, marked PROCESSED. A failed charge
                // should not change subscription state — the user's existing
                // period (if any) remains until it expires naturally.
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
                // Recorded for audit. No state change in this version.
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

        // If we cannot identify the business, we still record the event (done
        // by caller) but we cannot activate. Log and skip.
        if (!businessId) {
            this.logger.warn(
                { reference: event?.data?.reference },
                'paystack webhook: charge.success with no business_id in metadata'
            );
            return { businessId: null, subscriptionId: null, activated: false, skipped: true };
        }
        if (!planId) {
            this.logger.warn(
                { businessId, reference: event?.data?.reference },
                'paystack webhook: charge.success with no plan in metadata'
            );
            return { businessId, subscriptionId: null, activated: false, skipped: true };
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
     * Paystack forwards whatever we sent in the `metadata` field when we
     * initialized the transaction via /transaction/initialize.
     * We will send { businessId, plan, billingCycle } from P-6's /initialize.
     *
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