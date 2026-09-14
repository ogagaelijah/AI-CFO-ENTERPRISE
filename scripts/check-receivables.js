// scripts/check-receivables.js
require('dotenv').config();
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    try {
        const r = await getPool().query(
            `SELECT
                COALESCE(SUM(balance_remaining), 0)::numeric AS outstanding,
                COUNT(*)::int AS count
             FROM debtors
             WHERE business_id = $1 AND status != 'PAID'`,
            [1]
        );
        console.log('Outstanding from debtors:', r.rows[0]);

        const revenueVsCashGap = 336700 - 311550;
        console.log('\nRevenue − Cash In gap :', revenueVsCashGap);
        console.log('Debtors outstanding  :', Number(r.rows[0].outstanding));
        console.log('Match?               :', Number(r.rows[0].outstanding) === revenueVsCashGap ? 'YES' : 'NO');
    } catch (e) {
        console.error('❌', e.message);
    } finally {
        await closePool();
    }
})();