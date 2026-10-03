// scripts/cleanup-write-loadtest.js
// v1.0.0 — Delete all test data created by write-heavy.ps1.
//
// Removes sales, payments, debtors, customers, inventory for the write-test
// business ONLY. Does not touch the user, business, or subscription rows.
//
// Usage:
//   node scripts/cleanup-write-loadtest.js <businessId>

require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

const businessId = parseInt(process.argv[2], 10);

if (!businessId) {
  console.error('Usage: node scripts/cleanup-write-loadtest.js <businessId>');
  process.exit(1);
}

(async () => {
  console.log(`\nCleaning up write-test data for business_id=${businessId}\n`);

  const report = {};

  const tables = [
    { name: 'payments',   sql: 'DELETE FROM payments WHERE business_id = $1' },
    { name: 'sales',      sql: 'DELETE FROM sales WHERE business_id = $1' },
    { name: 'debtors',    sql: 'DELETE FROM debtors WHERE business_id = $1' },
    { name: 'customers',  sql: "DELETE FROM customers WHERE business_id = $1 AND name LIKE 'LoadTest Customer %'" },
    { name: 'inventory',  sql: "DELETE FROM inventory WHERE business_id = $1 AND item_name LIKE 'LoadTest Item %'" },
  ];

  for (const t of tables) {
    try {
      const r = await query(t.sql, [businessId]);
      report[t.name] = r.rowCount;
      console.log(`  ${t.name.padEnd(12)} deleted ${r.rowCount}`);
    } catch (err) {
      report[t.name] = `error: ${err.message}`;
      console.log(`  ${t.name.padEnd(12)} ERROR: ${err.message}`);
    }
  }

  console.log('\nCleanup complete.');
  await closePool();
  process.exit(0);
})().catch(async (err) => {
  console.error('Fatal:', err.message);
  try { await closePool(); } catch {}
  process.exit(1);
});