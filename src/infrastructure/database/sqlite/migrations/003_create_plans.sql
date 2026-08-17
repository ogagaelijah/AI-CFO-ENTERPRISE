-- 003_create_plans.sql

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    trial_days INTEGER DEFAULT 0,
    features JSON NOT NULL,
    limits JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO plans (id, name, price, currency, trial_days, features, limits)
VALUES 
    ('free', 'Free', 0, 'NGN', 30, 
     '{"maxTransactions":50,"maxCustomers":20,"maxProducts":20,"inventory":true,"debtors":true,"creditors":true,"ai":false,"forecasting":false,"reports":false}',
     '{"transactionsPerMonth":50,"customersPerMonth":20}'),
    ('pro', 'Pro', 5000, 'NGN', 0,
     '{"maxTransactions":999999999,"maxCustomers":999999999,"maxProducts":999999999,"inventory":true,"debtors":true,"creditors":true,"ai":true,"forecasting":true,"reports":true}',
     '{"transactionsPerMonth":999999999,"customersPerMonth":999999999}');