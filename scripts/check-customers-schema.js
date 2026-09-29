// scripts/check-customers-schema.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const c = await query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = 'customers'
         ORDER BY ordinal_position`
    );
    console.log('\n=== CUSTOMERS COLUMNS ===');
    console.table(c.rows);

    const k = await query(
        `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE conrelid = 'customers'::regclass
         ORDER BY conname`
    );
    console.log('\n=== CUSTOMERS CONSTRAINTS ===');
    console.table(k.rows.map(r => ({
        conname: r.conname,
        def: r.def.slice(0, 120),
    })));

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});