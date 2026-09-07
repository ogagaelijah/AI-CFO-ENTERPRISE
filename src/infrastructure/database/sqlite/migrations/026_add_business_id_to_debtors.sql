-- 026_add_business_id_to_debtors.sql
-- Adds business_id column to debtors table for multi-tenant support

ALTER TABLE debtors ADD COLUMN business_id INTEGER REFERENCES businesses(id);

CREATE INDEX idx_debtors_business_id ON debtors(business_id);

-- Update existing records to set business_id from users table
UPDATE debtors 
SET business_id = (
    SELECT business_id FROM users WHERE users.id = debtors.user_id
)
WHERE business_id IS NULL;