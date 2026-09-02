'use strict';

/**
 * Growth Decision Rules
 * Path: src/application/services/decision/rules/growthRules.js
 * SSOT: DecisionContracts
 * @version 1.2.1-prod
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
  DECISION_PRIORITY, // <-- ADDED
  DECISION_TIMEFRAME,
  DECISION_ENTITY,
} = require('../contracts/DecisionContracts');

const NGN = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const safeData = (data) =>
  data && typeof data === 'object' && !Array.isArray(data) ? data : {};

const pct = (ratio) => (ratio * 100).toFixed(1);

const growthRules = Object.freeze([
  // ============================================================
  // REVENUE_GROWTH_OPPORTUNITY
  // ============================================================
  Object.freeze({
    id: 'REVENUE_GROWTH_OPPORTUNITY',
    type: DECISION_TYPES.REVENUE_GROWTH_OPPORTUNITY,
    category: DECISION_CATEGORIES.GROWTH,
    name: 'Revenue Growth Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    priority: DECISION_PRIORITY.HIGH, // <-- ADDED
    minConfidence: 70,
    defaultTitle: 'Revenue Growth Opportunity',
    defaultSummary: 'Revenue is growing at a strong rate.',
    defaultRecommendation: 'Invest in areas driving growth.',
    requiredFields: Object.freeze(['revenueGrowth','growthDrivers','revenue']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const revenueGrowth = toNumber(data.revenueGrowth);
        const revenue = toNumber(data.revenue);
        const growthDrivers = Array.isArray(data.growthDrivers) ? data.growthDrivers.slice(0, 3) : ['Review drivers'];
        const period = data.period || 'month';

        if (revenueGrowth <= 0.15) return Object.freeze({ triggered: false });

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.OPPORTUNITY,
          evidence: Object.freeze({ revenueGrowth: pct(revenueGrowth), revenue, period, growthDrivers }),
          impact: Object.freeze({ financialImpact: revenue * revenueGrowth, description: `Revenue growing ${pct(revenueGrowth)}% per ${period}` }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ revenueGrowth }),
          expectedImpact: 'Continued revenue growth',
          risks: Object.freeze(['Growth may slow','Need to sustain momentum']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `Revenue is growing at ${evidence.revenueGrowth}% per ${evidence.period} (${NGN.format(evidence.revenue)}).`;
      if (evidence.growthDrivers?.length > 0) {
        recommendation += ` Key drivers: ${evidence.growthDrivers.join(', ')}. `;
      }
      recommendation += 'Consider investing additional resources in these growth areas to sustain momentum.';
      return recommendation;
    },
  }),

  // ============================================================
  // PRODUCT_GROWTH_LEADER
  // ============================================================
  Object.freeze({
    id: 'PRODUCT_GROWTH_LEADER',
    type: DECISION_TYPES.PRODUCT_GROWTH_LEADER,
    category: DECISION_CATEGORIES.GROWTH,
    name: 'Product Growth Leader',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    priority: DECISION_PRIORITY.HIGH, // <-- ADDED
    minConfidence: 70,
    defaultTitle: 'Product Growth Leader Identified',
    defaultSummary: 'A product is showing strong growth.',
    defaultRecommendation: 'Prioritize investment in this product.',
    requiredFields: Object.freeze(['productName','productGrowth','productRevenue']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const productName = data.productName || 'Product';
        const productGrowth = toNumber(data.productGrowth);
        const productRevenue = toNumber(data.productRevenue);
        const productId = data.productId || 'unknown';

        if (productGrowth <= 0.25 || productRevenue <= 0) return Object.freeze({ triggered: false });

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.OPPORTUNITY,
          evidence: Object.freeze({ productName, productGrowth: pct(productGrowth), productRevenue, isStar: productGrowth > 0.5 }),
          impact: Object.freeze({ financialImpact: productRevenue * productGrowth, description: `${productName} growing ${pct(productGrowth)}%` }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ productGrowth, productRevenue }),
          expectedImpact: 'Maximized growth potential',
          risks: Object.freeze(['Competition may enter','Market may saturate']),
          relatedEntity: DECISION_ENTITY.PRODUCT,
          relatedEntityId: productId,
        });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const product = evidence.productName || 'Product';
      const urgency = evidence.isStar ? '🌟 STAR PRODUCT: ' : '';
      return `${urgency}${product} is growing at ${evidence.productGrowth}% (${NGN.format(evidence.productRevenue)}). Prioritize investment in marketing, inventory, and sales to maximize this growth opportunity.`;
    },
  }),

  // ============================================================
  // MARKET_EXPANSION_SIGNAL
  // ============================================================
  Object.freeze({
    id: 'MARKET_EXPANSION_SIGNAL',
    type: DECISION_TYPES.MARKET_EXPANSION_SIGNAL,
    category: DECISION_CATEGORIES.GROWTH,
    name: 'Market Expansion Signal',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    priority: DECISION_PRIORITY.MEDIUM, // <-- ADDED
    minConfidence: 60,
    defaultTitle: 'Market Expansion Signal Detected',
    defaultSummary: 'New customers and repeat purchases are increasing.',
    defaultRecommendation: 'Consider expanding market reach.',
    requiredFields: Object.freeze(['newCustomers','repeatPurchaseRate','marketIndicators']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const newCustomers = toNumber(data.newCustomers);
        const repeatPurchaseRate = toNumber(data.repeatPurchaseRate);
        const marketIndicators = Array.isArray(data.marketIndicators) ? data.marketIndicators.slice(0, 3) : ['Growing demand'];

        if (newCustomers <= 0 || repeatPurchaseRate <= 0.3) return Object.freeze({ triggered: false });

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.OPPORTUNITY,
          evidence: Object.freeze({ newCustomers, repeatPurchaseRate: pct(repeatPurchaseRate), marketIndicators, expansionReady: repeatPurchaseRate > 0.4 }),
          impact: Object.freeze({ financialImpact: null, description: `${newCustomers} new customers with ${pct(repeatPurchaseRate)}% repeat purchase rate` }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ newCustomers, repeatPurchaseRate }),
          expectedImpact: 'Expanded market reach and revenue',
          risks: Object.freeze(['Expansion costs','Execution challenges']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `You have ${evidence.newCustomers} new customers and a ${evidence.repeatPurchaseRate}% repeat purchase rate.`;
      if (evidence.expansionReady) {
        recommendation += ' This indicates market validation. Consider expanding your market reach through new channels or geographies.';
      } else {
        recommendation += ' Consider investing in customer retention before aggressive expansion.';
      }
      return recommendation;
    },
  }),
]);

module.exports = growthRules;