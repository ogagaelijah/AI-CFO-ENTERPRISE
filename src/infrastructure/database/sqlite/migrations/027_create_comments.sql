-- src/infrastructure/database/sqlite/migrations/027_create_comments.sql
-- Creates the comments table for internal team discussions on records.

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'SALE', 'PURCHASE', 'INVOICE', 'CUSTOMER'
    entity_id INTEGER NOT NULL,       -- The ID of the specific record
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups when opening a specific record (e.g., viewing a sale)
CREATE INDEX idx_comments_entity ON comments(business_id, entity_type, entity_id);

-- Index for fetching comments by user (useful for an audit trail or notifications later)
CREATE INDEX idx_comments_user ON comments(user_id);