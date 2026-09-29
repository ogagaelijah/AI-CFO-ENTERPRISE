// scripts/test-webhook-http.js
// P-9.3 — HTTP-level webhook tests. Fires real POSTs at the running server
// and verifies DB state after each. Cleans up its own test rows.
//
// Requires:
//   - Server running at http://localhost:5000
//   - PAYSTACK_SECRET_KEY set in .env (must match server's key)
//   - PAYSTACK_RETRY_SWEEP_DISABLED=true (so sweep doesn't race us)
//
// Run: node scripts/test-webhook-http.js

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

const BASE = 'http://localhost:5000';
const SECRET = process.env.PAYSTACK_SECRET_KEY;
const BUSINESS_ID = 2;
const TEST_PREFIX = `AICFO_TEST_${Date.now()}_`;

if (!SECRET) {
    console.error('❌ PAYSTACK_SECRET_KEY is not set. Refusing to run.');
    process.exit(1);
}

// ── Unique event ids per run so we don't collide with prior runs
const RUN_ID = Date.now();
const eid = (suffix) => `evt_test_${RUN_ID}_${suffix}`;
const ref = (suffix) => `${TEST_PREFIX}${suffix}`;

let pass = 0;
let fail = 0;
const createdEventIds = [];

function assert(name, condition, detail = '') {
    if (condition) { console.log(`  ✅ ${name}`); pass++; }
    else { console.log(`  ❌ ${name}  ${detail}`); fail++; }
}

function sign(bodyString) {
    return crypto.createHmac('sha512', SECRET).update(Buffer.from(bodyString, 'utf8')).digest('hex');
}

async function postWebhook(bodyString, opts = {}) {
    const url = `${BASE}/api/payment/webhook/paystack`;
    const headers = { 'Content-Type': 'application/json' };
    if (opts.signed !== false) {
        headers['x-paystack-signature'] = opts.signature || sign(bodyString);
    }
    try {
        const r = await axios.post(url, bodyString, {
            headers,
            validateStatus: () => true,     // don't throw on 4xx/5xx
            transformRequest: [(d) => d],   // send the raw string, don't re-serialize
        });
        return { status: r.status, data: r.data };
    } catch (err) {
        return { status: 0, data: { error: err.message } };
    }
}

function chargeSuccessBody(eventId, reference, businessId = BUSINESS_ID, plan = 'pro', cycle = 'monthly') {
    return JSON.stringify({
        event: 'charge.success',
        data: {
            id: eventId.replace('evt_', ''),
            reference,
            amount: 450000,
            status: 'success',
            metadata: { businessId, plan, billingCycle: cycle },
        },
    });
}

function chargeFailedBody(eventId, reference, businessId = BUSINESS_ID) {
    return JSON.stringify({
        event: 'charge.failed',
        data: {
            id: eventId.replace('evt_', ''),
            reference,
            amount: 450000,
            status: 'failed',
            metadata: { businessId, plan: 'pro', billingCycle: 'monthly' },
        },
    });
}

async function fetchEvent(eventId) {
    const r = await query('SELECT * FROM paystack_webhook_events WHERE event_id = $1', [eventId]);
    return r.rows[0] || null;
}

async function fetchSubscription() {
    const r = await query(
        'SELECT id, plan_id, status, billing_cycle, end_date FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1',
        [BUSINESS_ID]
    );
    return r.rows[0] || null;
}

