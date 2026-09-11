// scripts/verify-batch-1.js
const P = require('../src/config/plans.js');
const db = require('better-sqlite3')('./ai-cfo.db');

console.log('=== SSOT ===');
console.log('basic monthly:', P.getPricing('basic', 'monthly'));
console.log('basic yearly:', P.getPricing('basic', 'yearly'));
console.log('pro discount %:', P.getPricing('pro').yearlyDiscountPercent);
console.log('pro yearly savings:', P.getPricing('pro').yearlySavings);
console.log('public plan ids:', P.getPublicPlanIds());
console.log('pro trial days:', P.getTrialDays('pro'));

console.log('');
console.log('=== DB: plans ===');
console.log(db.prepare('SELECT id, name, price, trial_days, currency FROM plans').all());

console.log('');
console.log('=== DB: subscription plan_ids ===');
console.log(db.prepare('SELECT DISTINCT plan_id FROM subscriptions').all());

console.log('');
console.log('=== DB: subscription billing_cycles ===');
console.log(db.prepare('SELECT DISTINCT billing_cycle FROM subscriptions').all());

console.log('');
console.log('=== Payment plans (SSOT) ===');
console.log(JSON.stringify(P.getPaymentPlans(), null, 2));