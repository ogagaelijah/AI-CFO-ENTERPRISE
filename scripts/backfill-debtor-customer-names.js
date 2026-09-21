// scripts/backfill-debtor-customer-names.js
//
// One-shot backfill: for every debtor row where customer_id IS NOT NULL,
// rewrite customer_name from customers.name (the source of truth).
//
// Safe to re-run:
//   - Only touches rows where names actually differ.
//   - Runs in a single transaction (all-or-nothing).
//   - Reports how many rows changed.
//
// Usage:
//   node scripts/backfill-debtor-customer-names.js           # dry-run (default)
//   node scripts/backfill-debtor-customer-names.js --apply   # actually write

'use strict';

require('dotenv').config();
const { query, withTransaction, closePool } = require('../src/infrastructure/database/sqlite/connection');

const APPLY = process.argv.includes('--apply');

(async () => {
    console.log(`\n=== Debtor customer_name backfill ===`);
    console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY-RUN (no writes)'}\n`);

    // 1. Find rows that would change.
    const stale = await query(
        `SELECT
            d.id,
            d.business_id,
            d.customer_id,
            d.customer_name AS current_name,
            c.name          AS resolved_name
         FROM debtors d
         INNER JOIN customers c
            ON c.id = d.customer_id
           AND c.business_id = d.business_id
         WHERE d.customer_id IS NOT NULL
           AND (d.customer_name IS NULL OR d.customer_name <> c.name)
         ORDER BY d.id`
    );

    if (stale.rows.length === 0) {
        console.log('✅ Nothing to backfill. All debtor names match customers.');
        await closePool();
        process.exit(0);
    }

    console.log(`Found ${stale.rows.length} debtor row(s) needing backfill:\n`);
    console.table(stale.rows.map(r => ({
        id: r.id,
        business_id: r.business_id,
        customer_id: r.customer_id,
        from: r.current_name,
        to: r.resolved_name,
    })));

    if (!APPLY) {
        console.log('\n(DRY-RUN — no changes written.)');
        console.log('Re-run with --apply to write.\n');
        await closePool();
        process.exit(0);
    }

    // 2. Apply in a single transaction.
    const updated = await withTransaction(async () => {
        const result = await query(
            `UPDATE debtors d
             SET customer_name = c.name,
                 updated_at = NOW()
             FROM customers c
             WHERE c.id = d.customer_id
               AND c.business_id = d.business_id
               AND d.customer_id IS NOT NULL
               AND (d.customer_name IS NULL OR d.customer_name <> c.name)`
        );
        return result.rowCount;
    });

    console.log(`\n✅ Backfill complete. ${updated} row(s) updated.`);
    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('❌ Backfill failed:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});