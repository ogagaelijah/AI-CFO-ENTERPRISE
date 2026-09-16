// src/config/plans.js
// Single Source of Truth for subscription plans, features, limits, pricing.
// v4.0.0-prod
//
// Structure:
//   CORE_FEATURES        — every tier gets these (sales, inventory, customers...)
//   INDUSTRY_FEATURES    — per-industry modules (projects, time_entries, invoices, etc.)
//   INTELLIGENCE_FEATURES— analytics, forecast, risk, decisions, ai_advisor
//   TEAM_FEATURES        — team_roles, multi_business
//   SUPPORT_FEATURES     — support_email, support_priority, account_manager, api_access, white_label
//
// Plans are composed: a tier declares which groups it gets, plus per-feature overrides.
// Adding a new industry = one line in INDUSTRY_FEATURES. No edits to plan blocks.

// ─────────────────────────────────────────────
// Feature groups
// ─────────────────────────────────────────────
const CORE_FEATURES = {
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
};

// Industry-specific modules. All industries share the same tiering:
// available from Basic up (and on the internal `free` plan for testing).
// Add a new industry here → it flows to every tier that gets INDUSTRY_FEATURES.
const INDUSTRY_FEATURES = {
    // Consultancy
    projects: true,
    time_entries: true,
    invoices: true,
    // Logistics (next)
    // trips: true,
    // vehicles: true,
    // drivers: true,
    // Education
    // students: true,
    // classes: true,
    // fees: true,
    // Real Estate
    // properties: true,
    // tenants: true,
    // rent: true,
    // Healthcare
    // patients: true,
    // visits: true,
    // medical_supplies: true,
    // Construction
    // materials: true,
    // Manufacturing
    // raw_materials: true,
    // production: true,
    // finished_goods: true,
};

const INTELLIGENCE_FEATURES = {
    analytics: true,
    forecast: true,
    risk: true,
    decisions: true,
    alerts: true,
    ai_advisor: true,
};

const TEAM_FEATURES = {
    team_roles: true,
    multi_business: true,
};

const SUPPORT_FEATURES = {
    support_email: true,
    support_priority: true,
    account_manager: true,
    api_access: true,
    white_label: true,
};

// Every feature key that exists anywhere in the system.
// Ensures each plan has all keys defined (as false if not granted).
const ALL_FEATURE_KEYS = [
    ...Object.keys(CORE_FEATURES),
    ...Object.keys(INDUSTRY_FEATURES),
    ...Object.keys(INTELLIGENCE_FEATURES),
    ...Object.keys(TEAM_FEATURES),
    ...Object.keys(SUPPORT_FEATURES),
    // Report features (handled per-tier, not grouped)
    'reports_basic',
    'reports_financial',
    'reports_inventory',
    'reports_yearly',
    'reports_executive',
    'reports_aging',
    'reports_export',
];

// ─────────────────────────────────────────────
// Tier composition
// Declares which groups each tier gets + per-feature overrides.
// Reports are declared explicitly per tier (they vary by tier granularly).
// `intelligence: false` explicitly disables the INTELLIGENCE_FEATURES group.
// `support: {...}` provides an explicit allow-list when a tier does NOT get
// the full SUPPORT_FEATURES group.
// ─────────────────────────────────────────────
const TIER_COMPOSITION = {
    free: {
        groups: [CORE_FEATURES, INDUSTRY_FEATURES],
        reports: {
            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: false,
            reports_executive: false,
            reports_aging: false,
            reports_export: false,
        },
        intelligence: false,
        support: { support_email: true },
    },
    basic: {
        groups: [CORE_FEATURES, INDUSTRY_FEATURES],
        reports: {
            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: false,
            reports_executive: false,
            reports_aging: false,
            reports_export: false,
        },
        intelligence: false,
        support: { support_email: true },
    },
    pro: {
        groups: [CORE_FEATURES, INDUSTRY_FEATURES, INTELLIGENCE_FEATURES],
        reports: {
            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: true,
            reports_executive: true,
            reports_aging: true,
            reports_export: true,
        },
        intelligence: true,
        support: { support_email: true, support_priority: true },
    },
    enterprise: {
        groups: [CORE_FEATURES, INDUSTRY_FEATURES, INTELLIGENCE_FEATURES, TEAM_FEATURES, SUPPORT_FEATURES],
        reports: {
            reports_basic: true,
            reports_financial: true,
            reports_inventory: true,
            reports_yearly: true,
            reports_executive: true,
            reports_aging: true,
            reports_export: true,
        },
        intelligence: true,
        support: {
            support_email: true,
            support_priority: true,
            account_manager: true,
            api_access: true,
            white_label: true,
        },
    },
};

