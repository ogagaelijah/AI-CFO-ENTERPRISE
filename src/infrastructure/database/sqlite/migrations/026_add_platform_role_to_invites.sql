-- src/infrastructure/database/sqlite/migrations/026_add_platform_role_to_invites.sql

ALTER TABLE team_invites 
ADD COLUMN platform_role VARCHAR(50) DEFAULT NULL;