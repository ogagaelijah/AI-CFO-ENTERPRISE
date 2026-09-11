-- Migration 029: Make users.phone_number nullable
--
-- Context: Original schema declared phone_number NOT NULL, but
-- web-based registration does not require a phone number.
--
-- SQLite cannot drop NOT NULL via ALTER TABLE, so we rebuild the table.
-- Foreign keys are disabled by the migration runner during execution.

-- ─────────────────────────────────────────────
-- STEP 1: Create new users table with nullable phone_number
-- ─────────────────────────────────────────────
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT 0,
    phone_verified BOOLEAN DEFAULT 0,
    reset_token TEXT,
    reset_token_expiry DATETIME,
    email_verification_token TEXT,
    email_verification_expiry DATETIME,
    password_changed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- STEP 2: Copy data preserving IDs
-- ─────────────────────────────────────────────
INSERT INTO users_new (
    id, telegram_id, email, phone_number, full_name, password_hash,
    email_verified, phone_verified,
    reset_token, reset_token_expiry,
    email_verification_token, email_verification_expiry,
    password_changed_at,
    created_at, updated_at
)
SELECT
    id, telegram_id, email, phone_number, full_name, password_hash,
    email_verified, phone_verified,
    reset_token, reset_token_expiry,
    email_verification_token, email_verification_expiry,
    password_changed_at,
    created_at, updated_at
FROM users;

-- ─────────────────────────────────────────────
-- STEP 3: Drop old table
-- ─────────────────────────────────────────────
DROP TABLE users;

-- ─────────────────────────────────────────────
-- STEP 4: Rename new table
-- ─────────────────────────────────────────────
ALTER TABLE users_new RENAME TO users;

-- ─────────────────────────────────────────────
-- STEP 5: Recreate indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_telegram_id
    ON users(telegram_id);

CREATE INDEX IF NOT EXISTS idx_users_reset_token
    ON users(reset_token);

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
    ON users(email_verification_token);