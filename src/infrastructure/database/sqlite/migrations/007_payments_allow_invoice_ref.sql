-- 007_payments_allow_invoice_ref.sql
-- Allow reference_type = 'INVOICE' on payments and transactions.
-- Needed for invoice-linked payments (Phase 3).

-- Drop and recreate the payments reference_type check constraint with 'INVOICE' added.
ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_reference_type_check;

ALTER TABLE payments
    ADD CONSTRAINT payments_reference_type_check
    CHECK (reference_type IN (
        'SALE', 'PURCHASE', 'EXPENSE', 'INCOME',
        'DEBTOR', 'CREDITOR', 'INVOICE', 'OTHER'
    ));

-- Same for transactions if it has the constraint. Wrap in a DO block so
-- this is safe if the constraint name differs or doesn't exist.
DO $$
BEGIN
    -- Drop the existing check if there is one on the reference_type column.
    BEGIN
        ALTER TABLE transactions
            DROP CONSTRAINT IF EXISTS transactions_reference_type_check;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;

    -- Add the extended constraint.
    ALTER TABLE transactions
        ADD CONSTRAINT transactions_reference_type_check
        CHECK (reference_type IN (
            'SALE', 'PURCHASE', 'EXPENSE', 'INCOME',
            'DEBTOR', 'CREDITOR', 'INVOICE', 'OTHER'
        ) OR reference_type IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;