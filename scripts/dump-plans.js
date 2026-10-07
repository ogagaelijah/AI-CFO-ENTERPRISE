// scripts/dump-plans.js
// One-shot: dumps the full plans table from prod so we can replicate it in the seed.
const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, name, price, currency, trial_days, features, limits
        FROM plans
       ORDER BY price
    `);
    console.log(`[${label}] full plans dump:`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(`[${label}] ERROR:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();