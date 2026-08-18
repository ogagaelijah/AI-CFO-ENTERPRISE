// scripts/add-inventory-columns.js
const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

const db = getDatabase();

console.log('🔄 Setting up inventory table...');

// =============================================
// CREATE INVENTORY TABLE
// =============================================
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 0,
            cost_price REAL DEFAULT 0,
            selling_price REAL DEFAULT 0,
            reorder_level INTEGER DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ inventory table created');
} catch (e) {
    console.error('❌ Error creating inventory table:', e.message);
}

// =============================================
// ADD MISSING COLUMNS
// =============================================
try {
    const columns = db.prepare('PRAGMA table_info(inventory)').all();
    const hasCostPrice = columns.some(c => c.name === 'cost_price');
    const hasSellingPrice = columns.some(c => c.name === 'selling_price');
    const hasReorderLevel = columns.some(c => c.name === 'reorder_level');

    if (!hasCostPrice) {
        db.exec('ALTER TABLE inventory ADD COLUMN cost_price REAL DEFAULT 0');
        console.log('✅ cost_price column added');
    } else {
        console.log('⚠️ cost_price column already exists');
    }

    if (!hasSellingPrice) {
        db.exec('ALTER TABLE inventory ADD COLUMN selling_price REAL DEFAULT 0');
        console.log('✅ selling_price column added');
    } else {
        console.log('⚠️ selling_price column already exists');
    }

    if (!hasReorderLevel) {
        db.exec('ALTER TABLE inventory ADD COLUMN reorder_level INTEGER DEFAULT 5');
        console.log('✅ reorder_level column added');
    } else {
        console.log('⚠️ reorder_level column already exists');
    }
} catch (e) {
    console.error('❌ Error checking/adding columns:', e.message);
}

// =============================================
// CREATE SALES TABLE
// =============================================
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            customer_name TEXT,
            sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ sales table created');
} catch (e) {
    console.error('❌ Error creating sales table:', e.message);
}

console.log('✅ Done!');