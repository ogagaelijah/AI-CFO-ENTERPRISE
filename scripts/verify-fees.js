// scripts/verify-fees.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const cols = await query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = 'fees'
         ORDER BY ordinal_position`
    );
    console.log('\n=== FEES COLUMNS ===');
    console.table(cols.rows);

    const idx = await query(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'fees'
         ORDER BY indexname`
    );
    console.log('\n=== FEES INDEXES ===');
    console.table(idx.rows.map(r => ({ indexname: r.indexname })));

    const cons = await query(
        `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE conrelid = 'fees'::regclass
         ORDER BY conname`
    );
    console.log('\n=== FEES CONSTRAINTS ===');
    console.table(cons.rows);

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});