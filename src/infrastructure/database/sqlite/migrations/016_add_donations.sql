-- 016_add_donations.sql
-- NGO/Non-Profit industry: donations received.
--
-- Design:
--   - donor_id NULLABLE (anonymous giving is legal)
--   - pledge_id NULLABLE; when set, this donation fulfils part of a pledge
--   - category uses the same enum as pledges
--   - method uses the same enum as payments.payment_method
--   - Every row scoped by business_id
--   - Recording a donation creates a payments row with
--     reference_type='DONATION' (constraint extended in migration 017)

CREATE TABLE donations (
    id                 SERIAL PRIMARY KEY,
    business_id        INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    donor_id           INTEGER          REFERENCES customers(id) ON DELETE SET NULL,
    pledge_id          INTEGER          REFERENCES pledges(id)   ON DELETE SET NULL,

    amount             NUMERIC(15,2) NOT NULL,
    currency           TEXT NOT NULL DEFAULT 'NGN',
    category           TEXT NOT NULL DEFAULT 'GENERAL',
    method             TEXT NOT NULL DEFAULT 'CASH',

    donation_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number   TEXT,
    notes              TEXT NOT NULL DEFAULT '',
    metadata           JSONB NOT NULL DEFAULT '{}',

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT donations_amount_positive CHECK (amount > 0),
    CONSTRAINT donations_category_valid CHECK (
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
    ),
    CONSTRAINT donations_method_valid CHECK (
        method IN ('CASH', 'BANK_TRANSFER', 'POS', 'CHEQUE', 'MOBILE_MONEY', 'OTHER')
    )
);

-- Common read paths
CREATE INDEX idx_donations_business_date
    ON donations(business_id, donation_date DESC);

CREATE INDEX idx_donations_business_donor
    ON donations(business_id, donor_id);

CREATE INDEX idx_donations_business_category
    ON donations(business_id, category);

CREATE INDEX idx_donations_business_pledge
    ON donations(business_id, pledge_id)
    WHERE pledge_id IS NOT NULL;

CREATE INDEX idx_donations_business_method
    ON donations(business_id, method);