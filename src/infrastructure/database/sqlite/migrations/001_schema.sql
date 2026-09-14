-- 001_schema.sql
-- Consolidated Postgres schema for AI CFO Enterprise.
-- Generated from SQLite's final state. Order matters: tables with FKs must be created after their parents.

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id                          SERIAL PRIMARY KEY,
    telegram_id                 BIGINT UNIQUE,
    email                       TEXT UNIQUE NOT NULL,
    phone_number                TEXT UNIQUE,
    full_name                   TEXT NOT NULL,
    password_hash               TEXT NOT NULL,
    email_verified              BOOLEAN DEFAULT FALSE,
    phone_verified              BOOLEAN DEFAULT FALSE,
    reset_token                 TEXT,
    reset_token_expiry          TIMESTAMPTZ,
    email_verification_token    TEXT,
    email_verification_expiry   TIMESTAMPTZ,
    password_changed_at         TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_reset_token ON users(reset_token);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE plans (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       INTEGER NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'NGN',
    trial_days  INTEGER DEFAULT 0,
    features    JSONB NOT NULL,
    limits      JSONB NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_plans_price ON plans(price);

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE businesses (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    industry         TEXT NOT NULL,
    categories       JSONB,
    features         JSONB,
    setup_completed  BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_businesses_user ON businesses(user_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
    id               SERIAL PRIMARY KEY,
    business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id          TEXT NOT NULL REFERENCES plans(id),
    status           TEXT NOT NULL DEFAULT 'active',
    start_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date         TIMESTAMPTZ,
    trial_end_date   TIMESTAMPTZ,
    features         JSONB NOT NULL,
    billing_cycle    TEXT DEFAULT 'monthly',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_business_status ON subscriptions(business_id, status);
CREATE INDEX idx_subscriptions_plan_cycle ON subscriptions(plan_id, billing_cycle);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id         INTEGER,
    item_name           TEXT NOT NULL,
    quantity            INTEGER DEFAULT 0,
    cost_price          NUMERIC(15,2) DEFAULT 0,
    selling_price       NUMERIC(15,2) DEFAULT 0,
    last_purchase_cost  NUMERIC(15,2) DEFAULT 0,
    reorder_level       INTEGER DEFAULT 5,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_last_purchase_cost ON inventory(last_purchase_cost);
CREATE INDEX idx_inventory_business_id ON inventory(business_id);

-- ============================================================
-- INVENTORY MOVEMENTS (ledger)
-- ============================================================
CREATE TABLE inventory_movements (
    id                  SERIAL PRIMARY KEY,
    inventory_item_id   INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    business_id         INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movement_type       TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'RETURN', 'TRANSFER')),
    quantity            INTEGER NOT NULL,
    unit_cost           NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_cost          NUMERIC(15,2) NOT NULL DEFAULT 0,
    quantity_before     INTEGER NOT NULL DEFAULT 0,
    quantity_after      INTEGER NOT NULL DEFAULT 0,
    cost_price_before   NUMERIC(15,2) NOT NULL DEFAULT 0,
    cost_price_after    NUMERIC(15,2) NOT NULL DEFAULT 0,
    reference_type      TEXT,
    reference_id        INTEGER,
    reason              TEXT,
    notes               TEXT,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_movements_business_id ON inventory_movements(business_id);
CREATE INDEX idx_inventory_movements_user_id ON inventory_movements(user_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    id           SERIAL PRIMARY KEY,
    business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    phone        TEXT,
    email        TEXT,
    address      TEXT,
    type         TEXT DEFAULT 'CUSTOMER',
    tax_id       TEXT,
    notes        TEXT,
    metadata     TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_type ON customers(type);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
    id           SERIAL PRIMARY KEY,
    business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    phone        TEXT,
    email        TEXT,
    address      TEXT,
    tax_id       TEXT,
    notes        TEXT,
    metadata     TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_suppliers_business_id ON suppliers(business_id);
CREATE INDEX idx_suppliers_name ON suppliers(name);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE sales (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id         INTEGER,
    item_name           TEXT NOT NULL,
    quantity            INTEGER NOT NULL,
    unit_price          NUMERIC(15,2) NOT NULL,
    total_price         NUMERIC(15,2) NOT NULL,
    customer_name       TEXT,
    customer_id         INTEGER,
    customer_type       TEXT DEFAULT 'CUSTOMER',
    sale_date           TIMESTAMPTZ DEFAULT NOW(),
    payment_status      TEXT DEFAULT 'UNPAID',
    amount_paid         NUMERIC(15,2) DEFAULT 0,
    balance_remaining   NUMERIC(15,2) DEFAULT 0,
    unit_cost           NUMERIC(15,2) DEFAULT 0,
    cogs                NUMERIC(15,2) DEFAULT 0,
    gross_profit        NUMERIC(15,2) DEFAULT 0,
    margin_percentage   NUMERIC(8,2) DEFAULT 0,
    items               TEXT,
    invoice_no          TEXT,
    notes               TEXT
);
CREATE INDEX idx_sales_business_date ON sales(business_id, sale_date);

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE purchases (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id         INTEGER,
    supplier_id         INTEGER,
    supplier_name       TEXT,
    item_name           TEXT NOT NULL,
    quantity            INTEGER NOT NULL,
    unit_cost           NUMERIC(15,2) NOT NULL,
    total_cost          NUMERIC(15,2) NOT NULL,
    purchase_date       TIMESTAMPTZ DEFAULT NOW(),
    payment_status      TEXT DEFAULT 'UNPAID',
    amount_paid         NUMERIC(15,2) DEFAULT 0,
    balance_remaining   NUMERIC(15,2) DEFAULT 0,
    due_date            TIMESTAMPTZ,
    items               TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_purchases_items ON purchases(items);
CREATE INDEX idx_purchases_business_date ON purchases(business_id, purchase_date);

-- ============================================================
-- DEBTORS
-- ============================================================
CREATE TABLE debtors (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id         INTEGER REFERENCES businesses(id),
    customer_id         INTEGER,
    customer_name       TEXT NOT NULL,
    customer_type       TEXT DEFAULT 'CUSTOMER',
    total_owed          NUMERIC(15,2) DEFAULT 0,
    amount_paid         NUMERIC(15,2) DEFAULT 0,
    balance_remaining   NUMERIC(15,2) DEFAULT 0,
    status              TEXT DEFAULT 'ACTIVE',
    due_date            TIMESTAMPTZ,
    last_payment_date   TIMESTAMPTZ,
    reference_type      TEXT,
    reference_id        INTEGER,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_debtors_notes ON debtors(notes);
CREATE INDEX idx_debtors_business_id ON debtors(business_id);
CREATE INDEX idx_debtors_business_balance ON debtors(business_id, balance_remaining);
CREATE INDEX idx_debtors_business_status ON debtors(business_id, status);

-- ============================================================
-- CREDITORS
-- ============================================================
CREATE TABLE creditors (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id         INTEGER,
    supplier_id         INTEGER,
    supplier_name       TEXT NOT NULL,
    total_owed          NUMERIC(15,2) DEFAULT 0,
    amount_paid         NUMERIC(15,2) DEFAULT 0,
    balance_remaining   NUMERIC(15,2) DEFAULT 0,
    status              TEXT DEFAULT 'ACTIVE',
    due_date            TIMESTAMPTZ,
    last_payment_date   TIMESTAMPTZ,
    reference_type      TEXT,
    reference_id        INTEGER,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_creditors_business_balance ON creditors(business_id, balance_remaining);
CREATE INDEX idx_creditors_business_status ON creditors(business_id, status);

-- ============================================================
-- INCOME
-- ============================================================
CREATE TABLE income (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id     INTEGER REFERENCES businesses(id),
    source          TEXT NOT NULL,
    amount          NUMERIC(15,2) NOT NULL,
    category        TEXT DEFAULT 'Other',
    description     TEXT,
    payment_status  TEXT DEFAULT 'PAID',
    date            TEXT,
    due_date        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_income_due_date ON income(due_date);
CREATE INDEX idx_income_user_id ON income(user_id);
CREATE INDEX idx_income_user_date ON income(user_id, created_at);
CREATE INDEX idx_income_business_id ON income(business_id);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id     INTEGER REFERENCES businesses(id),
    category        TEXT NOT NULL,
    amount          NUMERIC(15,2) NOT NULL,
    description     TEXT,
    date            TEXT,
    payment_status  TEXT DEFAULT 'PAID',
    due_date        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_payment_status ON expenses(payment_status);
CREATE INDEX idx_expenses_due_date ON expenses(due_date);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, created_at);
CREATE INDEX idx_expenses_business_id ON expenses(business_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id                  SERIAL PRIMARY KEY,
    business_id         INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_type        TEXT NOT NULL CHECK (payment_type IN ('RECEIVED', 'MADE')),
    reference_type      TEXT NOT NULL CHECK (reference_type IN ('SALE', 'PURCHASE', 'EXPENSE', 'INCOME', 'DEBTOR', 'CREDITOR', 'OTHER')),
    reference_id        INTEGER,
    amount              NUMERIC(15,2) NOT NULL,
    payment_date        TIMESTAMPTZ DEFAULT NOW(),
    payment_method      TEXT CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'POS', 'CHEQUE', 'MOBILE_MONEY', 'OTHER')),
    reference_number    TEXT,
    notes               TEXT,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_business_id ON payments(business_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_reference ON payments(reference_type, reference_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_business_date ON payments(business_id, payment_date);

-- ============================================================
-- PAYMENT ALLOCATIONS
-- ============================================================
CREATE TABLE payment_allocations (
    id              SERIAL PRIMARY KEY,
    payment_id      INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    business_id     INTEGER REFERENCES businesses(id),
    reference_type  TEXT NOT NULL CHECK (reference_type IN ('DEBTOR', 'CREDITOR')),
    reference_id    INTEGER NOT NULL,
    amount          NUMERIC(15,2) NOT NULL,
    allocated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_reference ON payment_allocations(reference_type, reference_id);
CREATE INDEX idx_payment_allocations_business_id ON payment_allocations(business_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
    id              SERIAL PRIMARY KEY,
    business_id     INTEGER NOT NULL,
    user_id         INTEGER,
    type            TEXT NOT NULL,
    category        TEXT,
    amount          NUMERIC(15,2) NOT NULL,
    description     TEXT,
    payment_status  TEXT DEFAULT 'N/A',
    reference_id    INTEGER,
    reference_type  TEXT,
    date            TEXT NOT NULL,
    due_date        TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transactions_business_id ON transactions(business_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX idx_transactions_date ON transactions(date);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    debtor_id   INTEGER REFERENCES debtors(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    type        TEXT DEFAULT 'OVERDUE_DEBTOR',
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    read_at     TIMESTAMPTZ
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================
-- SECURITY EVENTS
-- ============================================================
CREATE TABLE security_events (
    id          SERIAL PRIMARY KEY,
    event_type  TEXT NOT NULL,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email       TEXT,
    ip_address  TEXT,
    user_agent  TEXT,
    metadata    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX idx_security_events_email ON security_events(email, created_at DESC);

-- ============================================================
-- SESSIONS (Telegram bot)
-- ============================================================
CREATE TABLE sessions (
    id           SERIAL PRIMARY KEY,
    telegram_id  BIGINT UNIQUE NOT NULL,
    state        TEXT NOT NULL,
    data         JSONB,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATIONS
-- ============================================================
CREATE TABLE migrations (
    id              SERIAL PRIMARY KEY,
    migration_name  TEXT UNIQUE NOT NULL,
    ran_at          TIMESTAMPTZ DEFAULT NOW()
);