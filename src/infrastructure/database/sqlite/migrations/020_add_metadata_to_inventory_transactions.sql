-- Migration: Add metadata column to inventory_transactions
ALTER TABLE inventory_transactions ADD COLUMN metadata TEXT DEFAULT '{}';