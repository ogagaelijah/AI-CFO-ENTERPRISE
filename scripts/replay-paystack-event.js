// scripts/replay-paystack-event.js
// Dev tool. Re-dispatches a stored paystack_webhook_events row through
// HandlePaystackWebhookUseCase's dispatch path (bypassing signature check,
// since the payload is already trusted).
//
// Usage:
//   node scripts/replay-paystack-event.js <event_id>
//   node scripts/replay-paystack-event.js <event_id> --force
//
// Options:
//   --force   Re-run even if status is already PROCESSED
//
// Behavior:
//   - Loads the row by event_id
//   - Prints current status
//   - If not --force and status is PROCESSED: refuses and exits
//   - Otherwise: runs _dispatch again against the stored payload
//   - Updates the row to reflect the outcome
//   - Prints a summary
//
// This tool is for local/staging only. It has no auth. Never mount it as a
// route. Never ship it to a user-facing surface.

require('dotenv').config();

const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');
const HandlePaystackWebhookUseCase = require('../src/application/useCases/payment/HandlePaystackWebhookUseCase');

async function main() {
    const args = process.argv.slice(2);
    const eventId = args[0];
    const force = args.includes('--force');

    if (!eventId) {
        console.error('Usage: node scripts/replay-paystack-event.js <event_id> [--force]');
        console.error('Example: node scripts/replay-paystack-event.js evt_12345678');
        process.exit(1);
    }

    console.log(`\n🔍 Replaying event: ${eventId}${force ? ' (--force)' : ''}\n`);

    try {
        // 1. Load the row
        const found = await query(
            `SELECT id, event_id, event_type, payload, status, retry_count,
                    business_id, subscription_id, received_at, processed_at
             FROM paystack_webhook_events
             WHERE event_id = $1`,
            [eventId]
        );

        if (found.rowCount === 0) {
            console.error(`❌ No event found with event_id = ${eventId}`);
            process.exit(2);
        }

        const row = found.rows[0];
        console.log('📋 Current state:');
        console.log('   id:             ', row.id);
        console.log('   event_type:     ', row.event_type);
        console.log('   status:         ', row.status);
        console.log('   retry_count:    ', row.retry_count);
        console.log('   business_id:    ', row.business_id);
        console.log('   subscription_id:', row.subscription_id);
        console.log('   received_at:    ', row.received_at);
        console.log('   processed_at:   ', row.processed_at);
        console.log('');

        // 2. Guard against replaying a PROCESSED event unless --force
        if (row.status === 'PROCESSED' && !force) {
            console.error('⚠️  Event is already PROCESSED. Use --force to replay anyway.');
            process.exit(3);
        }

        // 3. Re-dispatch via the same path the live handler uses
        const event = row.payload;
        if (!event || typeof event !== 'object' || !event.event) {
            console.error('❌ Stored payload is malformed — missing "event" field.');
            process.exit(4);
        }

        console.log(`🔄 Dispatching event type: ${event.event}`);
        const handler = new HandlePaystackWebhookUseCase();

        // Sanity check: handler must expose _dispatch
        if (typeof handler._dispatch !== 'function') {
            console.error('❌ HandlePaystackWebhookUseCase._dispatch is missing.');
            console.error('   Did the use case refactor rename it?');
            process.exit(5);
        }

        const result = await handler._dispatch(event.event, event);

        console.log('\n✅ Dispatch succeeded:');
        console.log('   businessId:     ', result.businessId);
        console.log('   subscriptionId: ', result.subscriptionId);
        console.log('   activated:      ', result.activated);
        console.log('   skipped:        ', result.skipped);

        // 4. Update the row to reflect the outcome
        await query(
            `UPDATE paystack_webhook_events
             SET status = 'PROCESSED',
                 processed_at = NOW(),
                 retry_count = retry_count + 1,
                 error_message = NULL,
                 business_id = COALESCE($1, business_id),
                 subscription_id = COALESCE($2, subscription_id)
             WHERE id = $3`,
            [result.businessId ?? null, result.subscriptionId ?? null, row.id]
        );

        console.log('\n📝 Row updated: status=PROCESSED, retry_count incremented');
    } catch (err) {
        console.error('\n❌ Replay failed:', err.message);
        console.error(err.stack);
        process.exit(6);
    } finally {
        await closePool();
    }
}

main();