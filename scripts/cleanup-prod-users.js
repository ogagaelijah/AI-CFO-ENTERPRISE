// scripts/cleanup-prod-users.js
// One-shot cleanup. Deletes all users EXCEPT a whitelist, along with
// their businesses, subscriptions, and dependent records.
//
// Usage:
//   node scripts/cleanup-prod-users.js                     → dry-run (prod .env)
//   node scripts/cleanup-prod-users.js --staging           → dry-run (staging .env)
//   node scripts/cleanup-prod-users.js --execute           → real run (requires confirmation phrase)
//   node scripts/cleanup-prod-users.js --staging --execute → real run on staging
//
// Safety:
//   - Always backs up to JSON before deleting
//   - Requires typing "DELETE-ALL-EXCEPT-WHITELIST" to proceed
//   - Whitelist is defined below — edit this file if the whitelist changes

const fs = require('fs');
const path = require('path');
const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

// ── Whitelist: users to KEEP. Everyone else is deleted.
const KEEP_EMAILS = [
  'omanostimo@gmail.com',
];

(async () => {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  const execute = process.argv.includes('--execute');
  const pool = getPool();
  const client = await pool.connect();

  try {
    // ── 1. Show whitelist
    console.log(`\n[${label}] Whitelist (will NOT be deleted):`);
    console.table(KEEP_EMAILS.map((e) => ({ email: e })));

    // ── 2. Fetch all users, split into keep/delete
    const { rows: allUsers } = await client.query(
      `SELECT id, email, full_name, created_at FROM users ORDER BY id`
    );
    const keepUsers = allUsers.filter((u) => KEEP_EMAILS.includes(u.email));
    const deleteUsers = allUsers.filter((u) => !KEEP_EMAILS.includes(u.email));

    console.log(`\n[${label}] Total users: ${allUsers.length}`);
    console.log(`[${label}] To keep:     ${keepUsers.length}`);
    console.log(`[${label}] To delete:   ${deleteUsers.length}`);

    if (keepUsers.length === 0) {
      console.error(`\n⚠️  WARNING: no whitelist users matched. Aborting to prevent accidental full wipe.`);
      process.exit(1);
    }

    const deleteIds = deleteUsers.map((u) => u.id);

    // ── 3. Get business IDs owned by users being deleted
    const { rows: bizRows } = await client.query(
      `SELECT id FROM businesses WHERE user_id = ANY($1::int[])`,
      [deleteIds]
    );
    const bizIds = bizRows.map((b) => b.id);

    // ── 4. Preview related rows
    const previewByUser = async (table) => {
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS c FROM ${table} WHERE user_id = ANY($1::int[])`,
        [deleteIds]
      );
      return rows[0].c;
    };

    const previewByBusiness = async (table) => {
      if (bizIds.length === 0) return 0;
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS c FROM ${table} WHERE business_id = ANY($1::int[])`,
        [bizIds]
      );
      return rows[0].c;
    };

    const counts = {
      businesses: bizIds.length,
      notifications: await previewByUser('notifications'),
      subscriptions: await previewByBusiness('subscriptions'),
      sales: await previewByBusiness('sales'),
      expenses: await previewByBusiness('expenses'),
      income: await previewByBusiness('income'),
      debtors: await previewByBusiness('debtors'),
      creditors: await previewByBusiness('creditors'),
      customers: await previewByBusiness('customers'),
      suppliers: await previewByBusiness('suppliers'),
      purchases: await previewByBusiness('purchases'),
      payments: await previewByBusiness('payments'),
      invoices: await previewByBusiness('invoices'),
      inventory: await previewByBusiness('inventory'),
    };

    console.log(`\n[${label}] Related rows that will be deleted:`);
    console.table(counts);

    // ── 5. Dry-run stop
    if (!execute) {
      console.log(`\n[${label}] DRY RUN — nothing deleted.`);
      console.log(`[${label}] To execute for real, re-run with --execute.`);
      return;
    }

    // ── 6. Explicit confirmation
    console.log(`\n⚠️  About to delete ${deleteUsers.length} users and all their data on ${label}.`);
    console.log(`    This is IRREVERSIBLE (but we back up to JSON first).`);
    console.log(`\n    Type exactly this to proceed:`);
    console.log(`      DELETE-ALL-EXCEPT-WHITELIST\n`);

    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) =>
      rl.question('Confirmation: ', (a) => { rl.close(); resolve(a); })
    );
    if (answer.trim() !== 'DELETE-ALL-EXCEPT-WHITELIST') {
      console.log('Aborted. Nothing was deleted.');
      return;
    }

    // ── 7. Backup to JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `../prod-users-backup-${timestamp}.json`);

    const { rows: backupUsers } = await client.query(
      `SELECT * FROM users WHERE id = ANY($1::int[])`,
      [deleteIds]
    );
    const { rows: backupBusinesses } = await client.query(
      `SELECT * FROM businesses WHERE user_id = ANY($1::int[])`,
      [deleteIds]
    );
    const { rows: backupSubscriptions } = bizIds.length === 0 ? { rows: [] } :
      await client.query(
        `SELECT * FROM subscriptions WHERE business_id = ANY($1::int[])`,
        [bizIds]
      );

    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          environment: label,
          users: backupUsers,
          businesses: backupBusinesses,
          subscriptions: backupSubscriptions,
        },
        null,
        2
      )
    );
    console.log(`\n✅ Backup written to: ${backupPath}`);

    // ── 8. Delete in dependency order
    console.log(`\n[${label}] Deleting...`);

    const del = async (table, column, ids) => {
      if (ids.length === 0) return 0;
      const { rowCount } = await client.query(
        `DELETE FROM ${table} WHERE ${column} = ANY($1::int[])`,
        [ids]
      );
      return rowCount;
    };

    // User-scoped children
    await del('notifications', 'user_id', deleteIds);

    // Business-scoped children
    await del('payments', 'business_id', bizIds);
    await del('invoices', 'business_id', bizIds);
    await del('inventory', 'business_id', bizIds);
    await del('purchases', 'business_id', bizIds);
    await del('suppliers', 'business_id', bizIds);
    await del('customers', 'business_id', bizIds);
    await del('creditors', 'business_id', bizIds);
    await del('debtors', 'business_id', bizIds);
    await del('income', 'business_id', bizIds);
    await del('expenses', 'business_id', bizIds);
    await del('sales', 'business_id', bizIds);
    await del('subscriptions', 'business_id', bizIds);

    // Businesses themselves
    await del('businesses', 'user_id', deleteIds);

    // Finally, users
    const deletedUsers = await del('users', 'id', deleteIds);

    console.log(`\n✅ Deleted ${deletedUsers} users (and their related records).`);

    // ── 9. Final state
    const { rows: finalCount } = await client.query(
      `SELECT COUNT(*)::int AS c FROM users`
    );
    console.log(`[${label}] Final user count: ${finalCount[0].c}`);

    const { rows: finalKeep } = await client.query(
      `SELECT id, email, full_name FROM users ORDER BY id`
    );
    console.table(finalKeep);
  } catch (err) {
    console.error(`[${label}] ERROR:`, err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
})();