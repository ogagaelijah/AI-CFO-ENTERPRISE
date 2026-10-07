// scripts/drop-staging-migrations-table.js
// One-shot: drops the orphan `migrations` table from staging so a fresh
// migration run can bootstrap cleanly. Refuses to run against prod.

const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
if (!process.argv.includes('--staging')) {
  console.error('❌ Refusing to run without --staging flag. This script only targets staging.');
  process.exit(1);
}
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT count(*)::int AS c FROM migrations`
    );
    const count = rows[0].c;
    console.log(`Orphan migrations table has ${count} rows.`);
    if (count > 0) {
      console.error('❌ Refusing to drop — table has rows. Manual review required.');
      process.exit(1);
    }
    await client.query('DROP TABLE migrations');
    console.log('✅ Dropped orphan migrations table from staging.');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();