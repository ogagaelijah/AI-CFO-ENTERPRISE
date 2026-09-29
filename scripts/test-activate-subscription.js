// scripts/test-activate-subscription.js
// v1.1.0 — P-9.2 test for ActivateSubscriptionUseCase.
// Adds Test 2b: renewal outside tolerance window must NOT be skipped.
//
// Run: node scripts/test-activate-subscription.js

require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');
const ActivateSubscriptionUseCase = require('../src/application/useCases/subscription/ActivateSubscriptionUseCase');

const BUSINESS_ID = 2;
const TEST_PLAN = 'enterprise';
const TEST_CYCLE = 'monthly';

let pass = 0;
let fail = 0;

function assert(name, condition, detail = '') {
    if (condition) { console.log(`  ✅ ${name}`); pass++; }
    else { console.log(`  ❌ ${name}  ${detail}`); fail++; }
}

(async () => {
    console.log('\n=== ActivateSubscriptionUseCase tests (v1.1.0) ===\n');
    const uc = new ActivateSubscriptionUseCase();
    let beforeSubRow = null;
    let createdSubId = null;

    try {
        const before = await query(
            'SELECT id, plan_id, status, billing_cycle, trial_end_date, end_date FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1',
            [BUSINESS_ID]
        );
        beforeSubRow = before.rows[0];
        console.log('state before:', beforeSubRow);

        // ── Test 1: first activation
        console.log('\n[1] First activation — should activate');
        const r1 = await uc.execute({ businessId: BUSINESS_ID, planId: TEST_PLAN, billingCycle: TEST_CYCLE });
        assert('activated === true', r1.activated === true);
        assert('skipped === false', r1.skipped === false);
        assert('subscription present', r1.subscription !== null);
        assert(`planId === ${TEST_PLAN}`, r1.subscription.planId === TEST_PLAN);
        assert('status === active', r1.subscription.status === 'active');
        assert('trialEndDate cleared', r1.subscription.trialEndDate === null);
        assert('endDate in future', r1.subscription.endDate && r1.subscription.endDate.getTime() > Date.now());
        createdSubId = r1.subscription.id;

        // ── Test 2: immediate second call — idempotent skip
        console.log('\n[2] Same call immediately again — should skip');
        const r2 = await uc.execute({ businessId: BUSINESS_ID, planId: TEST_PLAN, billingCycle: TEST_CYCLE });
        assert('activated === false', r2.activated === false, JSON.stringify({ a: r2.activated, s: r2.skipped }));
        assert('skipped === true', r2.skipped === true);
        assert('same subscription id', r2.subscription.id === createdSubId);
        assert('reason === already_active_same_plan_and_cycle', r2.reason === 'already_active_same_plan_and_cycle', r2.reason);

        // ── Test 2b: renewal outside tolerance — must NOT skip
        console.log('\n[2b] Renewal outside tolerance window — must NOT skip');
        // Manipulate the DB so existing.endDate is 2 days in the past (simulates
        // a renewal that arrives after the tolerance window has elapsed).
        // Then activate and confirm it does NOT skip.
        await query(
            `UPDATE subscriptions SET end_date = NOW() - INTERVAL '2 days' WHERE id = $1`,
            [createdSubId]
        );
        const r2b = await uc.execute({ businessId: BUSINESS_ID, planId: TEST_PLAN, billingCycle: TEST_CYCLE });
        assert('activated === true (renewal extends)', r2b.activated === true, JSON.stringify({ a: r2b.activated, s: r2b.skipped }));
        assert('skipped === false', r2b.skipped === false);
        assert('new endDate is in the future', r2b.subscription.endDate.getTime() > Date.now());

        // ── Test 3: invalid businessId
        console.log('\n[3] Invalid businessId — should throw');
        let threw = false;
        try { await uc.execute({ businessId: -1, planId: TEST_PLAN, billingCycle: TEST_CYCLE }); } catch { threw = true; }
        assert('rejected invalid businessId', threw);

        // ── Test 4: unknown plan
        console.log('\n[4] Unknown plan — should throw');
        threw = false;
        try { await uc.execute({ businessId: BUSINESS_ID, planId: 'platinum_imaginary', billingCycle: TEST_CYCLE }); } catch { threw = true; }
        assert('rejected unknown plan', threw);

        // ── Test 5: free plan rejected
        console.log('\n[5] Free plan — should throw (not a paid plan)');
        threw = false;
        try { await uc.execute({ businessId: BUSINESS_ID, planId: 'free', billingCycle: TEST_CYCLE }); } catch { threw = true; }
        assert('rejected free plan', threw);

        // ── Cleanup: restore original subscription state
        console.log('\n[cleanup] Restoring prior state...');
        if (createdSubId && beforeSubRow && createdSubId !== beforeSubRow.id) {
            await query('DELETE FROM subscriptions WHERE id = $1', [createdSubId]);
            console.log(`  deleted new subscription id=${createdSubId}`);
        } else if (createdSubId) {
            await query(
                `UPDATE subscriptions
                 SET plan_id = $1, status = $2, billing_cycle = $3,
                     trial_end_date = $4, end_date = $5
                 WHERE id = $6`,
                [
                    beforeSubRow.plan_id,
                    beforeSubRow.status,
                    beforeSubRow.billing_cycle,
                    beforeSubRow.trial_end_date,
                    beforeSubRow.end_date,
                    createdSubId,
                ]
            );
            console.log(`  restored subscription id=${createdSubId} to ${beforeSubRow.plan_id}/${beforeSubRow.status}`);
        }

        console.log(`\n${pass} passed, ${fail} failed\n`);
        process.exit(fail === 0 ? 0 : 1);
    } catch (err) {
        console.log('\nUNEXPECTED ERROR:', err.message);
        console.log(err.stack);
        // Best-effort cleanup even on failure
        try {
            if (createdSubId && beforeSubRow) {
                await query(
                    `UPDATE subscriptions SET plan_id=$1, status=$2, billing_cycle=$3, trial_end_date=$4, end_date=$5 WHERE id=$6`,
                    [beforeSubRow.plan_id, beforeSubRow.status, beforeSubRow.billing_cycle, beforeSubRow.trial_end_date, beforeSubRow.end_date, createdSubId]
                );
                console.log('  (best-effort restore done)');
            }
        } catch (cleanupErr) {
            console.log('  (cleanup also failed:', cleanupErr.message, ')');
        }
        process.exit(2);
    } finally {
        await closePool();
    }
})();