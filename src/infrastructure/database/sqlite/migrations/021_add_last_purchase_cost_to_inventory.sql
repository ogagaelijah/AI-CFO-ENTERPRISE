-- Migration: Add last_purchase_cost column to inventory table
-- This tracks the actual cost of the most recent purchase
-- Used for reporting and price comparison

ALTER TABLE inventory ADD COLUMN last_purchase_cost REAL DEFAULT 0;

-- Update existing items to have last_purchase_cost = cost_price
UPDATE inventory SET last_purchase_cost = cost_price WHERE cost_price > 0;

-- Create index for faster lookups
CREATE INDEX idx_inventory_last_purchase_cost ON inventory(last_purchase_cost);