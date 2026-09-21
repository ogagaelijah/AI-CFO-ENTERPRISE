-- 014_payments_allow_fee_ref.sql
-- Add 'FEE' to the allowed reference_type values on payments and transactions
-- so fee payments can be recorded.
--
-- Existing allowed values (from constraint introspection):
--   SALE, PURCHASE, EXPENSE, INCOME, DEBTOR, CREDITOR, INVOICE, OTHER
-- We add: FEE
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
            'FEE'::text
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
            'FEE'::text
        ]))
        OR (reference_type IS NULL)
    );