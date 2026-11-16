-- 039_add_google_auth.sql
ALTER TABLE users 
ADD COLUMN google_id VARCHAR(255) UNIQUE,
ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local';

-- Allow password_hash to be null for Google-only users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;