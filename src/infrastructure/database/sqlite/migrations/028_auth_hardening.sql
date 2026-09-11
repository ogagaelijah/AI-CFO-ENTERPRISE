-- Migration 028: Auth hardening
--
-- Adds:
--   • password_changed_at      → enables session revocation on password change
--   • email_verification_token → hashed token for email verification
--   • email_verification_expiry → 24-hour expiry
--   • security_events table    → audit log for suspicious auth attempts

-- ─────────────────────────────────────────────
-- STEP 1: Add password_changed_at to users
-- ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;

-- ─────────────────────────────────────────────
-- STEP 2: Add email verification columns to users
-- ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN email_verification_token TEXT;

ALTER TABLE users ADD COLUMN email_verification_expiry DATETIME;

-- ─────────────────────────────────────────────
-- STEP 3: Create security_events table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_id INTEGER,
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_type
    ON security_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user
    ON security_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_email
    ON security_events(email, created_at DESC);

-- ─────────────────────────────────────────────
-- STEP 4: Indexes on reset/verification tokens
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_reset_token
    ON users(reset_token);

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
    ON users(email_verification_token);