// src/application/services/payment/PaystackWebhookRetryService.js
// v1.0.0-prod
//
// Sweeps FAILED paystack_webhook_events rows and retries dispatch.
//
// Why this exists:
//   HandlePaystackWebhookUseCase returns 200 to Paystack even when processing
//   fails — because we don't want Paystack to hammer us during an incident.
//   That means a transient DB error, an activation bug, or a slow downstream
//   service can leave an event recorded as FAILED with no retry. This service
//   is the retry mechanism.
//
// Contract:
//   - Runs as a scheduled sweep (no cron in this file — caller decides cadence)
//   - Claims up to `batchSize` FAILED events with retry_count < maxRetries
//   - For each: re-invokes HandlePaystackWebhookUseCase's dispatch path against
//     the stored payload, then updates status
//   - Never throws — logs and continues on per-event failure
//   - Safe to run concurrently — uses SELECT ... FOR UPDATE SKIP LOCKED
//
// Retry cap: MAX_RETRIES = 5. Beyond that, status becomes DEAD_LETTER and the
// event requires manual inspection. This matches the roadmap's "Retry cap = 5".

const { query, withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const HandlePaystackWebhookUseCase = require('../../useCases/payment/HandlePaystackWebhookUseCase');
const logger = require('../../../shared/utils/logger');

const MAX_RETRIES = 5;
const DEFAULT_BATCH_SIZE = 20;

class PaystackWebhookRetryService {
    constructor(opts = {}) {
        this.maxRetries = opts.maxRetries ?? MAX_RETRIES;
        this.batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE;
        this.logger = opts.logger || logger;
        // We reuse the same dispatch logic as the live use case, but we need
        // to bypass signature verification (the payload is already trusted —
        // it was inserted only after signature verification passed).
        this.dispatcher = opts.dispatcher || new HandlePaystackWebhookUseCase();
    }

    /**
     * Run one sweep. Returns a summary object for observability.
     *
     * @returns {Promise<{claimed: number, succeeded: number, failed: number, deadLettered: number}>}
     */
    async sweep() {
        const claimed = await this._claimBatch();
        const summary = { claimed: claimed.length, succeeded: 0, failed: 0, deadLettered: 0 };

        for (const row of claimed) {
            try {
                await this._retryOne(row);
                summary.succeeded++;
            } catch (err) {
                const willDeadLetter = row.retry_count + 1 >= this.maxRetries;
                if (willDeadLetter) summary.deadLettered++;
                else summary.failed++;

                this.logger.warn(
                    {
                        eventId: row.event_id,
                        eventType: row.event_type,
                        retryCount: row.retry_count + 1,
                        willDeadLetter,
                        err: err.message,
                    },
                    'paystack retry: attempt failed'
                );

                await this._markFailed(row, err, willDeadLetter);
            }
        }

        if (summary.claimed > 0) {
            this.logger.info(summary, 'paystack retry: sweep complete');
        }
        return summary;
    }

    /**
     * Claim a batch atomically. Uses SKIP LOCKED so parallel workers don't
     * stomp each other, and orders by received_at ASC so the oldest failures
     * are retried first.
     *
     * @private
     */
    async _claimBatch() {
        return await withTransaction(async () => {
            const result = await query(
                `SELECT id, event_id, event_type, payload, business_id, subscription_id, retry_count
                 FROM paystack_webhook_events
                 WHERE status = 'FAILED'
                   AND retry_count < $1
                 ORDER BY received_at ASC
                 LIMIT $2
                 FOR UPDATE SKIP LOCKED`,
                [this.maxRetries, this.batchSize]
            );

            if (result.rowCount === 0) return [];

            const ids = result.rows.map((r) => r.id);
            await query(
                `UPDATE paystack_webhook_events
                 SET status = 'PROCESSING',
                     last_retry_at = NOW()
                 WHERE id = ANY($1::int[])`,
                [ids]
            );

            return result.rows;
        });
    }

    /**
     * Retry one event. Re-dispatches by event type using the stored payload.
     * Note: we bypass the HTTP/signature layer entirely — the payload was
     * already verified before this row was inserted.
     *
     * @private
     */
    async _retryOne(row) {
        const event = row.payload; // pg returns JSONB as parsed object by default

        // Validate shape — the payload must at least have an `event` field.
        if (!event || typeof event !== 'object' || !event.event) {
            throw new Error('Stored payload missing "event" field — cannot dispatch');
        }

        // Reuse the dispatcher's private dispatch path. This is deliberate:
        // one source of truth for what each event type does. If dispatch
        // semantics change in the use case, retries automatically follow.
        const dispatchResult = await this.dispatcher._dispatch(event.event, event);

        // Success — mark PROCESSED and record linkage.
        await query(
            `UPDATE paystack_webhook_events
             SET status = 'PROCESSED',
                 processed_at = NOW(),
                 retry_count = retry_count + 1,
                 business_id = COALESCE($1, business_id),
                 subscription_id = COALESCE($2, subscription_id),
                 error_message = NULL
             WHERE id = $3`,
            [dispatchResult.businessId ?? null, dispatchResult.subscriptionId ?? null, row.id]
        );

        return dispatchResult;
    }

    /**
     * Mark a single event failed with an incremented retry count, or move it
     * to DEAD_LETTER if this was its last allowed attempt.
     *
     * @private
     */
    async _markFailed(row, err, deadLetter) {
        const message = String(err.message || err).slice(0, 1000);
        const newStatus = deadLetter ? 'DEAD_LETTER' : 'FAILED';

        try {
            await query(
                `UPDATE paystack_webhook_events
                 SET status = $1,
                     retry_count = retry_count + 1,
                     error_message = $2,
                     last_retry_at = NOW()
                 WHERE id = $3`,
                [newStatus, message, row.id]
            );
        } catch (updateErr) {
            this.logger.error(
                { eventId: row.event_id, err: updateErr.message },
                'paystack retry: failed to update failed event'
            );
        }
    }
}

module.exports = PaystackWebhookRetryService;