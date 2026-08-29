-- Migration: Create income table
CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    business_id INTEGER,
    source_type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    payment_status TEXT DEFAULT 'UNPAID',
    transaction_id INTEGER,
    notes TEXT,
    income_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_income_user_id ON income(user_id);
CREATE INDEX idx_income_business_id ON income(business_id);
CREATE INDEX idx_income_date ON income(income_date);