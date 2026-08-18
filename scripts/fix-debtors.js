// scripts/fix-debtors.js
const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

const db = getDatabase();

console.log('🔄 Fixing debtors with zero balance...');

// Update any debtor with balance <= 0 to PAID status and balance = 0
const result = db.prepare(`
    UPDATE debtors 
    SET status = 'PAID', 
        balance_remaining = 0 
    WHERE balance_remaining <= 0
`).run();

console.log(`✅ Fixed ${result.changes} debtor(s)`);

// Show all debtors
const debtors = db.prepare('SELECT id, customer_name, balance_remaining, status FROM debtors').all();
console.log('\n📋 Current debtors:');
console.log(JSON.stringify(debtors, null, 2));