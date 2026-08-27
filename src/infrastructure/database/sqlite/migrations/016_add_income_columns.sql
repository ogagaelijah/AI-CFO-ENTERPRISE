-- ============================================
-- Migration 16: Add missing columns to income table
-- Only adds columns that don't exist yet
-- ============================================

-- Add date column (missing)
ALTER TABLE income ADD COLUMN date TEXT;

-- Add due_date column (missing)
ALTER TABLE income ADD COLUMN due_date TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_income_due_date ON income(due_date);