// ─────────────────────────────────────────────
// Tier metadata (pricing, limits, name, trial)
// ─────────────────────────────────────────────
const TIER_META = {
    free: {
        id: 'free',
        name: 'Free (Internal)',
        description: 'Internal test plan. Not shown to users.',
        hidden: true,
        trialDays: 0,
        currency: 'NGN',
        pricing: { monthly: 0, yearly: 0, yearlyDiscountPercent: 0, yearlySavings: 0 },
        limits: {
            transactions_per_month: 100,
            inventory_items: 50,
            customers: 50,
            users: 1,
            ai_queries_per_day: 0,
            data_retention_months: 1,
        },
    },
    basic: {
        id: 'basic',
        name: 'Basic',
        description: 'For small businesses getting organized',
        hidden: false,
        trialDays: 0,
        currency: 'NGN',
        pricing: { monthly: 2500, yearly: 25000, yearlyDiscountPercent: 17, yearlySavings: 5000 },
        limits: {
            transactions_per_month: 500,
            inventory_items: 100,
            customers: 200,
            users: 1,
            ai_queries_per_day: 0,
            data_retention_months: 6,
        },
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        description: 'Full intelligence for growing businesses',
        hidden: false,
        trialDays: 14,
        currency: 'NGN',
        pricing: { monthly: 4500, yearly: 45000, yearlyDiscountPercent: 17, yearlySavings: 9000 },
        limits: {
            transactions_per_month: 5000,
            inventory_items: 1000,
            customers: 2000,
            users: 3,
            ai_queries_per_day: 20,
            data_retention_months: 24,
        },
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Everything, unlimited, with dedicated support',
        hidden: false,
        trialDays: 0,
        currency: 'NGN',
        pricing: { monthly: 10500, yearly: 105000, yearlyDiscountPercent: 17, yearlySavings: 21000 },
        limits: {
            transactions_per_month: -1,
            inventory_items: -1,
            customers: -1,
            users: -1,
            ai_queries_per_day: -1,
            data_retention_months: -1,
        },
    },
};

// ─────────────────────────────────────────────
// Compose plans from groups + overrides
// ─────────────────────────────────────────────
function composeFeatures(tierId) {
    const comp = TIER_COMPOSITION[tierId];
    if (!comp) throw new Error(`Unknown tier: ${tierId}`);

    // Start: every known feature key = false
    const features = {};
    for (const key of ALL_FEATURE_KEYS) features[key] = false;

    // Apply each group the tier is given
    for (const group of comp.groups || []) {
        for (const key of Object.keys(group)) features[key] = true;
    }

    // Apply reports map (explicit per tier)
    if (comp.reports) {
        for (const [key, val] of Object.entries(comp.reports)) features[key] = val;
    }

    // Intelligence explicitly off
    if (comp.intelligence === false) {
        for (const key of Object.keys(INTELLIGENCE_FEATURES)) features[key] = false;
    }

    // Support allow-list — only applied when the tier did NOT receive the
    // full SUPPORT_FEATURES group. Turns everything off, then enables the list.
    if (comp.support && !(comp.groups || []).includes(SUPPORT_FEATURES)) {
        for (const key of Object.keys(SUPPORT_FEATURES)) features[key] = false;
        for (const [key, val] of Object.entries(comp.support)) features[key] = val;
    }

    // Team explicitly off (for tiers that don't get TEAM_FEATURES)
    if (!(comp.groups || []).includes(TEAM_FEATURES)) {
        for (const key of Object.keys(TEAM_FEATURES)) features[key] = false;
    }

    return features;
}

const PLANS = {};
for (const [tierId, meta] of Object.entries(TIER_META)) {
    PLANS[tierId] = {
        ...meta,
        features: composeFeatures(tierId),
    };
}

// ─────────────────────────────────────────────
// Helpers (public API — unchanged)
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