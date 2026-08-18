// src/config/features.js

/**
 * Feature Flags Configuration
 * Defines which features are available for each plan
 * and their usage limits
 */

const FEATURES = {
    // =============================================
    // FREE PLAN — Limited, encourages upgrade
    // =============================================
    free: {
        name: 'Free',
        features: {
            // Core Features
            sales: true,
            income: true,
            purchases: true,
            expenses: true,
            debtors: true,
            creditors: true,
            inventory: false,
            customers: true,
            suppliers: true,
            projects: false,
            reports: false,
            forecasting: false,
            recommendations: false,
            ai_insights: false,
            multi_user: false,
            data_export: false,
            integrations: false,
        },
        limits: {
            max_transactions: 50,
            max_customers: 20,
            max_suppliers: 10,
            max_products: 20,
            max_projects: 0,
            max_users: 1,
            storage_mb: 10,
            reports_per_month: 0,
            api_calls_per_day: 100,
        },
        pricing: {
            monthly: 0,
            yearly: 0,
            currency: 'NGN',
        },
        trial_days: 30,
    },

    // =============================================
    // PRO PLAN — For growing businesses
    // =============================================
    pro: {
        name: 'Pro',
        features: {
            // Core Features
            sales: true,
            income: true,
            purchases: true,
            expenses: true,
            debtors: true,
            creditors: true,
            inventory: true,
            customers: true,
            suppliers: true,
            projects: true,
            reports: true,
            forecasting: true,
            recommendations: true,
            ai_insights: true,
            multi_user: false,
            data_export: true,
            integrations: true,
        },
        limits: {
            max_transactions: 5000,
            max_customers: 500,
            max_suppliers: 100,
            max_products: 500,
            max_projects: 50,
            max_users: 3,
            storage_mb: 100,
            reports_per_month: 30,
            api_calls_per_day: 1000,
        },
        pricing: {
            monthly: 5000,
            yearly: 50000,
            currency: 'NGN',
        },
        trial_days: 0, // No trial for paid plans
    },

    // =============================================
    // BUSINESS PLAN — For enterprises
    // =============================================
    business: {
        name: 'Business',
        features: {
            // Core Features
            sales: true,
            income: true,
            purchases: true,
            expenses: true,
            debtors: true,
            creditors: true,
            inventory: true,
            customers: true,
            suppliers: true,
            projects: true,
            reports: true,
            forecasting: true,
            recommendations: true,
            ai_insights: true,
            multi_user: true,
            data_export: true,
            integrations: true,
        },
        limits: {
            max_transactions: 50000,
            max_customers: 5000,
            max_suppliers: 1000,
            max_products: 5000,
            max_projects: 500,
            max_users: 10,
            storage_mb: 500,
            reports_per_month: 90,
            api_calls_per_day: 10000,
        },
        pricing: {
            monthly: 15000,
            yearly: 150000,
            currency: 'NGN',
        },
        trial_days: 0,
    },

    // =============================================
    // ENTERPRISE PLAN — Custom
    // =============================================
    enterprise: {
        name: 'Enterprise',
        features: {
            // Core Features
            sales: true,
            income: true,
            purchases: true,
            expenses: true,
            debtors: true,
            creditors: true,
            inventory: true,
            customers: true,
            suppliers: true,
            projects: true,
            reports: true,
            forecasting: true,
            recommendations: true,
            ai_insights: true,
            multi_user: true,
            data_export: true,
            integrations: true,
        },
        limits: {
            max_transactions: -1, // Unlimited
            max_customers: -1,
            max_suppliers: -1,
            max_products: -1,
            max_projects: -1,
            max_users: -1,
            storage_mb: -1,
            reports_per_month: -1,
            api_calls_per_day: -1,
        },
        pricing: {
            monthly: 'Custom',
            yearly: 'Custom',
            currency: 'NGN',
        },
        trial_days: 0,
    },
};

// =============================================
// Helper Functions
// =============================================

/**
 * Check if a feature is available for a given plan
 * @param {string} planId - Plan ID (free, pro, business, enterprise)
 * @param {string} feature - Feature name
 * @returns {boolean} True if feature is available
 */
function hasFeature(planId, feature) {
    const plan = FEATURES[planId];
    if (!plan) return false;
    return plan.features[feature] === true;
}

/**
 * Get all features for a given plan
 * @param {string} planId - Plan ID (free, pro, business, enterprise)
 * @returns {Object} Feature flags
 */
function getFeatures(planId) {
    const plan = FEATURES[planId];
    if (!plan) return FEATURES.free.features;
    return plan.features;
}

/**
 * Get usage limits for a given plan
 * @param {string} planId - Plan ID (free, pro, business, enterprise)
 * @returns {Object} Usage limits
 */
function getLimits(planId) {
    const plan = FEATURES[planId];
    if (!plan) return FEATURES.free.limits;
    return plan.limits;
}

/**
 * Get pricing for a given plan
 * @param {string} planId - Plan ID (free, pro, business, enterprise)
 * @returns {Object} Pricing details
 */
function getPricing(planId) {
    const plan = FEATURES[planId];
    if (!plan) return FEATURES.free.pricing;
    return plan.pricing;
}

/**
 * Get the default plan (free)
 * @returns {string} Default plan ID
 */
function getDefaultPlan() {
    return 'free';
}

/**
 * Check if a plan is a paid plan
 * @param {string} planId - Plan ID
 * @returns {boolean} True if paid
 */
function isPaidPlan(planId) {
    return planId !== 'free' && planId !== 'enterprise';
}

/**
 * Get the list of available plan IDs
 * @returns {string[]} Array of plan IDs
 */
function getAvailablePlans() {
    return Object.keys(FEATURES);
}

/**
 * Get plan details by ID
 * @param {string} planId - Plan ID
 * @returns {Object|null} Plan details or null
 */
function getPlanDetails(planId) {
    return FEATURES[planId] || null;
}

module.exports = {
    FEATURES,
    hasFeature,
    getFeatures,
    getLimits,
    getPricing,
    getDefaultPlan,
    isPaidPlan,
    getAvailablePlans,
    getPlanDetails,
};