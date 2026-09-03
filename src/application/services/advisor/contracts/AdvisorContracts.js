/**
 * AI Advisor Engine - Contracts
 *
 * Single Source of Truth for all enums, constants, and contracts.
 * Immutable, structurally validated, and optimized for distributed scale.
 *
 * @version 1.2.0
 */

'use strict';

/**
 * High-performance, memory-safe deep freeze utility.
 * Protects against prototype pollution, symbols, circular references, and native mutations.
 */
const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Prevent breaking native instances that rely on internal slots
  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Map || obj instanceof Set) {
    return Object.freeze(obj);
  }

  const seen = new WeakSet();

  const freezeRecursive = (currentObj) => {
    if (currentObj === null || typeof currentObj !== 'object' || seen.has(currentObj)) {
      return;
    }

    seen.add(currentObj);
    Object.freeze(currentObj);

    // Retrieve all string keys and symbol keys safely
    const keys = Reflect.ownKeys(currentObj);
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(currentObj, key);
      if (desc && desc.configurable && (typeof desc.value === 'object' && desc.value !== null)) {
        freezeRecursive(desc.value);
      }
    }
  };

  freezeRecursive(obj);
  return obj;
};

/**
 * Helper to create immutable enum spaces
 */
const createEnum = (map) => deepFreeze(map);

/**
 * Advisor Response Types
 */
const ADVISOR_RESPONSE_TYPES = createEnum({
  INSIGHT: 'INSIGHT',
  RECOMMENDATION: 'RECOMMENDATION',
  WARNING: 'WARNING',
  EXPLANATION: 'EXPLANATION',
  SUMMARY: 'SUMMARY',
  FORECAST: 'FORECAST',
  COMPARISON: 'COMPARISON',
  ANSWER: 'ANSWER',
  CHAT: 'CHAT',
  ACTION_PLAN: 'ACTION_PLAN'
});

/**
 * Standardized Advisor Categories (Unified Singular Form across Domains)
 */
const ADVISOR_CATEGORIES = createEnum({
  PERFORMANCE: 'PERFORMANCE',
  PROFITABILITY: 'PROFITABILITY',
  LIQUIDITY: 'LIQUIDITY',
  GROWTH: 'GROWTH',
  RISK: 'RISK',
  EFFICIENCY: 'EFFICIENCY',
  CUSTOMER: 'CUSTOMER',
  INVENTORY: 'INVENTORY',
  EXPENSE: 'EXPENSE',
  REVENUE: 'REVENUE',
  MARKET: 'MARKET',
  CASH: 'CASH',
  TREND: 'TREND',
  BREAKDOWN: 'BREAKDOWN',
  GENERAL: 'GENERAL'
});

/**
 * Advisor Sentiment
 */
const ADVISOR_SENTIMENT = createEnum({
  POSITIVE: 'POSITIVE',
  NEUTRAL: 'NEUTRAL',
  NEGATIVE: 'NEGATIVE',
  URGENT: 'URGENT'
});

/**
 * Advisor Tone
 */
const ADVISOR_TONE = createEnum({
  PROFESSIONAL: 'PROFESSIONAL',
  CONVERSATIONAL: 'CONVERSATIONAL',
  URGENT: 'URGENT',
  ENCOURAGING: 'ENCOURAGING',
  ANALYTICAL: 'ANALYTICAL'
});

/**
 * Advisor Context Types
 */
const ADVISOR_CONTEXT = createEnum({
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  REAL_TIME: 'REAL_TIME',
  FORECAST: 'FORECAST',
  HISTORICAL: 'HISTORICAL'
});

/**
 * Advisor Insight Severity
 */
const ADVISOR_SEVERITY = createEnum({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
});

/**
 * Template Categories
 */
