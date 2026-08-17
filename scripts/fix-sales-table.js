// scripts/fix-sales-table.js
const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

const db = getDatabase();

console.log('🔄 Fixing sales table...');

try {
    db.exec('ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT "UNPAID"');
    console.log('✅ payment_status column added');
} catch (e) {
    if (e.message.includes('duplicate column name')) {
        console.log('⚠️ payment_status column already exists');
    } else {
        console.error('❌ Error adding payment_status:', e.message);
    }
}

try {
    db.exec('ALTER TABLE sales ADD COLUMN amount_paid REAL DEFAULT 0');
    console.log('✅ amount_paid column added');
} catch (e) {
    if (e.message.includes('duplicate column name')) {
        console.log('⚠️ amount_paid column already exists');
    } else {
        console.error('❌ Error adding amount_paid:', e.message);
    }
}

try {
    db.exec('ALTER TABLE sales ADD COLUMN balance_remaining REAL DEFAULT 0');
    console.log('✅ balance_remaining column added');
} catch (e) {
    if (e.message.includes('duplicate column name')) {
        console.log('⚠️ balance_remaining column already exists');
    } else {
        console.error('❌ Error adding balance_remaining:', e.message);
    }
}

console.log('✅ Done!');