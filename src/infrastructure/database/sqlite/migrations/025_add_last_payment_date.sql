-- Migration: Add last_payment_date to debtors and creditors
-- This tracks when the last payment was received/made

-- Add column to debtors if it doesn't exist
ALTER TABLE debtors ADD COLUMN last_payment_date DATETIME;

-- Add column to creditors if it doesn't exist
ALTER TABLE creditors ADD COLUMN last_payment_date DATETIME;

-- Create indexes for faster queries (skip if they already exist)
CREATE INDEX IF NOT EXISTS idx_debtors_last_payment_date ON debtors(last_payment_date);
CREATE INDEX IF NOT EXISTS idx_creditors_last_payment_date ON creditors(last_payment_date);