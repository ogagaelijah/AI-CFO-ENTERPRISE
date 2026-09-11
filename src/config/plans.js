// src/config/plans.js
// Single Source of Truth for subscription plans, features, limits, pricing.
// v3.1.0-prod
//
// All other modules (payment, gating, UI) MUST read from this file.
// Do NOT hardcode plan data anywhere else.
//
// Tiers:
//   basic      — ₦2,500/mo  or  ₦25,000/yr  (save 17%)
//   pro        — ₦4,500/mo  or  ₦45,000/yr  (save 17%) — 14-day trial
//   enterprise — ₦10,500/mo or  ₦105,000/yr (save 17%)
//   free       — internal only, hidden from UI

const PLANS = {
    // ─────────────────────────────────────────────
    // FREE — internal-only (hidden, testing only)
    // ─────────────────────────────────────────────
    free: {
        id: 'free',
        name: 'Free (Internal)',
        description: 'Internal test plan. Not shown to users.',
        hidden: true,
        trialDays: 0,
        currency: 'NGN',

        pricing: {
            monthly: 0,
            yearly: 0,
            yearlyDiscountPercent: 0,
            yearlySavings: 0,
        },

        features: {
            sales: true,
            purchases: true,
            expenses: true,
            income: true,
            customers: true,
            suppliers: true,
            debtors: true,
            creditors: true,
            payments: true,
            inventory: true,

            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: false,
            reports_executive: false,
            reports_aging: false,
            reports_export: false,

            analytics: false,
            forecast: false,
            risk: false,
            decisions: false,
            alerts: false,
            ai_advisor: false,

            team_roles: false,
            multi_business: false,

            support_email: true,
            support_priority: false,
            account_manager: false,
            api_access: false,
            white_label: false,
        },

        limits: {
            transactions_per_month: 100,
            inventory_items: 50,
            customers: 50,
            users: 1,
            ai_queries_per_day: 0,
            data_retention_months: 1,
        },
    },

    // ─────────────────────────────────────────────
    // BASIC — ₦2,500/mo or ₦25,000/yr
    // ─────────────────────────────────────────────
    basic: {
        id: 'basic',
        name: 'Basic',
        description: 'For small businesses getting organized',
        hidden: false,
        trialDays: 0,
        currency: 'NGN',

        pricing: {
            monthly: 2500,
            yearly: 25000,
            yearlyDiscountPercent: 17, // 2 months free
            yearlySavings: 5000,       // 2500*12 - 25000
        },

        features: {
            sales: true,
            purchases: true,
            expenses: true,
            income: true,
            customers: true,
            suppliers: true,
            debtors: true,
            creditors: true,
            payments: true,
            inventory: true,

            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: false,
            reports_executive: false,
            reports_aging: false,
            reports_export: false,

            analytics: false,
            forecast: false,
            risk: false,
            decisions: false,
            alerts: false,
            ai_advisor: false,

            team_roles: false,
            multi_business: false,

            support_email: true,
            support_priority: false,
            account_manager: false,
            api_access: false,
            white_label: false,
        },

        limits: {
            transactions_per_month: 500,
            inventory_items: 100,
            customers: 200,
            users: 1,
            ai_queries_per_day: 0,
            data_retention_months: 6,
        },
    },

    // ─────────────────────────────────────────────
    // PRO — ₦4,500/mo or ₦45,000/yr  (14-day trial)
    // ─────────────────────────────────────────────
    pro: {
        id: 'pro',
        name: 'Pro',
        description: 'Full intelligence for growing businesses',
        hidden: false,
        trialDays: 14,
        currency: 'NGN',

        pricing: {
            monthly: 4500,
            yearly: 45000,
            yearlyDiscountPercent: 17,
            yearlySavings: 9000, // 4500*12 - 45000
        },

        features: {
            sales: true,
            purchases: true,
            expenses: true,
            income: true,
            customers: true,
            suppliers: true,
            debtors: true,
            creditors: true,
            payments: true,
            inventory: true,

            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: true,
            reports_executive: true,
            reports_aging: true,
            reports_export: true,

            analytics: true,
            forecast: true,
            risk: true,
            decisions: true,
            alerts: true,
            ai_advisor: true,

            team_roles: false,
            multi_business: false,

            support_email: true,
            support_priority: true,
            account_manager: false,
            api_access: false,
            white_label: false,
        },

        limits: {
            transactions_per_month: 5000,
            inventory_items: 1000,
            customers: 2000,
            users: 3,
            ai_queries_per_day: 20,
            data_retention_months: 24,
        },
    },

    // ─────────────────────────────────────────────
    // ENTERPRISE — ₦10,500/mo or ₦105,000/yr
    // ─────────────────────────────────────────────
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Everything, unlimited, with dedicated support',
        hidden: false,
        trialDays: 0,
        currency: 'NGN',

        pricing: {
            monthly: 10500,
            yearly: 105000,
            yearlyDiscountPercent: 17,
            yearlySavings: 21000, // 10500*12 - 105000
        },

        features: {
            sales: true,
            purchases: true,
            expenses: true,
            income: true,
            customers: true,
            suppliers: true,
            debtors: true,
            creditors: true,
            payments: true,
            inventory: true,

            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: true,
            reports_executive: true,
            reports_aging: true,
            reports_export: true,

            analytics: true,
            forecast: true,
            risk: true,
            decisions: true,
            alerts: true,
            ai_advisor: true,

            team_roles: true,
            multi_business: true,

            support_email: true,
            support_priority: true,
            account_manager: true,
            api_access: true,
            white_label: true,
        },

        limits: {
            transactions_per_month: -1, // -1 = unlimited
            inventory_items: -1,
            customers: -1,
            users: -1,
            ai_queries_per_day: -1,
            data_retention_months: -1,
        },
    },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Get a plan by id, or null */
