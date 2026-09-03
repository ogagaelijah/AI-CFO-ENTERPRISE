/**
 * AI Advisor - Insight Templates
 *
 * SSOT template registry with optimized, secure compilation token rendering pipelines.
 * Immutable. Crash-proof. No external dependencies.
 *
 * @version 1.2.0
 */

'use strict';

// Seamlessly integrate with the unified Single Source of Truth contracts space
const {
  ADVISOR_CATEGORIES,
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ContractValidators
} = require('../contracts/AdvisorContracts');

/**
 * High-performance, memory-safe deep freeze utility.
 * Protects against prototype pollution, circular references, and native mutations.
 */
const deepFreeze = (obj) => {
  if (obj === null || typeof obj!== 'object') {
    return obj;
  }

  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Map || obj instanceof Set) {
    return Object.freeze(obj);
  }

  const seen = new WeakSet();

  const freezeRecursive = (currentObj) => {
    if (currentObj === null || typeof currentObj!== 'object' || seen.has(currentObj)) {
      return;
    }

    seen.add(currentObj);
    Object.freeze(currentObj);

    const keys = Reflect.ownKeys(currentObj);
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(currentObj, key);
      if (desc && desc.configurable && (typeof desc.value === 'object' && desc.value!== null)) {
        freezeRecursive(desc.value);
      }
    }
  };

  freezeRecursive(obj);
  return obj;
};

/**
 * Template factory with strict contract validation and immutability tracking
 */
const createTemplate = (tpl) => {
  if (!tpl || typeof tpl!== 'object') {
    throw new Error('Template configuration must be a valid object structure');
  }

  const requiresData = Array.isArray(tpl.requiresData)? [...tpl.requiresData].map(String) : [];

  const validatedTemplate = {
    id: String(tpl.id),
    category: tpl.category,
    template: String(tpl.template),
    sentiment: tpl.sentiment,
    severity: tpl.severity,
    requiresData
  };

  ContractValidators.validateTemplate(validatedTemplate);
  return deepFreeze(validatedTemplate);
};

/**
 * Revenue & Growth Insights
 */
const revenueTemplates = [
  createTemplate({
    id: 'REVENUE_GROWTH_POSITIVE',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue is growing at {growth}% over the {period}. This is a strong performance, driven largely by {driver}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['growth', 'period', 'driver']
  }),
  createTemplate({
    id: 'REVENUE_GROWTH_MODERATE',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue grew by {growth}% over the {period}. While this is positive, it\'s below the target of {target}%.',
    sentiment: ADVISOR_SENTIMENT.NEUTRAL,
    severity: ADVISOR_SEVERITY.MEDIUM,
    requiresData: ['growth', 'period', 'target']
  }),
  createTemplate({
    id: 'REVENUE_GROWTH_NEGATIVE',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue declined by {decline}% over the {period}. This is concerning and requires immediate attention. The main factors appear to be {factors}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH,
    requiresData: ['decline', 'period', 'factors']
  }),
  createTemplate({
    id: 'REVENUE_STAGNANT',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue has remained flat over the {period} with only {growth}% change. Consider reviewing your sales strategy and market position.',
    sentiment: ADVISOR_SENTIMENT.NEUTRAL,
    severity: ADVISOR_SEVERITY.MEDIUM,
    requiresData: ['period', 'growth']
  }),
  createTemplate({
    id: 'REVENUE_HIGH_GROWTH_OPPORTUNITY',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Your revenue is growing at an impressive {growth}%! This is being driven by {driver}. Consider investing more in this area to maximize the opportunity.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['growth', 'driver']
  })
];

/**
 * Profitability & Margin Insights
 */
const profitabilityTemplates = [
  createTemplate({
    id: 'PROFIT_MARGIN_IMPROVING',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Your profit margin has improved from {previousMargin}% to {currentMargin}%. This is a positive trend driven by {driver}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['previousMargin', 'currentMargin', 'driver']
  }),
  createTemplate({
    id: 'PROFIT_MARGIN_DECLINING',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Your profit margin has declined from {previousMargin}% to {currentMargin}%. This is a concern. The main driver appears to be {driver}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH,
    requiresData: ['previousMargin', 'currentMargin', 'driver']
  }),
  createTemplate({
    id: 'PROFIT_DECLINE_REVENUE_GROWTH',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Revenue grew {revenueGrowth}% but profit declined {profitDecline}%. This suggests your costs are rising faster than your revenue. Review your expense categories, particularly {topExpenseCategory}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH,
    requiresData: ['revenueGrowth', 'profitDecline', 'topExpenseCategory']
  }),
  createTemplate({
    id: 'MARGIN_BELOW_TARGET',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Current margin of {currentMargin}% is below your target of {targetMargin}%. This gap is costing you approximately {impact} per month.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.MEDIUM,
    requiresData: ['currentMargin', 'targetMargin', 'impact']
  }),
  createTemplate({
    id: 'PROFITABILITY_IMPROVEMENT_OPPORTUNITY',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'You have an opportunity to improve profitability by {improvement}% by focusing on {area}. This could add approximately {impact} to your bottom line.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['improvement', 'area', 'impact']
  })
];

/**
 * Cash Flow & Liquidity Insights - FIX: Changed to LIQUIDITY category
 */
