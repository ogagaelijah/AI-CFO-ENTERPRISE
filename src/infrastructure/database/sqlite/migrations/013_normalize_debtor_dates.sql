-- 013_normalize_debtor_dates.sql
-- Normalize debtors.due_date to DATE, matching the rest of the system
-- (invoices.issue_date, invoices.due_date, fees.due_date, terms.start_date,
-- terms.end_date are all DATE).
--
-- Why: due_date is a calendar date, not a moment in time. Storing it as
-- TIMESTAMPTZ causes timezone drift when fee/invoice DATEs are written
-- through midnight-UTC coercion (e.g., 2026-09-21 becomes 2026-09-20
-- 23:00 in some timezones).
--
-- Note: debtors.last_payment_date stays TIMESTAMPTZ — that IS a moment
-- in time, not a calendar date. Only due_date is normalized.
--
-- Safe: existing rows are converted with ::date, preserving the calendar
-- day shown in the DB (which is what users already see in the UI).

ALTER TABLE debtors
    ALTER COLUMN due_date TYPE DATE
    USING due_date::date;

-- Ensure the index still exists and covers the DATE column.
-- (Created as idx_debtors_due_date in an earlier migration; the ALTER
-- preserves the index but rebuilds the btree — no data loss.)
CREATE INDEX IF NOT EXISTS idx_debtors_due_date
    ON debtors(business_id, due_date);