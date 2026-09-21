// scripts/diagnose-invoice-debtor.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    // Show debtors table columns
    const cols = await query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = 'debtors'
         ORDER BY ordinal_position`
    );
    console.log('\n=== DEBTORS COLUMNS ===');
    console.table(cols.rows);

    // Show customers table columns
    const ccols = await query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = 'customers'
         ORDER BY ordinal_position`
    );
    console.log('\n=== CUSTOMERS COLUMNS ===');
    console.table(ccols.rows);

    // Full debtor rows (star)
    const debtors = await query(
        `SELECT * FROM debtors ORDER BY id DESC LIMIT 12`
    );
    console.log('\n=== DEBTORS (full) ===');
    console.table(debtors.rows);

    // Full customer rows
    const customers = await query(
        `SELECT * FROM customers ORDER BY id DESC LIMIT 12`
    );
    console.log('\n=== CUSTOMERS (full) ===');
    console.table(customers.rows);

    await closePool();
    process.exit(0);
})().catch((e) => {
    console.error('ERR:', e.message);
    process.exit(1);
});