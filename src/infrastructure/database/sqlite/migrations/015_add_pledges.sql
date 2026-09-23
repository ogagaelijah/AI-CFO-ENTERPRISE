-- 015_add_pledges.sql
-- NGO/Non-Profit industry: pledges (commitments to give).
--
-- Pledges are NOT receivables. They do NOT flow to debtors.
-- A pledge becomes income only when the actual donation is recorded
-- (which references the pledge via donations.pledge_id).
--
-- Design:
--   - donor_id NULLABLE (anonymous pledge is possible)
--   - amount_fulfilled grows as linked donations are recorded
--   - status auto-flips to FULFILLED when amount_fulfilled >= amount
--   - status auto-flips to OVERDUE when due_date < today AND still ACTIVE
--     (computed at read time, not stored as OVERDUE unless explicitly set)
--   - category uses the same enum as donations
--   - Every row scoped by business_id

CREATE TABLE pledges (
    id                 SERIAL PRIMARY KEY,
    business_id        INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    donor_id           INTEGER          REFERENCES customers(id) ON DELETE SET NULL,

    amount             NUMERIC(15,2) NOT NULL,
    amount_fulfilled   NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency           TEXT NOT NULL DEFAULT 'NGN',
    category           TEXT NOT NULL DEFAULT 'GENERAL',
    status             TEXT NOT NULL DEFAULT 'ACTIVE',

    pledge_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date           DATE,
    notes              TEXT NOT NULL DEFAULT '',
    metadata           JSONB NOT NULL DEFAULT '{}',

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pledges_amount_positive CHECK (amount > 0),
    CONSTRAINT pledges_fulfilled_non_negative CHECK (amount_fulfilled >= 0),
    CONSTRAINT pledges_fulfilled_not_over CHECK (amount_fulfilled <= amount),
    CONSTRAINT pledges_status_valid CHECK (
        status IN ('ACTIVE', 'FULFILLED', 'CANCELLED', 'OVERDUE')
    ),
    CONSTRAINT pledges_category_valid CHECK (
        category IN (
            'TITHE',
            'OFFERING',
            'ZAKAT',
            'SADAQAH',
            'SEED',
            'BUILDING_FUND',
            'MISSIONS',
            'WELFARE',
            'PLEDGE_PAYMENT',
            'GENERAL',
            'OTHER'
        )
    )
);

-- Common read paths
CREATE INDEX idx_pledges_business_status
    ON pledges(business_id, status);

CREATE INDEX idx_pledges_business_donor
    ON pledges(business_id, donor_id);

CREATE INDEX idx_pledges_business_due_date
    ON pledges(business_id, due_date)
    WHERE due_date IS NOT NULL;

CREATE INDEX idx_pledges_business_category
    ON pledges(business_id, category);

CREATE INDEX idx_pledges_business_pledge_date
    ON pledges(business_id, pledge_date DESC);