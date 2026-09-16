-- 004_add_invoices.sql
-- Consultancy: standalone invoices (separate from sales).
-- Multi-tenant: every row scoped by business_id.

CREATE TABLE invoices (
    id                SERIAL PRIMARY KEY,
    business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id       INTEGER,
    project_id        INTEGER,
    invoice_number    TEXT NOT NULL,
    issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date          DATE,
    status            TEXT NOT NULL DEFAULT 'DRAFT',
    subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax               NUMERIC(15,2) NOT NULL DEFAULT 0,
    total             NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_paid       NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency          TEXT NOT NULL DEFAULT 'NGN',
    notes             TEXT DEFAULT '',
    metadata          JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invoices_business_number ON invoices(business_id, invoice_number);
CREATE INDEX idx_invoices_business_status ON invoices(business_id, status);
CREATE INDEX idx_invoices_business_customer ON invoices(business_id, customer_id);
CREATE INDEX idx_invoices_business_project ON invoices(business_id, project_id);
CREATE INDEX idx_invoices_business_issue_date ON invoices(business_id, issue_date DESC);