// scripts/check-businesses-schema.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const cols = await query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'businesses'
         ORDER BY ordinal_position`
    );
    console.log('\n=== BUSINESSES COLUMNS ===');
    console.table(cols.rows);

    const sample = await query(
        `SELECT id, user_id, name, industry
         FROM businesses
         WHERE id IN (1, 16)
         ORDER BY id`
    );
    console.log('\n=== SAMPLE BUSINESSES (ids 1 and 16) ===');
    console.table(sample.rows);

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});