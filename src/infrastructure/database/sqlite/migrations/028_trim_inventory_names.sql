-- src/infrastructure/database/sqlite/migrations/028_trim_inventory_names.sql
-- Fixes duplicate inventory items caused by trailing/leading spaces in item_name.

-- 1. Trim leading and trailing spaces from all item names
UPDATE inventory
SET item_name = TRIM(item_name)
WHERE item_name IS NOT NULL AND item_name != TRIM(item_name);

-- 2. (Optional but recommended) If you have duplicate items that only differ by spaces, 
-- you will want to merge them. However, merging stock quantities is complex and requires
-- careful logic. For now, the TRIM above will prevent NEW duplicates from being created.
-- If you want to merge existing duplicates, you would need a script that:
--   a) Finds items with the same TRIM(item_name) and business_id.
--   b) Adds their quantities together.
--   c) Updates references in sales/purchases.
--   d) Deletes the duplicate row.
-- We will leave the merge logic out for now to prevent data loss on production.