-- 005_add_time_entries.sql
-- Consultancy: billable hours, per-entry rate.
-- Multi-tenant: every row scoped by business_id.
-- invoice_id references invoices (created in 004).

CREATE TABLE time_entries (
    id             SERIAL PRIMARY KEY,
    business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    project_id     INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    customer_id    INTEGER,
    entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    hours          NUMERIC(6,2) NOT NULL,
    rate           NUMERIC(15,2) NOT NULL DEFAULT 0,
    description    TEXT DEFAULT '',
    billable       BOOLEAN NOT NULL DEFAULT TRUE,
    invoiced       BOOLEAN NOT NULL DEFAULT FALSE,
    invoice_id     INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_business_date ON time_entries(business_id, entry_date DESC);
CREATE INDEX idx_time_entries_business_project ON time_entries(business_id, project_id);
CREATE INDEX idx_time_entries_business_invoiced ON time_entries(business_id, invoiced);
CREATE INDEX idx_time_entries_business_invoice ON time_entries(business_id, invoice_id);