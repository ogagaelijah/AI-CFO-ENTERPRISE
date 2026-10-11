// scripts/seed.js
// v2.0.0 — Postgres-compatible idempotent seeder.
// Replaces the old SQLite-based v1 (which was broken after the pg migration).
// Supports --staging flag to target .env.staging.
//
// Usage:
//   node scripts/seed.js             → prod (.env)
//   node scripts/seed.js --staging   → staging (.env.staging)
//
// Safe to re-run: uses INSERT ... ON CONFLICT (id) DO NOTHING.

const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

const PLANS = [
  {
    id: 'free',
    name: 'Free (Internal)',
    price: 0,
    currency: 'NGN',
    trial_days: 0,
    features: {
      risk: false, sales: true, alerts: false, income: true, debtors: true,
      expenses: true, forecast: false, payments: true, analytics: false,
      creditors: true, customers: true, decisions: false, inventory: true,
      purchases: true, suppliers: true, ai_advisor: false, api_access: false,
      team_roles: false, white_label: false, reports_aging: false,
      reports_basic: true, support_email: true, multi_business: false,
      reports_export: false, reports_yearly: false, account_manager: false,
      support_priority: false, reports_executive: false,
      reports_financial: true, reports_inventory: true,
    },
    limits: {
      users: 1, customers: 50, inventory_items: 50,
      ai_queries_per_day: 0, data_retention_months: 1,
      transactions_per_month: 100,
    },
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 2500,
    currency: 'NGN',
    trial_days: 0,
    features: {
      risk: false, sales: true, alerts: false, income: true, debtors: true,
      expenses: true, forecast: false, payments: true, analytics: false,
      creditors: true, customers: true, decisions: false, inventory: true,
      purchases: true, suppliers: true, ai_advisor: false, api_access: false,
      team_roles: false, white_label: false, reports_aging: false,
      reports_basic: true, support_email: true, multi_business: false,
      reports_export: false, reports_yearly: false, account_manager: false,
      support_priority: false, reports_executive: false,
      reports_financial: true, reports_inventory: true,
    },
    limits: {
      users: 1, customers: 200, inventory_items: 100,
      ai_queries_per_day: 0, data_retention_months: 6,
      transactions_per_month: 500,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4500,
    currency: 'NGN',
    trial_days: 14,
    features: {
      risk: true, sales: true, alerts: true, income: true, debtors: true,
      expenses: true, forecast: true, payments: true, analytics: true,
      creditors: true, customers: true, decisions: true, inventory: true,
      purchases: true, suppliers: true, ai_advisor: true, api_access: false,
      team_roles: false, white_label: false, reports_aging: true,
      reports_basic: true, support_email: true, multi_business: false,
      reports_export: true, reports_yearly: true, account_manager: false,
      support_priority: true, reports_executive: true,
      reports_financial: true, reports_inventory: true,
    },
    limits: {
      users: 3, customers: 2000, inventory_items: 1000,
      ai_queries_per_day: 20, data_retention_months: 24,
      transactions_per_month: 5000,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 10500,
    currency: 'NGN',
    trial_days: 0,
    features: {
      risk: true, sales: true, alerts: true, income: true, debtors: true,
      expenses: true, forecast: true, payments: true, analytics: true,
      creditors: true, customers: true, decisions: true, inventory: true,
      purchases: true, suppliers: true, ai_advisor: true, api_access: true,
      team_roles: true, white_label: true, reports_aging: true,
      reports_basic: true, support_email: true, multi_business: true,
      reports_export: true, reports_yearly: true, account_manager: true,
      support_priority: true, reports_executive: true,
      reports_financial: true, reports_inventory: true,
    },
    limits: {
      users: -1, customers: -1, inventory_items: -1,
      ai_queries_per_day: -1, data_retention_months: -1,
      transactions_per_month: -1,
    },
  },
];

async function seedDatabase() {
  const label = process.argv.includes('--staging') ? 'STAGING' : 'PROD';
  console.log(`🌱 Seeding plans on ${label}...`);

  const pool = getPool();
  const client = await pool.connect();

  try {
    const before = await client.query('SELECT COUNT(*)::int AS c FROM plans');
    console.log(`   Plans before: ${before.rows[0].c}`);

    let inserted = 0;
    for (const plan of PLANS) {
      const res = await client.query(
        `INSERT INTO plans (id, name, price, currency, trial_days, features, limits)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [
          plan.id,
          plan.name,
          plan.price,
          plan.currency,
          plan.trial_days,
          JSON.stringify(plan.features),
          JSON.stringify(plan.limits),
        ]
      );
      if (res.rowCount > 0) {
        console.log(`   ✅ Inserted: ${plan.id} (${plan.name})`);
        inserted++;
      } else {
        console.log(`   ⏭️  Skipped (already exists): ${plan.id}`);
      }
    }

    const after = await client.query('SELECT COUNT(*)::int AS c FROM plans');
    console.log(`   Plans after: ${after.rows[0].c}`);
    console.log(`✅ Seed complete on ${label}. Inserted ${inserted} new plan(s).`);
  } catch (err) {
    console.error(`❌ Seed failed on ${label}:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;