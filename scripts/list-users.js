// scripts/list-users.js
// Read-only: lists users by verification status.
// Usage:
//   node scripts/list-users.js                       → prod (.env)
//   node scripts/list-users.js --staging             → staging (.env.staging)
//   node scripts/list-users.js --unverified          → only unverified
//   node scripts/list-users.js --staging --unverified

const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  const onlyUnverified = process.argv.includes('--unverified');

  const pool = getPool();
  const client = await pool.connect();
  try {
    const where = onlyUnverified ? 'WHERE email_verified = false' : '';
    const { rows } = await client.query(
      `SELECT id, email, full_name, email_verified, created_at
         FROM users
         ${where}
        ORDER BY id ASC`
    );

    console.log(`[${label}] ${rows.length} users${onlyUnverified ? ' (unverified only)' : ''}:`);
    console.table(rows.map((r) => ({
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      verified: r.email_verified,
      created_at: new Date(r.created_at).toISOString().slice(0, 10),
    })));
  } catch (err) {
    console.error(`[${label}] ERROR:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();