-- ============================================
-- Migration 14: Add notes column to debtors table
-- ============================================

-- Add notes column
ALTER TABLE debtors ADD COLUMN notes TEXT;

-- Add index
CREATE INDEX IF NOT EXISTS idx_debtors_notes ON debtors(notes);