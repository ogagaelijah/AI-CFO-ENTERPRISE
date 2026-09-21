// scripts/verify-debtor-dates.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const cols = await query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = 'debtors'
           AND column_name IN ('due_date', 'last_payment_date', 'created_at', 'updated_at')
         ORDER BY column_name`
    );
    console.log('\n=== DEBTORS DATE COLUMNS ===');
    console.table(cols.rows);

    const sample = await query(
        `SELECT id, due_date, last_payment_date
         FROM debtors
         WHERE due_date IS NOT NULL
         ORDER BY id DESC
         LIMIT 5`
    );
    console.log('\n=== SAMPLE ROWS ===');
    console.table(sample.rows);

    const idx = await query(
        `SELECT indexname FROM pg_indexes
         WHERE tablename = 'debtors'
           AND indexname LIKE '%due_date%'`
    );
    console.log('\n=== DUE_DATE INDEX ===');
    console.table(idx.rows);

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});