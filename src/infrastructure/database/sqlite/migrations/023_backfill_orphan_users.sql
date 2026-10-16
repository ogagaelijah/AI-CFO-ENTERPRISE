-- 023_backfill_orphan_users.sql
-- v1.0.0 — Guarantees every user has at least one active business_members row.
--
-- Post-022, all existing business owners are OWNER members. This migration
-- catches edge cases:
--
--   A) User has a business they own, but no membership row → add OWNER row
--   B) User has no business at all → create a placeholder "My Business" and
--      make them OWNER
--
-- After this migration:
--   * Every user.id appears at least once in business_members (ACTIVE)
--   * The strict auth middleware will not lock anyone out
--
-- Safe to re-run: all statements are guarded by NOT EXISTS checks.

-- ─────────────────────────────────────────────
-- Case A: user owns a business but no membership row
-- ─────────────────────────────────────────────
INSERT INTO business_members (business_id, user_id, role, status, accepted_at)
SELECT b.id, b.user_id, 'OWNER', 'ACTIVE', NOW()
FROM businesses b
WHERE b.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM business_members m
    WHERE m.business_id = b.id AND m.user_id = b.user_id
  );

-- ─────────────────────────────────────────────
-- Case B: user has no business at all — create a placeholder
-- ─────────────────────────────────────────────
-- Step B1: create a business for each user that has none and owns none.
INSERT INTO businesses (user_id, name, industry)
SELECT u.id, 'My Business', 'RETAIL'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM businesses b WHERE b.user_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM business_members m WHERE m.user_id = u.id AND m.status = 'ACTIVE'
);

-- Step B2: for each newly created business, make the creator an OWNER member.
INSERT INTO business_members (business_id, user_id, role, status, accepted_at)
SELECT b.id, b.user_id, 'OWNER', 'ACTIVE', NOW()
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM business_members m
  WHERE m.business_id = b.id AND m.user_id = b.user_id
);

-- ─────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────
DO $$
DECLARE
  total_users   INTEGER;
  users_no_mem  INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users;

  SELECT COUNT(*) INTO users_no_mem
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM business_members m
    WHERE m.user_id = u.id AND m.status = 'ACTIVE'
  );

  RAISE NOTICE '023: users=% users_without_active_membership=%',
    total_users, users_no_mem;

  IF users_no_mem > 0 THEN
    RAISE EXCEPTION '023: % users still lack an active membership — investigate', users_no_mem;
  END IF;
END $$;