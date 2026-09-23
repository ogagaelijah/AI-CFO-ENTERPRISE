// scripts/check-ref-constraints.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const r = await query(
        `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE conname IN ($1, $2)
         ORDER BY conname`,
        ['payments_reference_type_check', 'transactions_reference_type_check']
    );
    console.log('\n=== REFERENCE_TYPE CONSTRAINTS ===\n');
    for (const row of r.rows) {
        console.log(`${row.conname}:`);
        console.log(row.def);
        console.log('');
    }
    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});