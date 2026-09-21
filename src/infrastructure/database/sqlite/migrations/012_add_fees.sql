-- 012_add_fees.sql
-- Education industry: student fees (per student, per term).
-- Separate from invoices — fees have their own numbering, status flow,
-- and debtor linkage.
--
-- Design:
--   - One fee per (business_id, student_id, term_id) — enforced by unique index.
--   - class_id is optional (which class the fee originated from).
--   - amount defaults from classes.term_fee at generation time, but is
--     stored on the fee row (immutable after issue).
--   - statuses: DRAFT, SENT, PAID, OVERDUE, CANCELLED
--   - reference_type='FEE' on debtors when a fee is SENT.
--   - FK to students/terms uses ON DELETE RESTRICT (never silently orphan a fee).
--   - FK to classes uses ON DELETE RESTRICT (same reason).
--   - Every row scoped by business_id.

CREATE TABLE fees (
    id                 SERIAL PRIMARY KEY,
    business_id        INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    student_id         INTEGER NOT NULL REFERENCES students(id)  ON DELETE RESTRICT,
    term_id            INTEGER NOT NULL REFERENCES terms(id)     ON DELETE RESTRICT,
    class_id           INTEGER          REFERENCES classes(id)   ON DELETE RESTRICT,

    fee_number         TEXT NOT NULL,
    description        TEXT NOT NULL DEFAULT '',

    amount             NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_paid        NUMERIC(15,2) NOT NULL DEFAULT 0,

    currency           TEXT NOT NULL DEFAULT 'NGN',
    status             TEXT NOT NULL DEFAULT 'DRAFT',

    issue_date         DATE,
    due_date           DATE,

    notes              TEXT NOT NULL DEFAULT '',
    metadata           JSONB NOT NULL DEFAULT '{}',

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fees_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT fees_amount_paid_non_negative CHECK (amount_paid >= 0),
    CONSTRAINT fees_status_valid CHECK (
        status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')
    )
);

-- One fee per student per term (per business).
CREATE UNIQUE INDEX idx_fees_business_student_term
    ON fees(business_id, student_id, term_id);

-- Fee number is unique per business (like INV-NNNN, SALE-NNNN).
CREATE UNIQUE INDEX idx_fees_business_fee_number
    ON fees(business_id, fee_number);

-- Common read paths.
CREATE INDEX idx_fees_business_status
    ON fees(business_id, status);

CREATE INDEX idx_fees_business_term
    ON fees(business_id, term_id);

CREATE INDEX idx_fees_business_student
    ON fees(business_id, student_id);

CREATE INDEX idx_fees_business_class
    ON fees(business_id, class_id);

CREATE INDEX idx_fees_business_due_date
    ON fees(business_id, due_date);