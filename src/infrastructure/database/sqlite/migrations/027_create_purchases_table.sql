-- Migration: Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    business_id INTEGER,
    supplier_id INTEGER,
    supplier_name TEXT,
    item_name TEXT,
    quantity REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'UNPAID',
    amount_paid REAL DEFAULT 0,
    balance_remaining REAL DEFAULT 0,
    due_date DATETIME,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    items TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_business_id ON purchases(business_id);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);