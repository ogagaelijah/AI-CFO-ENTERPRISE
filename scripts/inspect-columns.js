// scripts/inspect-columns.js
// Read-only: lists business-linked columns on user-scoped tables.

const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  const pool = getPool();
  const client = await pool.connect();

  try {
    const tables = [
      'subscriptions',
      'sales',
      'expenses',
      'income',
      'debtors',
      'creditors',
      'customers',
      'suppliers',
      'purchases',
      'payments',
      'invoices',
      'inventory',
      'notifications',
      'users',
      'businesses',
    ];

    console.log(`[${label}] Column inspection:\n`);

    for (const t of tables) {
      const { rows } = await client.query(
        `SELECT column_name, data_type
           FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position`,
        [t]
      );
      console.log(`=== ${t} ===`);
      if (rows.length === 0) {
        console.log('  (table not found)\n');
        continue;
      }
      console.log('  ' + rows.map((r) => `${r.column_name}:${r.data_type}`).join(', '));
      console.log('');
    }
  } catch (err) {
    console.error(`[${label}] ERROR:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();