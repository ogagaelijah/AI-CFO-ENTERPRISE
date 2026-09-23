// scripts/verify-income-ref.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const cols = await query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'income'
           AND column_name IN ('reference_type', 'reference_id')
         ORDER BY column_name`
    );
    console.log('\n=== INCOME REFERENCE COLUMNS ===');
    console.table(cols.rows);

    const cons = await query(
        `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE conrelid = 'income'::regclass
           AND conname = 'income_reference_type_check'`
    );
    console.log('\n=== INCOME REFERENCE CONSTRAINT ===');
    for (const row of cons.rows) {
        console.log(row.conname + ':');
        console.log(row.def);
    }

    const idx = await query(
        `SELECT indexname FROM pg_indexes
         WHERE tablename = 'income' AND indexname = 'idx_income_business_reference'`
    );
    console.log('\n=== INCOME REFERENCE INDEX ===');
    console.table(idx.rows);

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});