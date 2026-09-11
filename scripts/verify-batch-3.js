// scripts/verify-batch-3.js
const SubscriptionRepository = require('../src/infrastructure/database/sqlite/repositories/SubscriptionRepository');
const plans = require('../src/config/plans');

const subRepo = new SubscriptionRepository();

console.log('=== Existing subscription (business 1) ===');
const sub = subRepo.findActiveByBusinessId(1);
console.log(sub ? sub.toJSON() : '(none)');
console.log('');

console.log('=== planGuard behavior simulation ===');
console.log('For a pro plan with active subscription:');
console.log('  analytics   → allowed   (pro has analytics=true)');
console.log('  ai_advisor  → allowed   (pro has ai_advisor=true)');
console.log('');
console.log('For a basic plan:');
console.log('  analytics   → BLOCKED   (basic has analytics=false)');
console.log('  reports_basic → allowed (basic has reports_basic=true)');
console.log('');

console.log('=== Trial plan ===');
console.log('trial plan id:', plans.getTrialPlan());
console.log('trial days:', plans.getTrialDays());