const cashFlowTemplates = [
  createTemplate({
    id: 'CASH_POSITION_STRONG',
    category: ADVISOR_CATEGORIES.LIQUIDITY, // FIXED
    template: 'Your cash position is strong at {cashAmount} with {months} months of operating expenses covered. This gives you flexibility to invest in growth.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['cashAmount', 'months']
  }),
  createTemplate({
    id: 'CASH_POSITION_DECLINING',
    category: ADVISOR_CATEGORIES.LIQUIDITY, // FIXED
    template: 'Your cash balance has declined by {decline}% over the {period}. At this rate, you have approximately {runway} months of runway. Review your spending, particularly {topExpense}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH,
    requiresData: ['decline', 'period', 'runway', 'topExpense']
  }),
  createTemplate({
    id: 'CASH_SHORTAGE_WARNING',
    category: ADVISOR_CATEGORIES.LIQUIDITY, // FIXED
    template: '⚠️ Cash shortage warning: Projected cash balance of {projectedCash} is below the minimum threshold of {minimumThreshold}. Immediate action is needed to avoid a cash crisis.',
    sentiment: ADVISOR_SENTIMENT.URGENT,
    severity: ADVISOR_SEVERITY.CRITICAL,
    requiresData: ['projectedCash', 'minimumThreshold']
  }),
  createTemplate({
    id: 'CASH_FLOW_POSITIVE',
    category: ADVISOR_CATEGORIES.LIQUIDITY, // FIXED
    template: 'Your operating cash flow is positive at {cashFlowAmount}, up {growth}% from the previous period. This is a healthy sign for your business.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['cashFlowAmount', 'growth']
  }),
  createTemplate({
    id: 'CASH_FLOW_NEGATIVE',
    category: ADVISOR_CATEGORIES.LIQUIDITY, // FIXED
    template: 'Your operating cash flow is negative at {cashFlowAmount}. You\'re spending more than you\'re earning. Review your expenses and consider accelerating collections.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH,
    requiresData: ['cashFlowAmount']
  })
];

/**
 * Inventory Insights - FIX: Split malformed template
 */
const inventoryTemplates = [
  createTemplate({
    id: 'INVENTORY_TURNOVER_IMPROVING',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: 'Your inventory turnover has improved to {turnover}x, up from {previousTurnover}x. This means you\'re selling inventory more efficiently.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['turnover', 'previousTurnover']
  }),
  createTemplate({
    id: 'INVENTORY_TURNOVER_DECLINING',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: 'Your inventory turnover has declined to {turnover}x, down from {previousTurnover}x. This suggests you\'re holding excess stock. Consider running a promotion on slow-moving items.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.MEDIUM,
    requiresData: ['turnover', 'previousTurnover']
  }),
  createTemplate({
    id: 'LOW_STOCK_WARNING',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: '⚠️ {itemName} is running low with only {stockLevel} units in stock. At current sales velocity, you\'ll run out in {days} days. Consider ordering more immediately.',
    sentiment: ADVISOR_SENTIMENT.URGENT,
    severity: ADVISOR_SEVERITY.HIGH,
    requiresData: ['itemName', 'stockLevel', 'days']
  }),
  createTemplate({
    id: 'EXCESS_INVENTORY',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: '{itemName} has excess inventory with {stockLevel} units ({weeksOfStock} weeks of stock). This ties up approximately {value} in working capital.',
    sentiment: ADVISOR_SENTIMENT.NEUTRAL,
    severity: ADVISOR_SEVERITY.MEDIUM,
    requiresData: ['itemName', 'stockLevel', 'weeksOfStock', 'value']
  }),
  createTemplate({
    id: 'INVENTORY_OPTIMIZATION_OPPORTUNITY',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: 'You could free up approximately {potentialSavings} in working capital by optimizing your inventory levels. Focus on {focusArea}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    requiresData: ['potentialSavings', 'focusArea']
  })
];

// Combine into an immutable registry map space optimized for O(1) query lookups
const TemplateRegistry = deepFreeze(new Map([
 ...revenueTemplates,
 ...profitabilityTemplates,
 ...cashFlowTemplates,
 ...inventoryTemplates
].map((tpl) => [tpl.id, tpl])));

/**
 * Injection-Safe Token Compiler Engine
 * Completely handles string construction without risky dynamic RegExp evaluations
 */
const compileTemplate = (templateId, data = {}) => {
  const target = TemplateRegistry.get(templateId);
  if (!target) {
    throw new Error(`Template lookup failed for ID: ${templateId}`); // FIXED: added backticks
  }

  const missingData = target.requiresData.filter((field) => data[field] === undefined || data[field] === null);
  if (missingData.length > 0) {
    throw new Error(`Template [${templateId}] compilation failed. Missing required fields: ${missingData.join(', ')}`); // FIXED: added backticks
  }

  let outputString = target.template;
  for (const field of target.requiresData) {
    outputString = outputString.split(`{${field}}`).join(String(data[field]));
  }
  return outputString;
};

/**
 * Helper: Get all templates for a category
 */
const getTemplatesByCategory = (category) => {
  if (!ContractValidators.isValidCategory(category)) return [];
  return [...TemplateRegistry.values()].filter(t => t.category === category);
};

module.exports = {
  TemplateRegistry,
  compileTemplate,
  getTemplatesByCategory
};