function getPlan(planId) {
    return PLANS[planId] || null;
}

/** Does this plan allow the given feature? */
function hasFeature(planId, feature) {
    const plan = PLANS[planId];
    if (!plan) return false;
    return plan.features[feature] === true;
}

/** Get all features for a plan */
function getFeatures(planId) {
    return PLANS[planId]?.features || PLANS.free.features;
}

/** Get limits for a plan */
function getLimits(planId) {
    return PLANS[planId]?.limits || PLANS.free.limits;
}

/**
 * Get price info.
 * @param {string} planId
 * @param {'monthly'|'yearly'} [cycle]
 * @returns {number|object}
 */
function getPricing(planId, cycle = null) {
    const plan = PLANS[planId];
    if (!plan) return null;

    if (cycle === 'monthly') return plan.pricing.monthly;
    if (cycle === 'yearly') return plan.pricing.yearly;

    // No cycle specified → return full pricing block
    return { ...plan.pricing, currency: plan.currency };
}

/** Public plans only (excludes hidden) */
function getPublicPlans() {
    return Object.values(PLANS).filter((p) => !p.hidden);
}

/** Public plan IDs only */
function getPublicPlanIds() {
    return getPublicPlans().map((p) => p.id);
}

/** Is this a paid plan (price > 0)? */
function isPaidPlan(planId) {
    const plan = PLANS[planId];
    return Boolean(plan && plan.pricing.monthly > 0);
}

/** Is this plan hidden from public UI? */
function isHiddenPlan(planId) {
    return Boolean(PLANS[planId]?.hidden);
}

/** Plan to start a new user on trial (default = pro) */
function getTrialPlan() {
    return 'pro';
}

/** Plan to fall back to when a trial/subscription ends */
function getFallbackPlan() {
    return 'basic';
}

/** Total number of trial days for a plan */
function getTrialDays(planId = 'pro') {
    return PLANS[planId]?.trialDays || 0;
}

/**
 * Payment table keyed by plan id, with both cycles.
 * Used by payment routes (SSOT — do NOT hardcode prices anywhere else).
 *
 * @returns {Object} e.g. { pro: { monthly: {amount, name}, yearly: {amount, name} }, ... }
 */
function getPaymentPlans() {
    const result = {};
    for (const plan of getPublicPlans()) {
        if (plan.pricing.monthly <= 0) continue;
        result[plan.id] = {
            monthly: {
                amount: plan.pricing.monthly,
                name: `${plan.name} Plan (Monthly)`,
                currency: plan.currency,
            },
            yearly: {
                amount: plan.pricing.yearly,
                name: `${plan.name} Plan (Annual)`,
                currency: plan.currency,
            },
        };
    }
    return result;
}

module.exports = {
    PLANS,
    getPlan,
    hasFeature,
    getFeatures,
    getLimits,
    getPricing,
    getPublicPlans,
    getPublicPlanIds,
    isPaidPlan,
    isHiddenPlan,
    getTrialPlan,
    getFallbackPlan,
    getTrialDays,
    getPaymentPlans,
};