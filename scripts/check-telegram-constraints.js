const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  const pool = getPool();
  const client = await pool.connect();
  try {
    const cons = await client.query(`
      SELECT con.conname AS constraint_name, con.contype AS type,
             pg_get_constraintdef(con.oid) AS definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
       WHERE rel.relname = 'users'
    `);
    console.log(`[${label}] constraints on users:`);
    console.table(cons.rows);

    const idx = await client.query(`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users'
    `);
    console.log(`[${label}] indexes on users:`);
    console.table(idx.rows);
  } catch (err) {
    console.error(`[${label}] ERROR:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();