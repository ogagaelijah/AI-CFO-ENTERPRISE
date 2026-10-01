// scripts/check-my-businesses.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const users = await query(
        `SELECT u.id AS user_id, u.email, b.id AS business_id, b.name, b.industry
         FROM users u
         LEFT JOIN businesses b ON b.user_id = u.id
         WHERE u.email IN ($1, $2)
         ORDER BY b.id`,
        ['ogalosautomation@gmail.com', 'bigi@gmail.com']
    );
    console.log('\n=== USERS AND BUSINESSES ===');
    console.table(users.rows);

    const businessIds = users.rows.map(r => r.business_id).filter(Boolean);

    if (businessIds.length > 0) {
        const subs = await query(
            `SELECT id, business_id, plan_id, status, start_date, end_date, trial_end_date
             FROM subscriptions
             WHERE business_id = ANY($1::int[])
             ORDER BY business_id, id DESC`,
            [businessIds]
        );
        console.log('\n=== SUBSCRIPTIONS ===');
        console.table(subs.rows);

        const events = await query(
            `SELECT id, event_id, event_type, status, business_id, subscription_id, error_message, received_at
             FROM paystack_webhook_events
             WHERE business_id = ANY($1::int[])
             ORDER BY id DESC`,
            [businessIds]
        );
        console.log('\n=== WEBHOOK EVENTS ===');
        console.table(events.rows);
    }

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});