// scripts/check-ngo-pledges.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const r = await query(
        'SELECT id, donor_id, amount, amount_fulfilled, status, category FROM pledges WHERE business_id = $1 ORDER BY id',
        [18]
    );
    console.log('\n=== PLEDGES for business 18 ===');
    console.table(r.rows);

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});