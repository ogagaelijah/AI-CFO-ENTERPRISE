// scripts/create-write-loadtest-account.js
// v1.0.0 — Creates a dedicated write-test account and business.
//
// One account: writetest@aicfo.test
// One business: Write Test Co
// Purpose: isolate all write-heavy load test data into a single business_id
//          so cleanup is a simple DELETE by business_id.
//
// Idempotent: re-running skips creation if the account exists, but always
// prints the business_id so the load test can find it.

require('dotenv').config();

const bcrypt = require('bcrypt');
const crypto = require('crypto');

const {
  withTransaction,
  query,
  closePool,
} = require('../src/infrastructure/database/sqlite/connection');

const UserRepository = require('../src/infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../src/infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../src/infrastructure/database/sqlite/repositories/SubscriptionRepository');
const plans = require('../src/config/plans');

const EMAIL = 'writetest@aicfo.test';
const PASSWORD = 'WriteTest2026!';
const BUSINESS_NAME = 'Write Test Co';
const INDUSTRY = 'Retail';
const BCRYPT_ROUNDS = 10;

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();

(async () => {
  console.log(`\nSeeding write-test account: ${EMAIL}\n`);

  const existing = await userRepo.findByEmail(EMAIL);
  if (existing) {
    const existingBiz = await businessRepo.findByUserIdFirst(existing.id);
    if (existingBiz) {
      console.log(`⏭️  Account already exists: user=${existing.id} business=${existingBiz.id}`);
      console.log(`\nWRITE_TEST_BUSINESS_ID=${existingBiz.id}`);
      await closePool();
      process.exit(0);
    }
    console.log(`⚠️  User exists (id=${existing.id}) but no business found. Creating business...`);
    const biz = await businessRepo.create({
      userId: existing.id,
      name: BUSINESS_NAME,
      industry: INDUSTRY,
    });
    console.log(`✅ Business created: id=${biz.id}`);
    console.log(`\nWRITE_TEST_BUSINESS_ID=${biz.id}`);
    await closePool();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
  const telegramId = `writetest_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const nowIso = new Date().toISOString();

  const result = await withTransaction(async () => {
    const user = await userRepo.create({
      telegramId,
      email: EMAIL,
      phoneNumber: null,
      fullName: 'Write Test User',
      passwordHash,
      emailVerified: true,
      phoneVerified: false,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      passwordChangedAt: nowIso,
    });

    const business = await businessRepo.create({
      userId: user.id,
      name: BUSINESS_NAME,
      industry: INDUSTRY,
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

  console.log(`✅ Created user=${result.userId} business=${result.businessId}`);
  console.log(`\nWRITE_TEST_BUSINESS_ID=${result.businessId}`);

  await closePool();
  process.exit(0);
})().catch(async (err) => {
  console.error('Fatal:', err.message);
  try { await closePool(); } catch {}
  process.exit(1);
});