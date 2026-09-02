'use strict';

/**
 * Expense Decision Rules
 * Path: src/application/services/decision/rules/expenseRules.js
 * SSOT: DecisionContracts
 * @version 1.2.1-prod
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
  DECISION_PRIORITY,
  DECISION_TIMEFRAME,
  DECISION_ENTITY,
} = require('../contracts/DecisionContracts');

const NGN = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ─── pure helpers ────────────────────────────────────────────
const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const safeData = (data) =>
  data && typeof data === 'object' && !Array.isArray(data) ? data : {};

const pct = (ratio) => (ratio * 100).toFixed(1);

const safeSlice = (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []);

// ─── rules ───────────────────────────────────────────────────
const expenseRules = Object.freeze([
  // ============================================================
  // EXPENSE_GROWTH_ALERT
  // ============================================================
  Object.freeze({
    id: 'EXPENSE_GROWTH_ALERT',
    type: DECISION_TYPES.EXPENSE_GROWTH_ALERT,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Expense Growth Alert',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH,
    minConfidence: 70,
    defaultTitle: 'Expense Growth Outpacing Revenue',
    defaultSummary: 'Expenses are growing faster than revenue.',
    defaultRecommendation: 'Review expense categories and identify cost drivers.',
    requiredFields: Object.freeze(['expenseGrowth', 'revenueGrowth', 'expenses', 'revenue']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const expenseGrowth = toNumber(data.expenseGrowth);
        const revenueGrowth = toNumber(data.revenueGrowth);
        const expenses = toNumber(data.expenses);
        const revenue = toNumber(data.revenue);
        const category = data.category || 'Overall';

        if (expenseGrowth <= 0) return Object.freeze({ triggered: false });

        const ratio = revenueGrowth > 0 ? expenseGrowth / revenueGrowth : Infinity;

        if (ratio > 2 && expenseGrowth > 0.05) {
          const isCritical = ratio > 3;
          return Object.freeze({
            triggered: true,
            severity: isCritical ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              expenseGrowth: pct(expenseGrowth),
              revenueGrowth: pct(revenueGrowth),
              ratio: ratio === Infinity ? '∞' : ratio.toFixed(1),
              expenses,
              revenue,
              category,
            }),
            impact: Object.freeze({
              financialImpact: expenses * expenseGrowth,
              description: `${category} expenses grew ${pct(expenseGrowth)}% vs ${pct(revenueGrowth)}% revenue growth (${ratio === Infinity ? '∞' : ratio.toFixed(1)}x faster)`,
            }),
            urgency: isCritical ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ expenseGrowth, revenueGrowth }),
            expectedImpact: 'Aligned expense and revenue growth',
            risks: Object.freeze(['Margin erosion', 'Profitability decline']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.category} expenses grew ${evidence.expenseGrowth}% compared to ${evidence.revenueGrowth}% revenue growth (${evidence.ratio}x faster). Review ${String(evidence.category).toLowerCase()} expense categories to identify drivers and control costs.`;
    },
  }),

  // ============================================================
  // EXPENSE_ANOMALY
  // ============================================================
  Object.freeze({
    id: 'EXPENSE_ANOMALY',
    type: DECISION_TYPES.EXPENSE_ANOMALY,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Expense Anomaly',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.MEDIUM,
    minConfidence: 75,
    defaultTitle: 'Expense Anomaly Detected',
    defaultSummary: 'An expense category is significantly above normal range.',
    defaultRecommendation: 'Investigate the unusual expense.',
    requiredFields: Object.freeze(['currentExpense', 'normalRange', 'expenseCategory']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const currentExpense = toNumber(data.currentExpense);
        const normalRange = safeData(data.normalRange);
        const expenseCategory = data.expenseCategory || 'Expense';
        const month = data.month || 'current';
        const min = toNumber(normalRange.min);
        const max = toNumber(normalRange.max);
        const average = toNumber(normalRange.average);

        if (currentExpense <= 0 || max <= 0) return Object.freeze({ triggered: false });

        if (currentExpense > max) {
          const variancePercent = average > 0 ? ((currentExpense - average) / average) * 100 : 0;
          const isCritical = variancePercent > 50;
          return Object.freeze({
            triggered: true,
            severity: isCritical ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              currentExpense,
              normalRange: Object.freeze({ min, max, average }),
              expenseCategory,
              variancePercent: variancePercent.toFixed(1),
              month,
              isAboveMax: true,
            }),
            impact: Object.freeze({
              financialImpact: currentExpense - average,
              description: `${expenseCategory} is ${variancePercent.toFixed(1)}% above normal (${NGN.format(currentExpense)} vs avg ${NGN.format(average)})`,
            }),
            urgency: isCritical ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ currentExpense, average }),
            expectedImpact: 'Normalized expense levels',
            risks: Object.freeze(['Continued overspending', 'Budget overrun']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.expenseCategory} expense is ${NGN.format(evidence.currentExpense)} (${evidence.variancePercent}% above normal average of ${NGN.format(evidence.normalRange.average)}). Investigate the cause and take corrective action.`;
    },
  }),

  // ============================================================
  // EXPENSE_CONCENTRATION
  // ============================================================
  Object.freeze({
    id: 'EXPENSE_CONCENTRATION',
    type: DECISION_TYPES.EXPENSE_CONCENTRATION,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Expense Concentration',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.LOW,
    minConfidence: 60,
    defaultTitle: 'Expense Concentration Risk',
    defaultSummary: 'A few expense categories represent majority of spending.',
    defaultRecommendation: 'Review these categories for optimization opportunities.',
    requiredFields: Object.freeze(['topCategories', 'totalExpenses', 'threshold']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const topCategories = safeSlice(data.topCategories, 10);
        const totalExpenses = toNumber(data.totalExpenses);
        const threshold = toNumber(data.threshold, 0.7);

        if (topCategories.length === 0 || totalExpenses <= 0) return Object.freeze({ triggered: false });

        const top3 = safeSlice(topCategories, 3);
        const top3Total = top3.reduce((sum, cat) => sum + toNumber(cat?.amount), 0);
        const concentration = top3Total / totalExpenses;

        if (concentration > threshold) {
          const topNames = top3.map((c) => c?.name).filter(Boolean).join(', ');
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              topCategories: top3.map((c) =>
                Object.freeze({
                  name: c?.name || 'Unknown',
                  amount: toNumber(c?.amount),
                  percent: pct(toNumber(c?.amount) / totalExpenses),
                })
              ),
              totalExpenses,
              concentration: pct(concentration),
              threshold: pct(threshold),
            }),
            impact: Object.freeze({
              financialImpact: top3Total,
              description: `${pct(concentration)}% of expenses in 3 categories: ${topNames}`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ concentration }),
            expectedImpact: 'Optimized expense structure',
            risks: Object.freeze(['Inefficient spending']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `3 expense categories represent ${evidence.concentration}% of total expenses:\n`;
      for (const cat of evidence.topCategories || []) {
        recommendation += `- ${cat.name}: ${NGN.format(cat.amount)} (${cat.percent}%)\n`;
      }
      recommendation += 'Review these categories for cost optimization opportunities.';
      return recommendation;
    },
  }),

  // ============================================================
  // ADVERTISING_EFFICIENCY
  // ============================================================
  Object.freeze({
    id: 'ADVERTISING_EFFICIENCY',
    type: DECISION_TYPES.ADVERTISING_EFFICIENCY,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Advertising Efficiency',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.MEDIUM,
    minConfidence: 65,
    defaultTitle: 'Advertising Efficiency Review',
    defaultSummary: 'Advertising spend is increasing but revenue is not responding.',
    defaultRecommendation: 'Review advertising effectiveness and ROI.',
    requiredFields: Object.freeze(['adSpend', 'adSpendGrowth', 'revenueGrowth', 'roi']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const adSpend = toNumber(data.adSpend);
        const adSpendGrowth = toNumber(data.adSpendGrowth);
        const revenueGrowth = toNumber(data.revenueGrowth);
        const roi = data.roi != null ? toNumber(data.roi) : null;
        const channel = data.channel || 'Overall advertising';

        if (adSpendGrowth <= 0) return Object.freeze({ triggered: false });

        const efficiency = adSpendGrowth / (revenueGrowth > 0 ? revenueGrowth : 0.01);

        if (efficiency > 2 && adSpendGrowth > 0.1) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              adSpend,
              adSpendGrowth: pct(adSpendGrowth),
              revenueGrowth: pct(revenueGrowth),
              efficiency: efficiency.toFixed(1),
              roi: roi != null ? pct(roi) : 'unknown',
              channel,
            }),
            impact: Object.freeze({
              financialImpact: adSpend,
              description: `${channel} spend up ${pct(adSpendGrowth)}% but revenue up only ${pct(revenueGrowth)}% (${efficiency.toFixed(1)}x less efficient)`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ adSpendGrowth, revenueGrowth }),
            expectedImpact: 'Improved advertising ROI',
            risks: Object.freeze(['Wasted spend', 'Poor channel selection']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `${evidence.channel} spend increased ${evidence.adSpendGrowth}% but revenue only grew ${evidence.revenueGrowth}% (${evidence.efficiency}x less efficient).`;
      if (evidence.roi !== 'unknown') recommendation += ` ROI: ${evidence.roi}%.`;
      recommendation += ' Review campaign effectiveness, channel mix, and targeting. Consider pausing underperforming campaigns.';
      return recommendation;
    },
  }),

  // ============================================================
  // RENT_LEASE_REVIEW
  // ============================================================
  Object.freeze({
    id: 'RENT_LEASE_REVIEW',
    type: DECISION_TYPES.RENT_LEASE_REVIEW,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Rent / Lease Review',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.MEDIUM,
    minConfidence: 70,
    defaultTitle: 'Rent / Lease Cost Review',
    defaultSummary: 'Rent expense is high relative to revenue.',
    defaultRecommendation: 'Review lease terms and consider space optimization.',
    requiredFields: Object.freeze(['rentExpense', 'revenue', 'industryAverage']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const rentExpense = toNumber(data.rentExpense);
        const revenue = toNumber(data.revenue);
        const industryAverage = toNumber(data.industryAverage, 0.15);

        if (rentExpense <= 0 || revenue <= 0) return Object.freeze({ triggered: false });

        const rentToRevenue = rentExpense / revenue;
        if (rentToRevenue > 0.2) {
          const gap = rentToRevenue - industryAverage;
          const isUrgent = rentToRevenue > 0.3;
          return Object.freeze({
            triggered: true,
            severity: isUrgent ? DECISION_SEVERITY.WARNING : DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              rentExpense,
              revenue,
              rentToRevenue: pct(rentToRevenue),
              industryAverage: pct(industryAverage),
              gap: pct(gap),
            }),
            impact: Object.freeze({
              financialImpact: rentExpense - revenue * industryAverage,
              description: `Rent is ${pct(rentToRevenue)}% of revenue (industry avg ${pct(industryAverage)}%)`,
            }),
            urgency: isUrgent ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ rentToRevenue }),
            expectedImpact: 'Reduced occupancy cost burden',
            risks: Object.freeze(['High fixed cost base', 'Reduced flexibility']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Rent is ${evidence.rentToRevenue}% of revenue (${NGN.format(evidence.rentExpense)}), ${evidence.gap}% above industry average (${evidence.industryAverage}%). Review lease terms, consider subletting, or relocating to a more efficient space.`;
    },
  }),

  // ============================================================
  // SALARY_COST_REVIEW
  // ============================================================
  Object.freeze({
    id: 'SALARY_COST_REVIEW',
    type: DECISION_TYPES.SALARY_COST_REVIEW,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Salary Cost Review',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH,
    minConfidence: 70,
    defaultTitle: 'Salary Cost Growth Review',
    defaultSummary: 'Salary costs are growing faster than revenue.',
    defaultRecommendation: 'Review headcount, compensation, and productivity.',
    requiredFields: Object.freeze(['salaryGrowth', 'revenueGrowth', 'salaryExpense', 'revenue']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const salaryGrowth = toNumber(data.salaryGrowth);
        const revenueGrowth = toNumber(data.revenueGrowth);
        const salaryExpense = toNumber(data.salaryExpense);
        const revenue = toNumber(data.revenue);

        if (salaryGrowth <= 0) return Object.freeze({ triggered: false });

        const ratio = revenueGrowth > 0 ? salaryGrowth / revenueGrowth : Infinity;

        if (ratio > 1.5 && salaryGrowth > 0.05) {
          const isUrgent = ratio > 2;
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              salaryGrowth: pct(salaryGrowth),
              revenueGrowth: pct(revenueGrowth),
              ratio: ratio === Infinity ? '∞' : ratio.toFixed(1),
              salaryExpense,
              revenue,
            }),
            impact: Object.freeze({
              financialImpact: salaryExpense * salaryGrowth,
              description: `Salary costs grew ${pct(salaryGrowth)}% vs ${pct(revenueGrowth)}% revenue (${ratio === Infinity ? '∞' : ratio.toFixed(1)}x faster)`,
            }),
            urgency: isUrgent ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ salaryGrowth, revenueGrowth }),
            expectedImpact: 'Aligned salary and revenue growth',
            risks: Object.freeze(['Margin compression', 'Overstaffing']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Salary costs grew ${evidence.salaryGrowth}% while revenue grew ${evidence.revenueGrowth}% (${evidence.ratio}x faster). Review headcount plans, compensation structure, and productivity metrics.`;
    },
  }),

  // ============================================================
  // DISCRETIONARY_EXPENSE_REVIEW
  // ============================================================
  Object.freeze({
    id: 'DISCRETIONARY_EXPENSE_REVIEW',
    type: DECISION_TYPES.DISCRETIONARY_EXPENSE_REVIEW,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Discretionary Expense Review',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.LOW,
    minConfidence: 60,
    defaultTitle: 'Discretionary Expense Review',
    defaultSummary: 'Discretionary spending is high relative to revenue.',
    defaultRecommendation: 'Review discretionary categories for potential savings.',
    requiredFields: Object.freeze(['discretionarySpend', 'revenue']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const discretionarySpend = toNumber(data.discretionarySpend);
        const revenue = toNumber(data.revenue);

        if (discretionarySpend <= 0 || revenue <= 0) return Object.freeze({ triggered: false });

        const percentOfRevenue = discretionarySpend / revenue;
        if (percentOfRevenue > 0.15) {
          const isUrgent = percentOfRevenue > 0.2;
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              discretionarySpend,
              revenue,
              percentOfRevenue: pct(percentOfRevenue),
            }),
            impact: Object.freeze({
              financialImpact: discretionarySpend,
              description: `Discretionary spend is ${pct(percentOfRevenue)}% of revenue`,
            }),
            urgency: isUrgent ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ percentOfRevenue }),
            expectedImpact: 'Reduced discretionary burn',
            risks: Object.freeze(['Unnecessary cash outflow']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Discretionary spending is ${NGN.format(evidence.discretionarySpend)} (${evidence.percentOfRevenue}% of revenue). Review travel, entertainment, subscriptions, and other non-essential categories for savings.`;
    },
  }),

  // ============================================================
  // COST_CONTROL_OPPORTUNITY
  // ============================================================
  Object.freeze({
    id: 'COST_CONTROL_OPPORTUNITY',
    type: DECISION_TYPES.COST_CONTROL_OPPORTUNITY,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Cost Control Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    priority: DECISION_PRIORITY.LOW,
    minConfidence: 60,
    defaultTitle: 'Cost Control Opportunity',
    defaultSummary: 'An expense category is running significantly above average.',
    defaultRecommendation: 'Investigate and bring the category back in line.',
    requiredFields: Object.freeze(['categoryExpense', 'categoryAverage', 'expenseCategory']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const categoryExpense = toNumber(data.categoryExpense);
        const categoryAverage = toNumber(data.categoryAverage);
        const expenseCategory = data.expenseCategory || 'Category';

        if (categoryExpense <= 0 || categoryAverage <= 0) return Object.freeze({ triggered: false });

        const percentAbove = ((categoryExpense - categoryAverage) / categoryAverage) * 100;

        if (percentAbove > 20) {
          const savings = categoryExpense - categoryAverage;
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.OPPORTUNITY,
            evidence: Object.freeze({
              categoryExpense,
              categoryAverage,
              expenseCategory,
              percentAbove: percentAbove.toFixed(1),
              savings,
            }),
            impact: Object.freeze({
              financialImpact: savings,
              description: `${expenseCategory} is ${percentAbove.toFixed(1)}% above average`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ categoryExpense, categoryAverage }),
            expectedImpact: 'Cost savings opportunity',
            risks: Object.freeze(['Missed savings']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.expenseCategory} is running ${evidence.percentAbove}% above average (${NGN.format(evidence.categoryExpense)} vs ${NGN.format(evidence.categoryAverage)}). Potential savings: ${NGN.format(evidence.savings)}. Investigate drivers and implement controls.`;
    },
  }),

  // ============================================================
  // FIXED_COST_WARNING
  // ============================================================
  Object.freeze({
    id: 'FIXED_COST_WARNING',
    type: DECISION_TYPES.FIXED_COST_WARNING,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Fixed Cost Warning',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH,
    minConfidence: 70,
    defaultTitle: 'High Fixed Cost Base',
    defaultSummary: 'Fixed costs are high relative to revenue.',
    defaultRecommendation: 'Review fixed cost structure and identify flexibility opportunities.',
    requiredFields: Object.freeze(['fixedCosts', 'totalCosts', 'revenue']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const fixedCosts = toNumber(data.fixedCosts);
        const totalCosts = toNumber(data.totalCosts);
        const revenue = toNumber(data.revenue);

        if (fixedCosts <= 0 || revenue <= 0) return Object.freeze({ triggered: false });

        const fixedToRevenue = fixedCosts / revenue;
        const fixedToTotal = totalCosts > 0 ? fixedCosts / totalCosts : 0;

        if (fixedToRevenue > 0.5) {
          const isCritical = fixedToRevenue > 0.6;
          return Object.freeze({
            triggered: true,
            severity: isCritical ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              fixedCosts,
              totalCosts,
              revenue,
              fixedToRevenue: pct(fixedToRevenue),
              fixedToTotal: pct(fixedToTotal),
            }),
            impact: Object.freeze({
              financialImpact: fixedCosts,
              description: `Fixed costs are ${pct(fixedToRevenue)}% of revenue`,
            }),
            urgency: isCritical ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ fixedToRevenue, fixedToTotal }),
            expectedImpact: 'More flexible cost structure',
            risks: Object.freeze(['Low operating leverage flexibility', 'Break-even risk']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Fixed costs are ${NGN.format(evidence.fixedCosts)} (${evidence.fixedToRevenue}% of revenue, ${evidence.fixedToTotal}% of total costs). Review leases, salaries, and other fixed commitments for opportunities to increase flexibility.`;
    },
  }),

  // ============================================================
  // VARIABLE_COST_OPTIMIZATION
  // ============================================================
  Object.freeze({
    id: 'VARIABLE_COST_OPTIMIZATION',
    type: DECISION_TYPES.VARIABLE_COST_OPTIMIZATION,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Variable Cost Optimization',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.MEDIUM,
    minConfidence: 65,
    defaultTitle: 'Variable Cost Optimization',
    defaultSummary: 'Variable costs are growing faster than volume.',
    defaultRecommendation: 'Review variable cost drivers and supplier terms.',
    requiredFields: Object.freeze(['variableCostGrowth', 'volumeGrowth', 'variableCosts']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const variableCostGrowth = toNumber(data.variableCostGrowth);
        const volumeGrowth = toNumber(data.volumeGrowth);
        const variableCosts = toNumber(data.variableCosts);

        if (variableCostGrowth <= 0) return Object.freeze({ triggered: false });

        const ratio = volumeGrowth > 0 ? variableCostGrowth / volumeGrowth : Infinity;

        if (ratio > 1.2 && variableCostGrowth > 0.05) {
          const isUrgent = ratio > 1.5;
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              variableCostGrowth: pct(variableCostGrowth),
              volumeGrowth: pct(volumeGrowth),
              ratio: ratio === Infinity ? '∞' : ratio.toFixed(1),
              variableCosts,
            }),
            impact: Object.freeze({
              financialImpact: variableCosts * variableCostGrowth,
              description: `Variable costs grew ${pct(variableCostGrowth)}% vs ${pct(volumeGrowth)}% volume (${ratio === Infinity ? '∞' : ratio.toFixed(1)}x faster)`,
            }),
            urgency: isUrgent ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ variableCostGrowth, volumeGrowth }),
            expectedImpact: 'Improved variable cost efficiency',
            risks: Object.freeze(['Margin pressure']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
        return Object.freeze({ triggered: false });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Variable costs grew ${evidence.variableCostGrowth}% while volume grew ${evidence.volumeGrowth}% (${evidence.ratio}x faster). Review unit costs, supplier pricing, and process efficiency.`;
    },
  }),
]);

module.exports = expenseRules;