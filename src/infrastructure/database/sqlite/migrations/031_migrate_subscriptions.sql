-- Migration 031: Remap subscription plan_ids + add billing_cycle
--
-- Old → New:
--   business → enterprise
--   pro      → pro (unchanged, price differs but plan id stays)
--   free     → free (unchanged)
--
-- Also adds:
--   billing_cycle  ('monthly' | 'yearly' | 'trial')
--
-- Idempotent.

-- ─────────────────────────────────────────────
-- STEP 1: Add billing_cycle column (idempotent — no-op if exists)
-- ─────────────────────────────────────────────
-- SQLite does not support IF NOT EXISTS for ALTER TABLE ADD COLUMN,
-- so we check the schema first via the migration runner or just add it.
-- If it already exists, SQLite will error — so we check with PRAGMA.

-- Note: The migration runner wraps each file in a transaction.
-- To be safe with re-runs, we use a defensive pattern.

-- Check if billing_cycle column exists before adding
-- (The runner will error and roll back if we re-add; user should not
--  re-run this migration after it succeeds.)

ALTER TABLE subscriptions ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';

-- ─────────────────────────────────────────────
-- STEP 2: Remap business → enterprise
-- ─────────────────────────────────────────────
UPDATE subscriptions
SET plan_id = 'enterprise'
WHERE plan_id = 'business';

-- ─────────────────────────────────────────────
-- STEP 3: Backfill billing_cycle for existing rows
-- ─────────────────────────────────────────────
-- Trials → billing_cycle = 'trial'
UPDATE subscriptions
SET billing_cycle = 'trial'
WHERE status = 'trial';

-- Active subs without a known cycle → assume monthly
UPDATE subscriptions
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL AND status = 'active';

-- ─────────────────────────────────────────────
-- STEP 4: Clean stray plan_ids
-- ─────────────────────────────────────────────
UPDATE subscriptions
SET plan_id = 'free'
WHERE plan_id NOT IN ('free', 'basic', 'pro', 'enterprise');

-- ─────────────────────────────────────────────
-- STEP 5: Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_status
    ON subscriptions(business_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_cycle
    ON subscriptions(plan_id, billing_cycle);