// scripts/check-schema.js
// Read-only: prints the column types for users.telegram_id on the target DB.
// Usage:
//   node scripts/check-schema.js            → prod (.env)
//   node scripts/check-schema.js --staging  → staging (.env.staging)

const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
       WHERE table_name = 'users'
         AND column_name LIKE '%telegram%'
       ORDER BY column_name
    `);
    console.log(`[${label}] users.telegram* columns:`);
    console.table(rows);
  } catch (err) {
    console.error(`[${label}] ERROR:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();