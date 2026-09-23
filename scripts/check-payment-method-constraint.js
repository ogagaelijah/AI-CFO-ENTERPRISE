// scripts/check-payment-method-constraint.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const r = await query(
        `SELECT conname, pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE conname = $1`,
        ['payments_payment_method_check']
    );
    if (r.rows.length === 0) {
        console.log('(no constraint found on payments.payment_method)');
    } else {
        console.log(r.rows[0].conname + ':');
        console.log(r.rows[0].def);
    }
    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});