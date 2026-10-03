// scripts/verify-write-loadtest.js
// v1.1.0 — Verify write-heavy test data landed correctly.
//
// v1.1.0 changes:
//   - Fixed column name: sale_date, not created_at.
//   - Added business_id 71 default for convenience.
//
// Usage:
//   node scripts/verify-write-loadtest.js [businessId]

require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

const businessId = parseInt(process.argv[2], 10) || 71;

(async () => {
  console.log(`\nVerifying write test for business_id=${businessId}\n`);

  const sales = await query(
    'SELECT COUNT(*)::int AS n FROM sales WHERE business_id = $1',
    [businessId]
  );
  console.log(`sales rows       : ${sales.rows[0].n}`);

  const customers = await query(
    'SELECT COUNT(*)::int AS n FROM customers WHERE business_id = $1',
    [businessId]
  );
  console.log(`customers rows   : ${customers.rows[0].n}`);

  const payments = await query(
    `SELECT COUNT(*)::int AS n FROM payments
     WHERE business_id = $1 AND reference_type = 'SALE'`,
    [businessId]
  );
  console.log(`sale payments    : ${payments.rows[0].n}`);

  const debtors = await query(
    'SELECT COUNT(*)::int AS n FROM debtors WHERE business_id = $1',
    [businessId]
  );
  console.log(`debtors rows     : ${debtors.rows[0].n}`);

  const recentSales = await query(
    `SELECT id, item_name, quantity, unit_price, sale_date
     FROM sales
     WHERE business_id = $1
     ORDER BY id DESC
     LIMIT 5`,
    [businessId]
  );
  console.log('\nLatest 5 sales:');
  console.table(recentSales.rows);

  await closePool();
  process.exit(0);
})().catch(async (err) => {
  console.error('Fatal:', err.message);
  try { await closePool(); } catch {}
  process.exit(1);
});