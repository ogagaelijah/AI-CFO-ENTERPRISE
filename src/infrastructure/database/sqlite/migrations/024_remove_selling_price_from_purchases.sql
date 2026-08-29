-- Migration: Remove selling_price from purchases (cleanup)
-- This column was used in the old model but is no longer needed
-- Cost and selling price are now properly separated
-- The column can remain but will be ignored in code

-- Note: SQLite doesn't support DROP COLUMN directly
-- We'll handle this in code by not using the column
-- The column can remain but will be ignored

-- Check current schema for reference
PRAGMA table_info(purchases);