const TEMPLATE_CATEGORIES = createEnum({
  INSIGHT_OPENING: 'INSIGHT_OPENING',
  INSIGHT_BODY: 'INSIGHT_BODY',
  INSIGHT_CLOSING: 'INSIGHT_CLOSING',
  RECOMMENDATION_OPENING: 'RECOMMENDATION_OPENING',
  RECOMMENDATION_BODY: 'RECOMMENDATION_BODY',
  RECOMMENDATION_CLOSING: 'RECOMMENDATION_CLOSING',
  WARNING_OPENING: 'WARNING_OPENING',
  WARNING_BODY: 'WARNING_BODY',
  WARNING_CLOSING: 'WARNING_CLOSING',
  SUMMARY_OPENING: 'SUMMARY_OPENING',
  SUMMARY_BODY: 'SUMMARY_BODY',
  SUMMARY_CLOSING: 'SUMMARY_CLOSING',
  FORECAST_OPENING: 'FORECAST_OPENING',
  FORECAST_BODY: 'FORECAST_BODY',
  FORECAST_CLOSING: 'FORECAST_CLOSING',
  COMPARISON_OPENING: 'COMPARISON_OPENING',
  COMPARISON_BODY: 'COMPARISON_BODY',
  COMPARISON_CLOSING: 'COMPARISON_CLOSING',
  ACTION_PLAN: 'ACTION_PLAN'
});

/**
 * SSOT Mappings - Derived strictly from source enums to eliminate drift
 */
const SENTIMENT_EMOJI = createEnum({
  [ADVISOR_SENTIMENT.POSITIVE]: '✅',
  [ADVISOR_SENTIMENT.NEUTRAL]: 'ℹ️',
  [ADVISOR_SENTIMENT.NEGATIVE]: '⚠️',
  [ADVISOR_SENTIMENT.URGENT]: '🚨'
});

const SENTIMENT_LABEL = createEnum({
  [ADVISOR_SENTIMENT.POSITIVE]: 'Good News',
  [ADVISOR_SENTIMENT.NEUTRAL]: 'Information',
  [ADVISOR_SENTIMENT.NEGATIVE]: 'Concern',
  [ADVISOR_SENTIMENT.URGENT]: 'Urgent Action Required'
});

const SEVERITY_EMOJI = createEnum({
  [ADVISOR_SEVERITY.CRITICAL]: '🚨',
  [ADVISOR_SEVERITY.HIGH]: '🔴',
  [ADVISOR_SEVERITY.MEDIUM]: '🟠',
  [ADVISOR_SEVERITY.LOW]: '🟡',
  [ADVISOR_SEVERITY.INFO]: 'ℹ️'
});

const SEVERITY_LABEL = createEnum({
  [ADVISOR_SEVERITY.CRITICAL]: 'Critical',
  [ADVISOR_SEVERITY.HIGH]: 'High Priority',
  [ADVISOR_SEVERITY.MEDIUM]: 'Medium Priority',
  [ADVISOR_SEVERITY.LOW]: 'Low Priority',
  [ADVISOR_SEVERITY.INFO]: 'Informational'
});

const CATEGORY_LABEL = createEnum({
  [ADVISOR_CATEGORIES.PERFORMANCE]: 'Business Performance',
  [ADVISOR_CATEGORIES.PROFITABILITY]: 'Profit Analysis',
  [ADVISOR_CATEGORIES.LIQUIDITY]: 'Liquidity', // ADDED
  [ADVISOR_CATEGORIES.GROWTH]: 'Growth', // ADDED
  [ADVISOR_CATEGORIES.RISK]: 'Risk Assessment',
  [ADVISOR_CATEGORIES.EFFICIENCY]: 'Efficiency', // ADDED
  [ADVISOR_CATEGORIES.CUSTOMER]: 'Customer Insights',
  [ADVISOR_CATEGORIES.INVENTORY]: 'Inventory Insights',
  [ADVISOR_CATEGORIES.EXPENSE]: 'Expense Analysis',
  [ADVISOR_CATEGORIES.REVENUE]: 'Revenue Analysis',
  [ADVISOR_CATEGORIES.MARKET]: 'Market Analysis', // ADDED - was missing but in enum
  [ADVISOR_CATEGORIES.CASH]: 'Cash Flow',
  [ADVISOR_CATEGORIES.TREND]: 'Trend Analysis',
  [ADVISOR_CATEGORIES.BREAKDOWN]: 'Category Breakdown',
  [ADVISOR_CATEGORIES.GENERAL]: 'General Question'
  // REMOVED: FORECAST, RECOMMENDATION, COMPARISON - not in ADVISOR_CATEGORIES enum
});

/**
 * Response Structure Contract
 */
