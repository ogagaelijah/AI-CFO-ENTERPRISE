'use strict';

/**
 * Working Capital Decision Rules
 * Path: src/application/services/decision/rules/workingCapitalRules.js
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
  return Number.isFinite(n)? n : fallback;
};

const safeData = (data) =>
  data && typeof data === 'object' &&!Array.isArray(data)? data : {};

const pct = (ratio) => (ratio * 100).toFixed(1);

const workingCapitalRules = Object.freeze([
  // ============================================================
  // WORKING_CAPITAL_PRESSURE
  // ============================================================
  Object.freeze({
    id: 'WORKING_CAPITAL_PRESSURE',
    type: DECISION_TYPES.WORKING_CAPITAL_PRESSURE,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Working Capital Pressure',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH, // <-- ADDED
    minConfidence: 70,
    defaultTitle: 'Working Capital Pressure Detected',
    defaultSummary: 'Receivables and inventory are high while cash is declining.',
    defaultRecommendation: 'Prioritize collections and review inventory.',
    requiredFields: Object.freeze(['receivables','inventory','cash','trend']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const receivables = toNumber(data.receivables);
        const inventory = toNumber(data.inventory);
        const cash = toNumber(data.cash);
        const trend = toNumber(data.trend);

        const workingCapital = cash + receivables + inventory;
        if (workingCapital <= 0) return Object.freeze({ triggered: false });

        const pressure = (receivables + inventory) / workingCapital;

        if (pressure > 0.7 && trend < 0) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({ receivables, inventory, cash, workingCapital, pressure: pct(pressure), trend: pct(trend) }),
            impact: Object.freeze({ financialImpact: workingCapital, description: `${pct(pressure)}% of working capital in receivables + inventory` }),
            urgency: DECISION_TIMEFRAME.SHORT_TERM,
            currentState: Object.freeze({ receivables, inventory, cash }),
            expectedImpact: 'Improved cash position and working capital',
            risks: Object.freeze(['Cash crisis', 'Liquidity pressure']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Working capital pressure detected: ${evidence.pressure}% of working capital (${NGN.format(evidence.workingCapital)}) is in receivables (${NGN.format(evidence.receivables)}) and inventory (${NGN.format(evidence.inventory)}) with cash declining ${evidence.trend}%. Prioritize collections and review inventory levels.`;
    },
  }),

  // ============================================================
  // WORKING_CAPITAL_OPTIMIZATION
  // ============================================================
  Object.freeze({
    id: 'WORKING_CAPITAL_OPTIMIZATION',
    type: DECISION_TYPES.WORKING_CAPITAL_OPTIMIZATION,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Working Capital Optimization',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.MEDIUM, // <-- ADDED
    minConfidence: 60,
    defaultTitle: 'Working Capital Optimization Opportunity',
    defaultSummary: 'Receivables are high while payables are low.',
    defaultRecommendation: 'Optimize working capital structure.',
    requiredFields: Object.freeze(['receivables','payables','inventory','cash']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const receivables = toNumber(data.receivables);
        const payables = toNumber(data.payables);
        const inventory = toNumber(data.inventory);
        const cash = toNumber(data.cash);

        if (receivables <= 0 || payables <= 0) return Object.freeze({ triggered: false });

        const workingCapital = cash + receivables + inventory - payables;
        const ratio = receivables / payables;

        if (ratio > 2) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({ receivables, payables, inventory, cash, workingCapital, ratio: ratio.toFixed(1) }),
            impact: Object.freeze({ financialImpact: receivables - payables, description: `Receivables are ${ratio.toFixed(1)}x higher than payables` }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ receivables, payables, ratio }),
            expectedImpact: 'Optimized working capital',
            risks: Object.freeze(['Supplier relationship strain']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Receivables (${NGN.format(evidence.receivables)}) are ${evidence.ratio}x higher than payables (${NGN.format(evidence.payables)}). Consider optimizing working capital by accelerating collections and negotiating extended payment terms with suppliers.`;
    },
  }),

  // ============================================================
  // CASH_CONVERSION_CYCLE_LENGTHENING
  // ============================================================
  Object.freeze({
    id: 'CASH_CONVERSION_CYCLE_LENGTHENING',
    type: DECISION_TYPES.CASH_CONVERSION_CYCLE_LENGTHENING,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Cash Conversion Cycle Lengthening',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH, // <-- ADDED
    minConfidence: 65,
    defaultTitle: 'Cash Conversion Cycle Lengthening',
    defaultSummary: 'Cash conversion cycle is increasing over time.',
    defaultRecommendation: 'Review receivables and inventory management.',
    requiredFields: Object.freeze(['cccHistory','currentCCC','periods']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const cccHistory = Array.isArray(data.cccHistory)? data.cccHistory : [];
        const periods = Math.max(3, toNumber(data.periods, 3));

        if (cccHistory.length < periods) return Object.freeze({ triggered: false });

        const lastN = cccHistory.slice(-periods);
        const isIncreasing = lastN.every((item, i) => i === 0 || toNumber(item?.value) > toNumber(lastN[i - 1]?.value));

        if (!isIncreasing) return Object.freeze({ triggered: false });

        const firstValue = toNumber(lastN[0]?.value);
        const lastValue = toNumber(lastN[lastN.length - 1]?.value);
        const increase = lastValue - firstValue;

        if (increase > 10) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({ periods, firstCCC: firstValue, currentCCC: lastValue, increase: increase.toFixed(1), change: 'lengthening' }),
            impact: Object.freeze({ financialImpact: null, description: `Cash conversion cycle increased by ${increase.toFixed(1)} days over ${periods} periods` }),
            urgency: increase > 15? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ currentCCC: lastValue, increase }),
            expectedImpact: 'Shortened cash conversion cycle',
            risks: Object.freeze(['Working capital pressure', 'Liquidity risk']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Cash conversion cycle increased by ${evidence.increase} days over ${evidence.periods} periods (from ${evidence.firstCCC} to ${evidence.currentCCC} days). Review receivables collection and inventory management to reverse this trend.`;
    },
  }),

  // ============================================================
  // LIQUIDITY_RISK
  // ============================================================
  Object.freeze({
    id: 'LIQUIDITY_RISK',
    type: DECISION_TYPES.LIQUIDITY_RISK,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Liquidity Risk',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.CRITICAL, // <-- ADDED
    minConfidence: 70,
    defaultTitle: 'Liquidity Risk Detected',
    defaultSummary: 'Current ratio is below healthy threshold.',
    defaultRecommendation: 'Improve liquidity position immediately.',
    requiredFields: Object.freeze(['currentAssets','currentLiabilities']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const currentAssets = toNumber(data.currentAssets);
        const currentLiabilities = toNumber(data.currentLiabilities);

        if (currentAssets <= 0 || currentLiabilities <= 0) return Object.freeze({ triggered: false });

        const currentRatio = currentAssets / currentLiabilities;

        if (currentRatio < 1.2) {
          const isCritical = currentRatio < 1.0;
          return Object.freeze({
            triggered: true,
            severity: isCritical? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({ currentAssets, currentLiabilities, currentRatio: currentRatio.toFixed(2), shortfall: Math.max(0, currentLiabilities * 1.2 - currentAssets) }),
            impact: Object.freeze({ financialImpact: currentLiabilities - currentAssets, description: `Current ratio of ${currentRatio.toFixed(2)} (below 1.2 threshold)` }),
            urgency: isCritical? DECISION_TIMEFRAME.IMMEDIATE : DECISION_TIMEFRAME.SHORT_TERM,
            currentState: Object.freeze({ currentAssets, currentLiabilities }),
            expectedImpact: 'Improved liquidity position',
            risks: Object.freeze(['Inability to meet short-term obligations', 'Business disruption']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const urgency = toNumber(evidence.currentRatio) < 1.0? '🚨 CRITICAL: ' : '⚠️ ';
      return `${urgency}Current ratio is ${evidence.currentRatio} (below healthy threshold of 1.2). Assets: ${NGN.format(evidence.currentAssets)}, Liabilities: ${NGN.format(evidence.currentLiabilities)}. Immediate actions: accelerate collections, reduce inventory, and review short-term debt.`;
    },
  }),

  // ============================================================
  // QUICK_RATIO_WARNING
  // ============================================================
  Object.freeze({
    id: 'QUICK_RATIO_WARNING',
    type: DECISION_TYPES.QUICK_RATIO_WARNING,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Quick Ratio Warning',
    severity: DECISION_SEVERITY.CRITICAL,
    priority: DECISION_PRIORITY.CRITICAL, // <-- ADDED
    minConfidence: 75,
    defaultTitle: '🚨 CRITICAL: Quick Ratio Warning',
    defaultSummary: 'Quick ratio is dangerously low.',
    defaultRecommendation: 'Immediate liquidity actions required.',
    requiredFields: Object.freeze(['cash','receivables','currentLiabilities']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const cash = toNumber(data.cash);
        const receivables = toNumber(data.receivables);
        const currentLiabilities = toNumber(data.currentLiabilities);

        if (currentLiabilities <= 0) return Object.freeze({ triggered: false });

        const quickAssets = cash + receivables;
        const quickRatio = quickAssets / currentLiabilities;

        if (quickRatio < 0.8) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.CRITICAL,
            evidence: Object.freeze({ cash, receivables, quickAssets, currentLiabilities, quickRatio: quickRatio.toFixed(2), shortfall: Math.max(0, currentLiabilities * 0.8 - quickAssets) }),
            impact: Object.freeze({ financialImpact: quickAssets, description: `Quick ratio of ${quickRatio.toFixed(2)} (below 0.8 threshold)` }),
            urgency: DECISION_TIMEFRAME.IMMEDIATE,
            currentState: Object.freeze({ cash, receivables, quickRatio }),
            expectedImpact: 'Improved immediate liquidity',
            risks: Object.freeze(['Inability to meet urgent obligations']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `🚨 CRITICAL: Quick ratio is ${evidence.quickRatio} (below 0.8 threshold). Liquid assets (cash + receivables) are ${NGN.format(evidence.quickAssets)} vs current liabilities of ${NGN.format(evidence.currentLiabilities)}. Immediate actions: accelerate collections and secure emergency financing if needed.`;
    },
  }),

  // ============================================================
  // OPERATING_LEVERAGE_RISK
  // ============================================================
  Object.freeze({
    id: 'OPERATING_LEVERAGE_RISK',
    type: DECISION_TYPES.OPERATING_LEVERAGE_RISK,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Operating Leverage Risk',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.MEDIUM, // <-- ADDED
    minConfidence: 60,
    defaultTitle: 'Operating Leverage Risk',
    defaultSummary: 'Fixed costs represent a high portion of total costs.',
    defaultRecommendation: 'Review fixed cost structure.',
    requiredFields: Object.freeze(['fixedCosts','totalCosts','revenue']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const fixedCosts = toNumber(data.fixedCosts);
        const totalCosts = toNumber(data.totalCosts);
        const revenue = toNumber(data.revenue);

        if (fixedCosts <= 0 || totalCosts <= 0) return Object.freeze({ triggered: false });

        const fixedPercentage = (fixedCosts / totalCosts) * 100;

        if (fixedPercentage > 60) {
          const variableRatio = 1 - fixedCosts / totalCosts;
          const breakEvenRevenue = variableRatio > 0? totalCosts / variableRatio : null;
          const currentMargin = revenue > 0? (revenue - totalCosts) / revenue : null;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({ fixedCosts, totalCosts, fixedPercentage: fixedPercentage.toFixed(1), breakEvenRevenue, currentMargin: currentMargin!= null? pct(currentMargin) : 'unknown', revenue }),
            impact: Object.freeze({ financialImpact: fixedCosts, description: `${fixedPercentage.toFixed(1)}% of costs are fixed` }),
            urgency: fixedPercentage > 75? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ fixedPercentage }),
            expectedImpact: 'Reduced operating leverage risk',
            risks: Object.freeze(['Profit volatility', 'Break-even risk']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `Fixed costs are ${evidence.fixedPercentage}% of total costs.`;
      if (evidence.breakEvenRevenue) {
        recommendation += ` Break-even revenue: ${NGN.format(evidence.breakEvenRevenue)}.`;
      }
      if (evidence.currentMargin!== 'unknown') {
        recommendation += ` Current margin: ${evidence.currentMargin}%.`;
      }
      recommendation += ' Consider converting fixed costs to variable costs where possible to reduce risk.';
      return recommendation;
    },
  }),
]);

module.exports = workingCapitalRules;