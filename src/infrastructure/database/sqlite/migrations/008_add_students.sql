-- 008_add_students.sql
-- Education industry: students table.
-- Multi-tenant: every row scoped by business_id.
-- Admission number is per-business sequential (ADM-NNNN), generated server-side.

CREATE TABLE students (
    id                SERIAL PRIMARY KEY,
    business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    admission_number  TEXT NOT NULL,
    full_name         TEXT NOT NULL,
    gender            TEXT,
    date_of_birth     DATE,
    guardian_name     TEXT,
    guardian_phone    TEXT,
    guardian_email    TEXT,
    address           TEXT,
    status            TEXT NOT NULL DEFAULT 'ACTIVE',
    enrolled_on       DATE DEFAULT CURRENT_DATE,
    metadata          JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_students_business_admission
    ON students(business_id, admission_number);

CREATE INDEX idx_students_business_status
    ON students(business_id, status);

CREATE INDEX idx_students_business_name
    ON students(business_id, full_name);