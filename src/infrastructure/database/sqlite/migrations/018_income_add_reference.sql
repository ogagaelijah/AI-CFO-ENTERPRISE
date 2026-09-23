-- 018_income_add_reference.sql
-- Adds reference_type / reference_id columns to the income table so
-- income rows can be linked back to their source document
-- (donation, invoice, sale, fee, etc.).
--
-- Purely additive — existing rows keep NULL for both columns.
-- Pattern matches payments.reference_type / reference_id.

ALTER TABLE income
    ADD COLUMN IF NOT EXISTS reference_type TEXT,
    ADD COLUMN IF NOT EXISTS reference_id   INTEGER;

ALTER TABLE income
    DROP CONSTRAINT IF EXISTS income_reference_type_check;

ALTER TABLE income
    ADD CONSTRAINT income_reference_type_check
    CHECK (
        reference_type IS NULL
        OR reference_type = ANY (ARRAY[
            'SALE'::text,
            'PURCHASE'::text,
            'EXPENSE'::text,
            'INCOME'::text,
            'DEBTOR'::text,
            'CREDITOR'::text,
            'INVOICE'::text,
            'OTHER'::text,
            'FEE'::text,
            'DONATION'::text
        ])
    );

CREATE INDEX IF NOT EXISTS idx_income_business_reference
    ON income(business_id, reference_type, reference_id)
    WHERE reference_type IS NOT NULL;