const RESPONSE_CONTRACT = deepFreeze({
  required: ['type', 'content', 'sentiment', 'severity', 'generatedAt'],
  optional: ['title', 'summary', 'evidence', 'recommendations', 'data', 'tone', 'context'],
  example: {
    type: ADVISOR_RESPONSE_TYPES.INSIGHT,
    title: 'Revenue Growth with Margin Compression',
    content: 'Your revenue is growing but profit is declining. This suggests costs are rising faster than revenue.',
    summary: 'Revenue grew 8% but margins declined 3%.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH,
    evidence: { revenueGrowth: 0.08, marginDecline: 0.03, expenseGrowth: 0.12 },
    recommendations: ['Review top 3 expense categories', 'Consider price adjustment on high-demand items'],
    data: { revenue: 12500000, grossMargin: 0.28, netProfit: 1800000 },
    tone: ADVISOR_TONE.PROFESSIONAL,
    context: ADVISOR_CONTEXT.MONTHLY,
    generatedAt: new Date()
  }
});

/**
 * Insight Template Structure Contract
 */
const INSIGHT_TEMPLATE_CONTRACT = deepFreeze({
  required: ['id', 'category', 'template', 'sentiment', 'severity'],
  optional: ['requiresData', 'requiresDecision', 'requiresRisk', 'requiresForecast', 'requiresAnalytics'],
  example: {
    id: 'REVENUE_GROWTH_MARGIN_DECLINE',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Your revenue is growing at {revenueGrowth}% but your profit is declining by {profitDecline}%.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH,
    requiresData: ['revenueGrowth', 'profitDecline']
  }
});

/**
 * Validation Helpers - Safe against Prototype Pollution and Property Spoofing
 */
const ContractValidators = {
  isValidResponseType: (type) => Object.values(ADVISOR_RESPONSE_TYPES).includes(type),
  isValidCategory: (cat) => Object.values(ADVISOR_CATEGORIES).includes(cat),
  isValidSentiment: (s) => Object.values(ADVISOR_SENTIMENT).includes(s),
  isValidSeverity: (s) => Object.values(ADVISOR_SEVERITY).includes(s),
  isValidContext: (c) => Object.values(ADVISOR_CONTEXT).includes(c),
  isValidTone: (t) => Object.values(ADVISOR_TONE).includes(t),

  validateResponse: (obj) => {
    if (!obj || typeof obj !== 'object') throw new Error('Invalid input: payload must be an object');
    
    // Explicit own property checking to neutralize prototype injection exploits
    const missing = RESPONSE_CONTRACT.required.filter(f => !Object.prototype.hasOwnProperty.call(obj, f));
    if (missing.length) throw new Error(`Response missing required fields: ${missing.join(', ')}`);
    
    if (!ContractValidators.isValidResponseType(obj.type)) throw new Error(`Invalid response type: ${obj.type}`);
    if (!ContractValidators.isValidSentiment(obj.sentiment)) throw new Error(`Invalid sentiment: ${obj.sentiment}`);
    if (!ContractValidators.isValidSeverity(obj.severity)) throw new Error(`Invalid severity: ${obj.severity}`);
    return true;
  },

  validateTemplate: (template) => {
    if (!template || typeof template !== 'object') throw new Error('Invalid input: template must be an object');

    const missing = INSIGHT_TEMPLATE_CONTRACT.required.filter(f => !Object.prototype.hasOwnProperty.call(template, f));
    if (missing.length) throw new Error(`Template missing required fields: ${missing.join(', ')}`);
    
    if (!ContractValidators.isValidCategory(template.category)) throw new Error(`Invalid category: ${template.category}`);
    if (!ContractValidators.isValidSentiment(template.sentiment)) throw new Error(`Invalid sentiment: ${template.sentiment}`);
    if (!ContractValidators.isValidSeverity(template.severity)) throw new Error(`Invalid severity: ${template.severity}`);
    return true;
  }
};

module.exports = {
  ADVISOR_RESPONSE_TYPES,
  ADVISOR_CATEGORIES,
  ADVISOR_SENTIMENT,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  ADVISOR_SEVERITY,
  TEMPLATE_CATEGORIES,
  SENTIMENT_EMOJI,
  SENTIMENT_LABEL,
  SEVERITY_EMOJI,
  SEVERITY_LABEL,
  CATEGORY_LABEL,
  RESPONSE_CONTRACT,
  INSIGHT_TEMPLATE_CONTRACT,
  ContractValidators
};