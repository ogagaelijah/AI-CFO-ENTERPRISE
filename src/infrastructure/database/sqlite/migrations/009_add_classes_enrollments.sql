-- 009_add_classes_enrollments.sql
-- Education industry: classes (cohorts) + enrollments (student ↔ class).
-- Multi-tenant: every row scoped by business_id.

CREATE TABLE classes (
    id             SERIAL PRIMARY KEY,
    business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    level          TEXT,
    term_fee       NUMERIC(15,2) NOT NULL DEFAULT 0,
    description    TEXT DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'ACTIVE',
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_business_status
    ON classes(business_id, status);

CREATE INDEX idx_classes_business_name
    ON classes(business_id, name);

-- Enrollments: student ↔ class for a specific session + term.
-- A student can be in at most one ACTIVE enrollment per (session, term).

CREATE TABLE enrollments (
    id             SERIAL PRIMARY KEY,
    business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id       INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    term           TEXT NOT NULL,
    session        TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'ACTIVE',
    enrolled_on    DATE DEFAULT CURRENT_DATE,
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_enrollments_student_class_session
    ON enrollments(student_id, class_id, session, term)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_enrollments_business_student
    ON enrollments(business_id, student_id);

CREATE INDEX idx_enrollments_business_class
    ON enrollments(business_id, class_id);

CREATE INDEX idx_enrollments_business_session_term
    ON enrollments(business_id, session, term);