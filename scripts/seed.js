// scripts/seed.js

const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

async function seedDatabase() {
    console.log('🌱 Seeding database...');
    
    const db = getDatabase();
    
    const existing = db.prepare('SELECT COUNT(*) as count FROM plans').get();
    if (existing.count > 0) {
        console.log('⏭️ Plans already exist. Skipping seed.');
        return;
    }
    
    const insert = db.prepare(`
        INSERT INTO plans (id, name, price, currency, trial_days, features, limits)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    insert.run(
        'free', 'Free', 0, 'NGN', 30,
        JSON.stringify({
            maxTransactions: 50,
            maxCustomers: 20,
            maxProducts: 20,
            inventory: true,
            debtors: true,
            creditors: true,
            ai: false,
            forecasting: false,
            reports: false
        }),
        JSON.stringify({ transactionsPerMonth: 50, customersPerMonth: 20 })
    );
    
    insert.run(
        'pro', 'Pro', 5000, 'NGN', 0,
        JSON.stringify({
            maxTransactions: 999999999,
            maxCustomers: 999999999,
            maxProducts: 999999999,
            inventory: true,
            debtors: true,
            creditors: true,
            ai: true,
            forecasting: true,
            reports: true
        }),
        JSON.stringify({ transactionsPerMonth: 999999999, customersPerMonth: 999999999 })
    );
    
    console.log('✅ Plans seeded successfully.');
}

if (require.main === module) {
    seedDatabase().catch(console.error);
}

module.exports = seedDatabase;