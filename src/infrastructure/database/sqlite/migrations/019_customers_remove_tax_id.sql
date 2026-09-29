-- 019_customers_remove_tax_id.sql
-- Tax ID / TIN is not relevant for any of our customer types
-- (customers, clients, donors, students, patients, tenants).
-- Removed globally to simplify the customer form and schema.

ALTER TABLE customers
    DROP COLUMN IF EXISTS tax_id;