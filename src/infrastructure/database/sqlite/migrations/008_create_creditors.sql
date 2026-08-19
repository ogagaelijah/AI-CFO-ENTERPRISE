CREATE TABLE IF NOT EXISTS creditors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    supplier_name TEXT NOT NULL,
    total_owed REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    balance_remaining REAL NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    due_date DATETIME,
    last_payment_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);