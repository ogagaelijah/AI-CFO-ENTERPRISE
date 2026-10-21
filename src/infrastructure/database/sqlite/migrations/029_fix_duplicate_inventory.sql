-- src/infrastructure/database/sqlite/migrations/029_fix_duplicate_inventory.sql
-- Safely merges duplicate inventory items (ignoring case and spaces).

-- 1. Create a temporary table to standardize the names
CREATE TEMP TABLE standardized_inventory AS
SELECT 
    id,
    business_id,
    INITCAP(TRIM(item_name)) as clean_name,
    LOWER(TRIM(item_name)) as match_key,
    quantity,
    cost_price,
    selling_price,
    last_purchase_cost,
    reorder_level,
    user_id,
    created_at,
    updated_at
FROM inventory;

-- 2. Update the "keeper" item with the summed quantities and new clean name
WITH duplicates AS (
    SELECT 
        MIN(id) as keep_id,
        match_key,
        business_id,
        SUM(quantity) as total_qty,
        SUM(quantity * cost_price) as total_cost_value
    FROM standardized_inventory
    GROUP BY match_key, business_id
    HAVING COUNT(*) > 1
)
UPDATE inventory i
SET 
    quantity = d.total_qty,
    cost_price = CASE WHEN d.total_qty > 0 THEN d.total_cost_value / d.total_qty ELSE i.cost_price END,
    item_name = (SELECT clean_name FROM standardized_inventory WHERE id = d.keep_id)
FROM duplicates d
WHERE i.id = d.keep_id;

-- 3. Delete the other duplicates
DELETE FROM inventory
WHERE id IN (
    SELECT id FROM standardized_inventory
    WHERE id NOT IN (
        SELECT MIN(id) FROM standardized_inventory GROUP BY match_key, business_id
    )
);

-- 4. Clean up the Purchases table names (does not delete rows, just fixes text)
UPDATE purchases
SET 
    item_name = INITCAP(TRIM(item_name)),
    supplier_name = INITCAP(TRIM(supplier_name))
WHERE item_name IS NOT NULL OR supplier_name IS NOT NULL;

-- 5. Clean up the remaining inventory names
UPDATE inventory
SET item_name = INITCAP(TRIM(item_name));

DROP TABLE standardized_inventory;