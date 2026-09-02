'use strict';

/**
 * Decision Rules Registry v1.0.2-prod
 * All files use camelCase
 */

const cashFlowRules = require('./cashFlowRules');
const inventoryRules = require('./inventoryRules');
const pricingRules = require('./pricingRules');
const profitabilityRules = require('./profitabilityRules');
const receivableRules = require('./receivableRules');
const payableRules = require('./payableRules');
const expenseRules = require('./expenseRules');
const customerRules = require('./customerRules');
const supplierRules = require('./supplierRules');
const growthRules = require('./growthRules');
const workingCapitalRules = require('./workingCapitalRules');

/**
 * All decision rules grouped by category
 */
const RULE_SETS = Object.freeze({
  CASH_FLOW: cashFlowRules,
  INVENTORY: inventoryRules,
  PRICING: pricingRules,
  PROFITABILITY: profitabilityRules,
  RECEIVABLES: receivableRules,
  PAYABLES: payableRules,
  EXPENSES: expenseRules,
  CUSTOMERS: customerRules,
  SUPPLIERS: supplierRules,
  GROWTH: growthRules,
  WORKING_CAPITAL: workingCapitalRules
});

/**
 * Flatten all rules into a single array
 */
const ALL_RULES = Object.freeze([
...cashFlowRules,
...inventoryRules,
...pricingRules,
...profitabilityRules,
...receivableRules,
...payableRules,
...expenseRules,
...customerRules,
...supplierRules,
...growthRules,
...workingCapitalRules
]);

/**
 * Get rules by category
 */
function getRulesByCategory(category) {
  return RULE_SETS[category] || [];
}

/**
 * Get rule by ID
 */
function getRuleById(id) {
  return ALL_RULES.find(rule => rule.id === id);
}

module.exports = Object.freeze({
  RULE_SETS,
  ALL_RULES,
  getRulesByCategory,
  getRuleById,
  cashFlowRules,
  inventoryRules,
  pricingRules,
  profitabilityRules,
  receivableRules,
  payableRules,
  expenseRules,
  customerRules,
  supplierRules,
  growthRules,
  workingCapitalRules
});