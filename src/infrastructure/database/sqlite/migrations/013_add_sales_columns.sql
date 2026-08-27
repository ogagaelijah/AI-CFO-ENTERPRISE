-- ============================================
-- Migration 13: Add missing columns to sales table
-- ============================================

-- Add items column (JSON string of all items in the sale)
ALTER TABLE sales ADD COLUMN items TEXT;

-- Add invoice_no column (unique invoice number)
ALTER TABLE sales ADD COLUMN invoice_no TEXT;

-- Add notes column (additional notes for the sale)
ALTER TABLE sales ADD COLUMN notes TEXT;