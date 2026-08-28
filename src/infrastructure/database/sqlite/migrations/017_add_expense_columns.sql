-- ============================================
-- Migration 17: Add missing columns to expenses table
-- ============================================

-- Add date column
ALTER TABLE expenses ADD COLUMN date TEXT;

-- Add payment_status column
ALTER TABLE expenses ADD COLUMN payment_status TEXT DEFAULT 'PAID';

-- Add due_date column
ALTER TABLE expenses ADD COLUMN due_date TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);