(async () => {
    console.log('\n=== Webhook HTTP tests (P-9.3) ===\n');
    console.log('Server:', BASE);
    console.log('Test business:', BUSINESS_ID);
    console.log('');

    // Snapshot for cleanup
    const originalSub = await fetchSubscription();
    console.log('subscription before tests:', originalSub);

    try {
        // ── 1. Unsigned request → 401, no row
        console.log('\n[1] Unsigned request — expect 401, no row');
        const e1 = eid('unsigned');
        const body1 = chargeSuccessBody(e1, ref('1'));
        const r1 = await postWebhook(body1, { signed: false });
        assert('HTTP 401', r1.status === 401, `got ${r1.status}`);
        const row1 = await fetchEvent(e1);
        assert('no row written', row1 === null, JSON.stringify(row1));

        // ── 2. Bad signature → 401, no row
        console.log('\n[2] Bad signature — expect 401, no row');
        const e2 = eid('badsig');
        const body2 = chargeSuccessBody(e2, ref('2'));
        const r2 = await postWebhook(body2, { signature: 'f'.repeat(128) });
        assert('HTTP 401', r2.status === 401, `got ${r2.status}`);
        const row2 = await fetchEvent(e2);
        assert('no row written', row2 === null);

        // ── 3. Valid signed charge.success → 200, row PROCESSED, subscription active
        console.log('\n[3] Valid charge.success — expect 200, row PROCESSED, subscription active');
        const e3 = eid('success1');
        const body3 = chargeSuccessBody(e3, ref('3'));
        const r3 = await postWebhook(body3);
        assert('HTTP 200', r3.status === 200, `got ${r3.status}, body: ${JSON.stringify(r3.data)}`);
        createdEventIds.push(e3);
        const row3 = await fetchEvent(e3);
        assert('row written', row3 !== null);
        assert('row.event_type === charge.success', row3?.event_type === 'charge.success', row3?.event_type);
        assert('row.status === PROCESSED', row3?.status === 'PROCESSED', row3?.status);
        assert('row.business_id === 2', row3?.business_id === BUSINESS_ID, String(row3?.business_id));
        assert('row.subscription_id is set', row3?.subscription_id !== null, String(row3?.subscription_id));
        const sub3 = await fetchSubscription();
        assert('subscription plan === pro', sub3?.plan_id === 'pro', sub3?.plan_id);
        assert('subscription status === active', sub3?.status === 'active', sub3?.status);
        assert('subscription end_date in future', sub3?.end_date && sub3.end_date.getTime() > Date.now());

        // ── 4. Duplicate of event 3 → 200, no new row, subscription unchanged
        console.log('\n[4] Duplicate of event 3 — expect 200, no new row');
        const r4 = await postWebhook(body3);
        assert('HTTP 200', r4.status === 200, `got ${r4.status}`);
        const dupRows = await query('SELECT COUNT(*)::int AS n FROM paystack_webhook_events WHERE event_id = $1', [e3]);
        assert('still exactly 1 row for event_id', dupRows.rows[0].n === 1, `count = ${dupRows.rows[0].n}`);
        const sub4 = await fetchSubscription();
        assert('subscription end_date unchanged', sub4?.end_date?.getTime() === sub3?.end_date?.getTime());

        // ── 5. charge.failed → 200, row PROCESSED, subscription unchanged
        console.log('\n[5] charge.failed — expect 200, row PROCESSED, subscription unchanged');
        const e5 = eid('failed');
        const body5 = chargeFailedBody(e5, ref('5'));
        const r5 = await postWebhook(body5);
        assert('HTTP 200', r5.status === 200, `got ${r5.status}`);
        createdEventIds.push(e5);
        const row5 = await fetchEvent(e5);
        assert('row written', row5 !== null);
        assert('row.event_type === charge.failed', row5?.event_type === 'charge.failed');
        assert('row.status === PROCESSED', row5?.status === 'PROCESSED', row5?.status);
        const sub5 = await fetchSubscription();
        assert('subscription unchanged (still active pro)', sub5?.plan_id === 'pro' && sub5?.status === 'active');

        // ── 6. Valid signature, malformed JSON → 400
        console.log('\n[6] Malformed JSON after valid signature — expect 400');
        const malformed = '{ this is not json';
        const r6 = await postWebhook(malformed);
        assert('HTTP 400', r6.status === 400, `got ${r6.status}, body: ${JSON.stringify(r6.data)}`);

        // ── 7. Signed request for nonexistent business → 200, row PROCESSED (skipped)
        console.log('\n[7] charge.success for nonexistent business — expect 200, row PROCESSED, no activation');
        const e7 = eid('ghostbiz');
        const body7 = chargeSuccessBody(e7, ref('7'), 999999, 'pro', 'monthly');
        const r7 = await postWebhook(body7);
        assert('HTTP 200', r7.status === 200, `got ${r7.status}`);
        createdEventIds.push(e7);
        const row7 = await fetchEvent(e7);
        assert('row written', row7 !== null);
        assert('row.status === PROCESSED', row7?.status === 'PROCESSED', row7?.status);

        // ── 8. Legacy Flutterwave webhook path → 404
        console.log('\n[8] Legacy Flutterwave path — expect 404');
        try {
            const r8 = await axios.post(
                `${BASE}/api/payment/webhook/flutterwave`,
                { event: 'charge.completed' },
                { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
            );
            assert('HTTP 404', r8.status === 404, `got ${r8.status}`);
        } catch (err) {
            assert('HTTP 404 (got exception)', false, err.message);
        }

        // ── Summary
        console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
    } catch (err) {
        console.log('\nUNEXPECTED ERROR:', err.message);
        console.log(err.stack);
    } finally {
        // ── Cleanup
        console.log('cleaning up...');
        try {
            // Delete test events
            if (createdEventIds.length > 0) {
                const del = await query(
                    'DELETE FROM paystack_webhook_events WHERE event_id = ANY($1::text[])',
                    [createdEventIds]
                );
                console.log(`  deleted ${del.rowCount} test event rows`);
            }
            // Restore subscription to original state
            if (originalSub) {
                await query(
                    `UPDATE subscriptions
                     SET plan_id = $1, status = $2, billing_cycle = $3, end_date = $4
                     WHERE id = $5`,
                    [originalSub.plan_id, originalSub.status, originalSub.billing_cycle, originalSub.end_date, originalSub.id]
                );
                console.log(`  restored subscription id=${originalSub.id} to ${originalSub.plan_id}/${originalSub.status}`);
            }
        } catch (cleanupErr) {
            console.log('  CLEANUP ERROR:', cleanupErr.message);
        } finally {
            await closePool();
        }
        process.exit(fail === 0 ? 0 : 1);
    }
})();