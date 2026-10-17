-- src/infrastructure/database/sqlite/migrations/024_add_2fa_to_users.sql
-- Adds 2FA (TOTP) support to the users table.

ALTER TABLE users 
ADD COLUMN two_factor_secret VARCHAR(255) DEFAULT NULL,
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;