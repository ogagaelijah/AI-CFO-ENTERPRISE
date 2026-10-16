-- 022_business_members.sql
-- v1.0.0 — Introduces multi-user businesses.
--
-- Creates:
--   * business_members — the canonical "who can access this business" table
--   * team_invites     — pending invitations
--
-- Backfills every existing business owner (businesses.user_id) as an OWNER
-- member so nobody loses access when the auth middleware starts resolving
-- role from this table.
--
-- Safe to re-run: all objects use IF NOT EXISTS, and the backfill uses
-- WHERE NOT EXISTS so duplicates can't be created.

-- ─────────────────────────────────────────────
-- 1. business_members
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_members (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('OWNER','ADMIN','MANAGER','CASHIER','ACCOUNTANT')),
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  invited_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invited_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_business       ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_members_user           ON business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_business_role  ON business_members(business_id, role);

-- ─────────────────────────────────────────────
-- 2. team_invites
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_invites (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('OWNER','ADMIN','MANAGER','CASHIER','ACCOUNTANT')),
  token_hash    TEXT NOT NULL UNIQUE,
  invited_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_business ON team_invites(business_id);
CREATE INDEX IF NOT EXISTS idx_invites_email    ON team_invites(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_invites_token    ON team_invites(token_hash);

-- Only one pending (unaccepted) invite per (business, email).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_invite
  ON team_invites (business_id, LOWER(email))
  WHERE accepted_at IS NULL;

-- ─────────────────────────────────────────────
-- 3. Backfill: every business owner becomes an OWNER member
-- ─────────────────────────────────────────────
INSERT INTO business_members (business_id, user_id, role, status, accepted_at)
SELECT b.id, b.user_id, 'OWNER', 'ACTIVE', NOW()
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM business_members m
  WHERE m.business_id = b.id AND m.user_id = b.user_id
);

-- Verification notice (visible in migration logs)
DO $$
DECLARE
  biz_count   INTEGER;
  owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO biz_count FROM businesses;
  SELECT COUNT(*) INTO owner_count FROM business_members WHERE role = 'OWNER';
  RAISE NOTICE '022: businesses=% owners=%', biz_count, owner_count;
END $$;