-- ============================================
-- Migration 18: Add items and notes columns to purchases table
-- ============================================

-- Add items column (JSON string of all items in the purchase)
ALTER TABLE purchases ADD COLUMN items TEXT;

-- Add notes column
ALTER TABLE purchases ADD COLUMN notes TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_items ON purchases(items);