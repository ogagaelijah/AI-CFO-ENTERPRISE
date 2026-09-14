-- 002_add_reports.sql
CREATE TABLE reports (
    id            SERIAL PRIMARY KEY,
    business_id   INTEGER NOT NULL,
    type          TEXT NOT NULL,
    title         TEXT DEFAULT '',
    data          JSONB DEFAULT '{}',
    generated_at  TIMESTAMPTZ DEFAULT NOW(),
    period_start  TIMESTAMPTZ,
    period_end    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reports_business_type ON reports(business_id, type);
CREATE INDEX idx_reports_generated_at ON reports(business_id, generated_at DESC);