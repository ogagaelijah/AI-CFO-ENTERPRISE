-- Migration: Create transactions table
-- Version: 025
-- Description: Creates the transactions table for tracking all financial transactions
-- Fully multi-business + multi-user aware

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id     INTEGER NOT NULL,
    user_id         INTEGER,
    type            TEXT NOT NULL,
    category        TEXT,
    amount          REAL NOT NULL,
    description     TEXT,
    payment_status  TEXT DEFAULT 'N/A',
    reference_id    INTEGER,
    reference_type  TEXT,
    date            TEXT NOT NULL,
    due_date        TEXT,
    metadata        TEXT DEFAULT '{}',
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_business_id 
    ON transactions(business_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
    ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_reference 
    ON transactions(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date 
    ON transactions(date);