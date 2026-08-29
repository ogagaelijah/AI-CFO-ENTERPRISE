-- Migration: Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    business_id INTEGER,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    payment_status TEXT DEFAULT 'UNPAID',
    transaction_id INTEGER,
    notes TEXT,
    expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_business_id ON expenses(business_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);