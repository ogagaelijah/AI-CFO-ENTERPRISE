// scripts/check-staging.js
// v1.0.0 — Read-only. Confirms what tables exist in the target DB.
// Usage:
//   node scripts/check-staging.js            → checks .env (prod)
//   node scripts/check-staging.js --staging  → checks .env.staging

const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name`
    );
    console.log(`[${label}] public tables: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`[${label}] table names:`, rows.map(r => r.table_name).join(', '));
    }
    const migrationsExists = rows.some(r => r.table_name === 'migrations');
    if (migrationsExists) {
      const { rows: m } = await client.query('SELECT count(*)::int AS c FROM migrations');
      console.log(`[${label}] migrations applied: ${m[0].c}`);
    } else {
      console.log(`[${label}] migrations table: does not exist yet`);
    }
  } catch (err) {
    console.error(`[${label}] ERROR:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();