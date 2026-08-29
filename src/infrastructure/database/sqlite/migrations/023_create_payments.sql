-- Migration: Create payments table
-- Separates payments from sales and purchases
-- Enables proper cash flow tracking

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('RECEIVED', 'MADE')),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('SALE', 'PURCHASE', 'EXPENSE', 'INCOME', 'DEBTOR', 'CREDITOR', 'OTHER')),
    reference_id INTEGER,
    amount REAL NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_method TEXT CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'POS', 'CHEQUE', 'MOBILE_MONEY', 'OTHER')),
    reference_number TEXT,
    notes TEXT,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);

-- Create payment allocations table for AR/AP tracking
CREATE TABLE IF NOT EXISTS payment_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    reference_type TEXT NOT NULL CHECK (reference_type IN ('DEBTOR', 'CREDITOR')),
    reference_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_reference ON payment_allocations(reference_type, reference_id);