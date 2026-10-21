-- Add base_unit to inventory (defaults to 'Piece' for existing items)
ALTER TABLE inventory ADD COLUMN base_unit VARCHAR(50) DEFAULT 'Piece';

-- Create the packs table
CREATE TABLE inventory_packs (
    id              SERIAL PRIMARY KEY,
    inventory_id    INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    pack_name       VARCHAR(50) NOT NULL,
    multiplier      INTEGER NOT NULL, 
    selling_price   NUMERIC(15,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_packs_inventory_id ON inventory_packs(inventory_id);