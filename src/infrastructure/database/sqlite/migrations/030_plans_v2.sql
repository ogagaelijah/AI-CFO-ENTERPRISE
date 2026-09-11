-- Migration 030: Plans v2
--
-- Replaces old plan rows with the new tier model.
-- Schema-matching: `plans` has (id, name, price, currency, trial_days, features, limits)
--
-- Idempotent: safe to re-run.

-- ─────────────────────────────────────────────
-- STEP 1: Remove old plan rows
-- ─────────────────────────────────────────────
DELETE FROM plans WHERE id IN ('free', 'pro', 'business');

-- ─────────────────────────────────────────────
-- STEP 2: Insert new tier rows
-- All `features` and `limits` are empty JSON objects here.
-- The SSOT for features/limits lives in src/config/plans.js — the DB
-- is only used for pricing metadata.
-- ─────────────────────────────────────────────
INSERT INTO plans (id, name, price, currency, trial_days, features, limits)
VALUES
  ('free',       'Free (Internal)', 0,     'NGN', 0,  '{}', '{}'),
  ('basic',      'Basic',           2500,  'NGN', 0,  '{}', '{}'),
  ('pro',        'Pro',             4500,  'NGN', 14, '{}', '{}'),
  ('enterprise', 'Enterprise',      10500, 'NGN', 0,  '{}', '{}');

-- ─────────────────────────────────────────────
-- STEP 3: Index on price for sorting public plans
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plans_price
    ON plans(price);