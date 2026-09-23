// scripts/verify-pledges.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const cols = await query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = 'pledges'
         ORDER BY ordinal_position`
    );
    console.log('\n=== PLEDGES COLUMNS ===');
    console.table(cols.rows);

    const idx = await query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'pledges' ORDER BY indexname`
    );
    console.log('\n=== PLEDGES INDEXES ===');
    console.table(idx.rows);

    const cons = await query(
        `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE conrelid = 'pledges'::regclass
         ORDER BY conname`
    );
    console.log('\n=== PLEDGES CONSTRAINTS ===');
    console.table(cons.rows.map(r => ({ conname: r.conname, def: r.def.slice(0, 80) + (r.def.length > 80 ? '...' : '') })));

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});