-- Migration 027: Correctly backfill business_id on debtors + creditors
--             + Add production indexes for scale
--
-- Context: Migration 026 tried to backfill from users.business_id, but
-- that column doesn't exist (business_id lives in the businesses table),
-- so the backfill silently no-op'd, leaving all rows NULL.
--
-- This migration corrects that by pulling from businesses.
-- Safe: idempotent, only affects NULL rows.

-- ─────────────────────────────────────────────
-- STEP 1: Backfill debtors.business_id from businesses table
-- ─────────────────────────────────────────────
UPDATE debtors
SET business_id = (
    SELECT b.id
    FROM businesses b
    WHERE b.user_id = debtors.user_id
    ORDER BY b.id ASC
    LIMIT 1
)
WHERE business_id IS NULL
  AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.user_id = debtors.user_id
  );

-- ─────────────────────────────────────────────
-- STEP 2: Backfill creditors.business_id from businesses table
-- ─────────────────────────────────────────────
UPDATE creditors
SET business_id = (
    SELECT b.id
    FROM businesses b
    WHERE b.user_id = creditors.user_id
    ORDER BY b.id ASC
    LIMIT 1
)
WHERE business_id IS NULL
  AND EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.user_id = creditors.user_id
  );

-- ─────────────────────────────────────────────
-- STEP 3: Composite indexes for production-scale queries
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_debtors_business_balance
    ON debtors (business_id, balance_remaining);

CREATE INDEX IF NOT EXISTS idx_debtors_business_status
    ON debtors (business_id, status);

CREATE INDEX IF NOT EXISTS idx_creditors_business_balance
    ON creditors (business_id, balance_remaining);

CREATE INDEX IF NOT EXISTS idx_creditors_business_status
    ON creditors (business_id, status);