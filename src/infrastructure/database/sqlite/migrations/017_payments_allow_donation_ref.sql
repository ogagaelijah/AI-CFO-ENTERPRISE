-- 017_payments_allow_donation_ref.sql
-- Add 'DONATION' to the allowed reference_type values on payments and
-- transactions so donation receipts can be recorded.
--
-- Existing allowed values (after migration 014):
--   SALE, PURCHASE, EXPENSE, INCOME, DEBTOR, CREDITOR,
--   INVOICE, OTHER, FEE
-- We add: DONATION
--
-- payments.reference_type is NOT NULL (checked via IN, not "IS NULL OR ...")
-- transactions.reference_type is NULLABLE (checked via OR reference_type IS NULL)
-- We preserve those nullability semantics.

-- ── payments.reference_type ──
ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_reference_type_check;

ALTER TABLE payments
    ADD CONSTRAINT payments_reference_type_check
    CHECK (
        reference_type = ANY (ARRAY[
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

-- ── transactions.reference_type ──
ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_reference_type_check;

ALTER TABLE transactions
    ADD CONSTRAINT transactions_reference_type_check
    CHECK (
        (reference_type = ANY (ARRAY[
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
        ]))
        OR (reference_type IS NULL)
    );