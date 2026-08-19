// scripts/add-customers-table.js

const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

const db = getDatabase();

console.log('🔄 Setting up customers table...');

try {
    // Check if customers table exists
    const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
    ).get();

    if (!tableExists) {
        // Create customers table
        db.exec(`
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT,
                type TEXT DEFAULT 'CUSTOMER',
                tax_id TEXT,
                notes TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ customers table created');

        // Create indexes
        db.exec(`
            CREATE INDEX idx_customers_business_id ON customers(business_id);
            CREATE INDEX idx_customers_name ON customers(name);
            CREATE INDEX idx_customers_type ON customers(type);
        `);
        console.log('✅ customers indexes created');
    } else {
        console.log('⚠️ customers table already exists');
    }

} catch (error) {
    console.error('❌ Error creating customers table:', error.message);
}

console.log('✅ Done!');