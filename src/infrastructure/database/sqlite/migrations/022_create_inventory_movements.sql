-- Migration: Create inventory_movements table
-- Full audit trail for all inventory changes
-- Tracks: what changed, why, who, when, before/after values

CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'RETURN', 'TRANSFER')),
    quantity INTEGER NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    quantity_before INTEGER NOT NULL DEFAULT 0,
    quantity_after INTEGER NOT NULL DEFAULT 0,
    cost_price_before REAL NOT NULL DEFAULT 0,
    cost_price_after REAL NOT NULL DEFAULT 0,
    reference_type TEXT,
    reference_id INTEGER,
    reason TEXT,
    notes TEXT,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for fast queries (with IF NOT EXISTS check)
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business_id ON inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON inventory_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);