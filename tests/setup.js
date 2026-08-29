// tests/setup.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '../data/test.db');
const TEST_USER_ID = 1;
const TEST_BUSINESS_ID = 1;

/**
 * Ensure the data directory exists
 */
function ensureDataDirectory() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory for tests');
  }
}

/**
 * Create all required tables for testing
 * This is the permanent fix - creates tables directly without relying on migrations
 */
function createTestTables(db) {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Businesses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      industry TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id TEXT,
      notes TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  // Purchases table
  db.exec(`
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
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  // Inventory table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      item_name TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      last_purchase_cost REAL DEFAULT 0,
      reorder_level INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  // Sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      item_name TEXT,
      quantity REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      customer_name TEXT,
      customer_id INTEGER,
      customer_type TEXT DEFAULT 'CUSTOMER',
      payment_status TEXT DEFAULT 'UNPAID',
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL DEFAULT 0,
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      unit_cost REAL DEFAULT 0,
      cogs REAL DEFAULT 0,
      gross_profit REAL DEFAULT 0,
      margin_percentage REAL DEFAULT 0,
      items TEXT,
      invoice_no TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  // Creditors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS creditors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      supplier_id INTEGER,
      supplier_name TEXT,
      total_owed REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      due_date DATETIME,
      reference_type TEXT,
      reference_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  // Debtors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS debtors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      business_id INTEGER,
      customer_name TEXT,
      customer_id INTEGER,
      customer_type TEXT DEFAULT 'CUSTOMER',
      total_owed REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      due_date DATETIME,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_payment_date DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      type TEXT DEFAULT 'CUSTOMER',
      tax_id TEXT,
      notes TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  // Inventory movements table
  db.exec(`
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
      FOREIGN KEY (inventory_item_id) REFERENCES inventory(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      payment_type TEXT NOT NULL CHECK (payment_type IN ('RECEIVED', 'MADE')),
      reference_type TEXT NOT NULL CHECK (reference_type IN ('SALE', 'PURCHASE', 'EXPENSE', 'INCOME', 'DEBTOR', 'CREDITOR', 'OTHER')),
      reference_id INTEGER,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'POS', 'CHEQUE', 'MOBILE_MONEY', 'OTHER')),
      reference_number TEXT,
      notes TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Payment allocations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      reference_type TEXT NOT NULL CHECK (reference_type IN ('DEBTOR', 'CREDITOR')),
      reference_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    )
  `);

  // Inventory transactions table (for backward compatibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL,
      business_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUST')),
      quantity INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      reason TEXT,
      notes TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory(id),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);

  console.log('✅ All test tables created');
}

/**
 * Setup a fresh test database
 */
function setupTestDatabase() {
  ensureDataDirectory();
  
  // Delete existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
      console.log('🧹 Removed existing test database');
    } catch (e) {
      // Ignore
    }
  }
  
  const db = new Database(TEST_DB_PATH);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create all tables
  createTestTables(db);
  
  // Insert test user and business
  try {
    db.exec(`
      INSERT OR IGNORE INTO users (id, full_name, email, phone, password_hash, created_at)
      VALUES (${TEST_USER_ID}, 'Test User', 'test@test.com', '08012345678', 'hashed_password', datetime('now'))
    `);
    db.exec(`
      INSERT OR IGNORE INTO businesses (id, user_id, name, industry, created_at)
      VALUES (${TEST_BUSINESS_ID}, ${TEST_USER_ID}, 'Test Business', 'RETAIL', datetime('now'))
    `);
    console.log('✅ Inserted test user and business');
  } catch (e) {
    console.log('⚠️ Could not insert test data:', e.message);
  }
  
  return db;
}

/**
 * Clear ALL test data between tests
 */
function clearTestData(db) {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE 'migrations'
  `).all();
  
  db.pragma('foreign_keys = OFF');
  
  for (const row of tables) {
    try {
      db.exec(`DELETE FROM ${row.name}`);
    } catch (e) {
      // Ignore
    }
  }
  
  try {
    db.exec(`DELETE FROM sqlite_sequence`);
  } catch (e) {
    // Ignore
  }
  
  db.pragma('foreign_keys = ON');
  
  // Re-insert test data
  try {
    db.exec(`
      INSERT OR IGNORE INTO users (id, full_name, email, phone, password_hash, created_at)
      VALUES (${TEST_USER_ID}, 'Test User', 'test@test.com', '08012345678', 'hashed_password', datetime('now'))
    `);
    db.exec(`
      INSERT OR IGNORE INTO businesses (id, user_id, name, industry, created_at)
      VALUES (${TEST_BUSINESS_ID}, ${TEST_USER_ID}, 'Test Business', 'RETAIL', datetime('now'))
    `);
  } catch (e) {
    // Ignore
  }
}

/**
 * Get a fresh test database connection
 */
function getTestDb() {
  return setupTestDatabase();
}

module.exports = {
  TEST_DB_PATH,
  ensureDataDirectory,
  setupTestDatabase,
  clearTestData,
  getTestDb,
  TEST_USER_ID,
  TEST_BUSINESS_ID,
};