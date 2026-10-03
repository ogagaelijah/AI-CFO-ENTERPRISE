require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const r = await query(
        'SELECT id, email, full_name FROM users WHERE email = $1',
        ['loadtest@aicfo.test']
    );
    console.log('Rows:', r.rows.length);
    console.table(r.rows);
    await closePool();
    process.exit(0);
})().catch(async (e) => { console.error(e.message); try { await closePool(); } catch {} process.exit(1); });