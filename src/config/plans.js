// src/config/plans.js
// Single Source of Truth for subscription plans, features, limits, pricing.
// v4.3.0-prod
//
// v4.3.0 — Added `fees` to INDUSTRY_FEATURES (Education).

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

const INDUSTRY_FEATURES = {
    // Consultancy
    projects: true,
    time_entries: true,
    invoices: true,
    // Education
    students: true,
    classes: true,
    enrollments: true,
    terms: true,
    fees: true,                       // ← ADDED
    // Real Estate (next)
    // properties: true,
    // tenants: true,
    // rent: true,
    // Logistics
    // trips: true,
    // vehicles: true,
    // drivers: true,
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

const ALL_FEATURE_KEYS = [
    ...Object.keys(CORE_FEATURES),
    ...Object.keys(INDUSTRY_FEATURES),
    ...Object.keys(INTELLIGENCE_FEATURES),
    ...Object.keys(TEAM_FEATURES),
    ...Object.keys(SUPPORT_FEATURES),
    'reports_basic',
    'reports_financial',
    'reports_inventory',
    'reports_yearly',
    'reports_executive',
    'reports_aging',
    'reports_export',
];

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

function composeFeatures(tierId) {
    const comp = TIER_COMPOSITION[tierId];
    if (!comp) throw new Error(`Unknown tier: ${tierId}`);

    const features = {};
    for (const key of ALL_FEATURE_KEYS) features[key] = false;

    for (const group of comp.groups || []) {
        for (const key of Object.keys(group)) features[key] = true;
    }

    if (comp.reports) {
        for (const [key, val] of Object.entries(comp.reports)) features[key] = val;
    }

    if (comp.intelligence === false) {
        for (const key of Object.keys(INTELLIGENCE_FEATURES)) features[key] = false;
    }

    if (comp.support && !(comp.groups || []).includes(SUPPORT_FEATURES)) {
        for (const key of Object.keys(SUPPORT_FEATURES)) features[key] = false;
        for (const [key, val] of Object.entries(comp.support)) features[key] = val;
    }

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

function getPlan(planId) {
    return PLANS[planId] || null;
}

function hasFeature(planId, feature) {
    const plan = PLANS[planId];
    if (!plan) return false;
    return plan.features[feature] === true;
}

function getFeatures(planId) {
    return PLANS[planId]?.features || PLANS.free.features;
}

function getLimits(planId) {
    return PLANS[planId]?.limits || PLANS.free.limits;
}

function getPricing(planId, cycle = null) {
    const plan = PLANS[planId];
    if (!plan) return null;

    if (cycle === 'monthly') return plan.pricing.monthly;
    if (cycle === 'yearly') return plan.pricing.yearly;

    return { ...plan.pricing, currency: plan.currency };
}

function getPublicPlans() {
    return Object.values(PLANS).filter((p) => !p.hidden);
}

function getPublicPlanIds() {
    return getPublicPlans().map((p) => p.id);
}

function isPaidPlan(planId) {
    const plan = PLANS[planId];
    return Boolean(plan && plan.pricing.monthly > 0);
}

function isHiddenPlan(planId) {
    return Boolean(PLANS[planId]?.hidden);
}

function getTrialPlan() {
    return 'pro';
}

function getFallbackPlan() {
    return 'basic';
}

function getTrialDays(planId = 'pro') {
    return PLANS[planId]?.trialDays || 0;
}

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