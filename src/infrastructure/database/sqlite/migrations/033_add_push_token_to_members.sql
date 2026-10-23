-- 033_add_push_token_to_members.sql
-- Adds push_token to business_members for mobile notifications

ALTER TABLE business_members ADD COLUMN IF NOT EXISTS push_token TEXT;
CREATE INDEX IF NOT EXISTS idx_members_push_token ON business_members(push_token) WHERE push_token IS NOT NULL;