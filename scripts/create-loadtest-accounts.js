// scripts/create-loadtest-accounts.js
// v2.0.0 — Production-safe load-test account seeder.
//
// Writes directly to public.users + public.businesses via the SAME
// repositories the register route uses. Bypasses the HTTP layer
// entirely, so the register rate limiter (5/hour/IP) is not touched.
//
// Idempotent: re-running skips accounts that already exist.
// Transactional: each account is created atomically.
//
// Run once before load tests:
//   node scripts/create-loadtest-accounts.js
//
// Optional env:
//   LOADTEST_COUNT      default 50
//   LOADTEST_PASSWORD   default LoadTest2026!
//   LOADTEST_DOMAIN     default aicfo.test

require('dotenv').config();

const bcrypt = require('bcrypt');
const crypto = require('crypto');

const {
  withTransaction,
  closePool,
} = require('../src/infrastructure/database/sqlite/connection');

const UserRepository = require('../src/infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../src/infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../src/infrastructure/database/sqlite/repositories/SubscriptionRepository');
const plans = require('../src/config/plans');

const COUNT = parseInt(process.env.LOADTEST_COUNT || '50', 10);
const PASSWORD = process.env.LOADTEST_PASSWORD || 'LoadTest2026!';
const DOMAIN = process.env.LOADTEST_DOMAIN || 'aicfo.test';
const BCRYPT_ROUNDS = 10;

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();

function accountEmail(i) {
  return `loadtest${String(i).padStart(2, '0')}@${DOMAIN}`;
}

async function seedOne(index, passwordHash) {
  const email = accountEmail(index);

  const existing = await userRepo.findByEmail(email);
  if (existing) {
    return { status: 'skipped', email, userId: existing.id };
  }

  const telegramId = `loadtest_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const nowIso = new Date().toISOString();

  const result = await withTransaction(async () => {
    const user = await userRepo.create({
      telegramId,
      email,
      phoneNumber: null,
      fullName: `Load Test ${String(index).padStart(2, '0')}`,
      passwordHash,
      emailVerified: true,
      phoneVerified: false,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      passwordChangedAt: nowIso,
    });

    const business = await businessRepo.create({
      userId: user.id,
      name: `LoadTest Business ${String(index).padStart(2, '0')}`,
      industry: 'Retail',
    });

    const trialPlanId = plans.getTrialPlan();
    const trialPlan = plans.getPlan(trialPlanId);
    const trialDays = plans.getTrialDays(trialPlanId);
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    await subscriptionRepo.create({
      businessId: business.id,
      planId: trialPlanId,
      status: 'trial',
      billingCycle: 'trial',
      startDate: new Date(),
      endDate: null,
      trialEndDate: trialEnd,
      features: trialPlan.features,
    });

    return { userId: user.id, businessId: business.id };
  });

  return { status: 'created', email, ...result };
}

(async () => {
  console.log(`\nSeeding ${COUNT} load-test accounts @${DOMAIN}`);
  console.log(`Password: ${PASSWORD}`);
  console.log(`bcrypt rounds: ${BCRYPT_ROUNDS}\n`);

  // Hash once — bcrypt is the slow part. Same hash is safe to reuse
  // across seed accounts because this is test data, not real users.
  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  const results = { created: [], skipped: [], failed: [] };

  for (let i = 1; i <= COUNT; i++) {
    const email = accountEmail(i);
    try {
      const r = await seedOne(i, passwordHash);
      if (r.status === 'created') {
        results.created.push(r);
        console.log(`  ✅ ${email}  user=${r.userId} business=${r.businessId}`);
      } else {
        results.skipped.push(r);
        console.log(`  ⏭️  ${email}  already exists (user=${r.userId})`);
      }
    } catch (err) {
      results.failed.push({ email, error: err.message });
      console.log(`  ❌ ${email}  ${err.message}`);
    }
  }

  console.log('\n─────────────────────────────');
  console.log(`Created: ${results.created.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Failed:  ${results.failed.length}`);

  if (results.failed.length) {
    console.log('\nFailures:');
    for (const f of results.failed) console.log(`  ${f.email}  ${f.error}`);
    await closePool();
    process.exit(1);
  }

  await closePool();
  process.exit(0);
})().catch(async (err) => {
  console.error('Fatal:', err.message);
  try { await closePool(); } catch {}
  process.exit(1);
});