-- 006_debtors_source_index.sql
-- Enforce one debtor row per source document (sale, invoice, fee, rent, pledge).
-- Uses the existing reference_type / reference_id columns.
-- Manual debtors (no reference_type) are exempt.
--
-- Also speeds up "find the debtor for this invoice/sale/fee/rent".

CREATE UNIQUE INDEX idx_debtors_source_unique
    ON debtors(reference_type, reference_id)
    WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE INDEX idx_debtors_source_lookup
    ON debtors(reference_type, reference_id);