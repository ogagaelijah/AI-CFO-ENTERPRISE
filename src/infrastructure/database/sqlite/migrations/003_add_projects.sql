-- 003_add_projects.sql
CREATE TABLE projects (
    id             SERIAL PRIMARY KEY,
    business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    description    TEXT DEFAULT '',
    status         TEXT DEFAULT 'ACTIVE',
    budget         NUMERIC(15,2) DEFAULT 0,
    start_date     TIMESTAMPTZ DEFAULT NOW(),
    end_date       TIMESTAMPTZ,
    customer_id    INTEGER,
    customer_type  TEXT,
    notes          TEXT DEFAULT '',
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_projects_business_id ON projects(business_id);
CREATE INDEX idx_projects_status ON projects(business_id, status);
CREATE INDEX idx_projects_customer ON projects(business_id, customer_id);