CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    trial_end_date DATETIME,
    features TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);