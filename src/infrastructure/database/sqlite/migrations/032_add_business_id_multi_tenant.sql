-- Migration 032: Add business_id to remaining business tables
-- Only tables that are still missing the column

-- ====================== expenses ======================
ALTER TABLE expenses ADD COLUMN business_id INTEGER REFERENCES businesses(id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON expenses(business_id);

-- ====================== income ======================
ALTER TABLE income ADD COLUMN business_id INTEGER REFERENCES businesses(id);
CREATE INDEX IF NOT EXISTS idx_income_business_id ON income(business_id);

-- ====================== payment_allocations (optional but recommended) ======================
ALTER TABLE payment_allocations ADD COLUMN business_id INTEGER REFERENCES businesses(id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_business_id ON payment_allocations(business_id);