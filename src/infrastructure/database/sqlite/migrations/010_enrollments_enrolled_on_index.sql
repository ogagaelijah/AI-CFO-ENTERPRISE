-- 010_enrollments_enrolled_on_index.sql
-- Performance index for enrollment listing ordered by enrolled_on DESC.
-- Supports the enriched join query used by GET /api/enrollments.

CREATE INDEX idx_enrollments_business_enrolled_on
    ON enrollments(business_id, enrolled_on DESC, id DESC);