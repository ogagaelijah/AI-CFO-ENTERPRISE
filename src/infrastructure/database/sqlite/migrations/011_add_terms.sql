-- 011_add_terms.sql
-- Education industry: academic terms (sessions + term periods).
-- Multi-tenant: every row scoped by business_id.
-- Supports scoping fees, enrollments, reports by session+term.

CREATE TABLE terms (
    id             SERIAL PRIMARY KEY,
    business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    session        TEXT NOT NULL,
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         TEXT NOT NULL DEFAULT 'ACTIVE',
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_terms_business_session_name
    ON terms(business_id, session, name);

CREATE INDEX idx_terms_business_session
    ON terms(business_id, session);

CREATE INDEX idx_terms_business_status
    ON terms(business_id, status);