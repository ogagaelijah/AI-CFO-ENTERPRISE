-- 020_paystack_webhook_events.sql
-- Phase 2, file 1 of 7.
-- Paystack webhook idempotency + audit trail.
--
-- Design notes:
--   * Idempotency key is Paystack's event id (a string, e.g. "evt_xxx").
--     UNIQUE constraint makes duplicate deliveries a no-op at the DB layer.
--   * Every event is recorded BEFORE dispatch, so a crash mid-dispatch still
--     leaves an audit trail and the retry sweep can pick it up.
--   * signature_valid is recorded for forensics even when we 401 — but we
--     still refuse to insert when signature verification fails, per the
--     "reject spoofed webhooks" goal. See PAYSTACK_REJECT_ON_BAD_SIG below.
--   * status lifecycle: RECEIVED -> PROCESSING -> PROCESSED
--                                   \-> FAILED (with error_message, retry_count)
--   * retry_count capped by app logic at 5; DB only stores the integer.
--   * business_id and subscription_id are nullable because we may receive
--     events for a business that no longer exists, or receive a malformed
--     event we want to log without linking.
--
-- FK types match 001_schema.sql:
--   businesses.id      INTEGER
--   subscriptions.id   INTEGER

BEGIN;

CREATE TABLE paystack_webhook_events (
    id                SERIAL PRIMARY KEY,

    -- Paystack event identity
    event_id          TEXT NOT NULL,
    event_type        TEXT NOT NULL,           -- 'charge.success', 'charge.failed', ...
    paystack_ref      TEXT,                    -- data.reference, for cross-check with /initialize

    -- Linkage (nullable — see header)
    business_id       INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    subscription_id   INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Forensics: full payload kept for replay + audit. JSONB so we can query into it.
    payload           JSONB NOT NULL,

    -- Lifecycle
    status            TEXT NOT NULL DEFAULT 'RECEIVED'
                      CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER')),
    error_message     TEXT,
    retry_count       INTEGER NOT NULL DEFAULT 0,
    last_retry_at     TIMESTAMPTZ,

    -- Timing
    received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at      TIMESTAMPTZ,

    -- Signature verification outcome. Always TRUE if row exists, because we
    -- refuse to insert unsigned/invalid-signature events. Column exists so a
    -- future change can allow "record all, verify later" without a migration.
    signature_valid   BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT paystack_webhook_events_event_id_unique UNIQUE (event_id)
);

-- Idempotency lookups: hot path is "have we seen event_id X?"
-- Covered by the UNIQUE constraint index, no extra index needed.

-- Retry sweep: find FAILED events with retry_count < cap, oldest first.
CREATE INDEX idx_paystack_webhook_events_status_retry
    ON paystack_webhook_events(status, retry_count, received_at)
    WHERE status = 'FAILED';

-- Business-scoped audit views: "what events hit this business?"
CREATE INDEX idx_paystack_webhook_events_business_received
    ON paystack_webhook_events(business_id, received_at DESC);

-- Subscription-scoped audit: "what events activated this subscription?"
CREATE INDEX idx_paystack_webhook_events_subscription
    ON paystack_webhook_events(subscription_id, received_at DESC)
    WHERE subscription_id IS NOT NULL;

-- Cross-check against /initialize reference
CREATE INDEX idx_paystack_webhook_events_paystack_ref
    ON paystack_webhook_events(paystack_ref)
    WHERE paystack_ref IS NOT NULL;

COMMIT;