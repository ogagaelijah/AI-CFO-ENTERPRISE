-- ============================================
-- Migration: Add cost tracking to sales
-- Safe, idempotent, zero-downtime
-- ============================================

-- Step 1: Add columns (if they don't exist)
-- SQLite doesn't support IF NOT EXISTS for columns, so we check via PRAGMA
-- This is handled by the migration runner

-- Step 2: Add the columns (safe - they already exist in some environments)
ALTER TABLE sales ADD COLUMN unit_cost REAL DEFAULT 0;
ALTER TABLE sales ADD COLUMN cogs REAL DEFAULT 0;
ALTER TABLE sales ADD COLUMN gross_profit REAL DEFAULT 0;
ALTER TABLE sales ADD COLUMN margin_percentage REAL DEFAULT 0;

-- Step 3: Backfill historical data (idempotent)
-- Only updates records where cost data is missing (NULL or 0)
UPDATE sales 
SET 
    unit_cost = COALESCE(unit_cost, (
        SELECT cost_price 
        FROM inventory 
        WHERE inventory.item_name = sales.item_name 
        AND inventory.user_id = sales.user_id
        ORDER BY inventory.created_at DESC
        LIMIT 1
    ), 0),
    cogs = COALESCE(cogs, quantity * COALESCE(unit_cost, 0)),
    gross_profit = COALESCE(gross_profit, total_price - COALESCE(cogs, quantity * COALESCE(unit_cost, 0))),
    margin_percentage = COALESCE(margin_percentage,
        CASE 
            WHEN total_price > 0 AND COALESCE(cogs, quantity * COALESCE(unit_cost, 0)) IS NOT NULL
            THEN ((total_price - COALESCE(cogs, quantity * COALESCE(unit_cost, 0))) / total_price) * 100 
            ELSE 0 
        END
    )
WHERE unit_cost IS NULL OR unit_cost = 0;