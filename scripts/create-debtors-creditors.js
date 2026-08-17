// scripts/create-debtors-creditors.js
const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

const db = getDatabase();

console.log('🔄 Creating debtors and creditors tables...');

// Create debtors table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS debtors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            total_owed REAL DEFAULT 0,
            amount_paid REAL DEFAULT 0,
            balance_remaining REAL DEFAULT 0,
            status TEXT DEFAULT 'ACTIVE',
            due_date DATETIME,
            last_payment_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ Debtors table created');
} catch (e) {
    console.log('⚠️ Debtors table error:', e.message);
}

// Create creditors table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS creditors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            supplier_name TEXT NOT NULL,
            total_owed REAL DEFAULT 0,
            amount_paid REAL DEFAULT 0,
            balance_remaining REAL DEFAULT 0,
            status TEXT DEFAULT 'ACTIVE',
            due_date DATETIME,
            last_payment_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ Creditors table created');
} catch (e) {
    console.log('⚠️ Creditors table error:', e.message);
}

console.log('✅ Done!');