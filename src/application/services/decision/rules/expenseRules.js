/**
 * Expense Decision Rules
 * 
 * Detects expense issues and cost control opportunities
 * 
 * @version 1.0
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
  DECISION_PRIORITY
} = require('../contracts/DecisionContracts');

/**
 * Expense Rule Definitions
 */
const expenseRules = [
  // ============================================================
  // EXPENSE_GROWTH_ALERT
  // ============================================================
  {
    id: 'EXPENSE_GROWTH_ALERT',
    type: DECISION_TYPES.EXPENSE_GROWTH_ALERT,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Expense Growth Alert',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Expense Growth Outpacing Revenue',
    defaultSummary: 'Expenses are growing faster than revenue.',
    defaultRecommendation: 'Review expense categories and identify cost drivers.',
    requiredFields: ['expenseGrowth', 'revenueGrowth', 'expenses', 'revenue'],

    async evaluate(data) {
      const { expenseGrowth, revenueGrowth, expenses, revenue, category = 'Overall' } = data;

      if (expenseGrowth !== undefined && revenueGrowth !== undefined) {
        const ratio = revenueGrowth > 0 ? expenseGrowth / revenueGrowth : 0;

        if (ratio > 2 && expenseGrowth > 0.05) {
          const urgency = ratio > 3 ? 'SHORT_TERM' : 'MEDIUM_TERM';
          const severity = ratio > 3 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

          return {
            triggered: true,
            evidence: {
              expenseGrowth: (expenseGrowth * 100).toFixed(1),
              revenueGrowth: (revenueGrowth * 100).toFixed(1),
              ratio: ratio.toFixed(1),
              expenses,
              revenue,
              category
            },
            impact: {
              financialImpact: expenses * expenseGrowth,
              description: `${category} expenses grew ${(expenseGrowth * 100).toFixed(1)}% vs ${(revenueGrowth * 100).toFixed(1)}% revenue growth (${ratio.toFixed(1)}x faster)`
            },
            urgency,
            currentState: { expenseGrowth, revenueGrowth },
            expectedImpact: 'Aligned expense and revenue growth',
            risks: ['Margin erosion', 'Profitability decline'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `${evidence.category} expenses grew ${evidence.expenseGrowth}% compared to ${evidence.revenueGrowth}% revenue growth (${evidence.ratio}x faster). Review ${evidence.category.toLowerCase()} expense categories to identify drivers and control costs.`;
    }
  },

  // ============================================================
  // EXPENSE_ANOMALY
  // ============================================================
  {
    id: 'EXPENSE_ANOMALY',
    type: DECISION_TYPES.EXPENSE_ANOMALY,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Expense Anomaly',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Expense Anomaly Detected',
    defaultSummary: 'An expense category is significantly above normal range.',
    defaultRecommendation: 'Investigate the unusual expense.',
    requiredFields: ['currentExpense', 'normalRange', 'expenseCategory'],

    async evaluate(data) {
      const { currentExpense, normalRange, expenseCategory, month } = data;

      if (currentExpense && normalRange) {
        const { min, max, average } = normalRange;
        const isAboveMax = currentExpense > max;
        const variancePercent = average > 0 ? ((currentExpense - average) / average) * 100 : 0;

        if (isAboveMax) {
          const severity = variancePercent > 50 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;
          const urgency = variancePercent > 50 ? 'SHORT_TERM' : 'MEDIUM_TERM';

          return {
            triggered: true,
            evidence: {
              currentExpense,
              normalRange: { min, max, average },
              expenseCategory: expenseCategory || 'Expense',
              variancePercent: variancePercent.toFixed(1),
              month: month || 'current',
              isAboveMax: true
            },
            impact: {
              financialImpact: currentExpense - average,
              description: `${expenseCategory || 'Expense'} is ${variancePercent.toFixed(1)}% above normal (₦${currentExpense.toLocaleString()} vs avg ₦${average.toLocaleString()})`
            },
            urgency,
            currentState: { currentExpense, average },
            expectedImpact: 'Normalized expense levels',
            risks: ['Continued overspending', 'Budget overrun'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `${evidence.expenseCategory} expense is ₦${evidence.currentExpense.toLocaleString()} (${evidence.variancePercent}% above normal average of ₦${evidence.normalRange.average.toLocaleString()}). Investigate the cause and take corrective action.`;
    }
  },

  // ============================================================
  // EXPENSE_CONCENTRATION
  // ============================================================
  {
    id: 'EXPENSE_CONCENTRATION',
    type: DECISION_TYPES.EXPENSE_CONCENTRATION,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Expense Concentration',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Expense Concentration Risk',
    defaultSummary: 'A few expense categories represent majority of spending.',
    defaultRecommendation: 'Review these categories for optimization opportunities.',
    requiredFields: ['topCategories', 'totalExpenses', 'threshold'],

    async evaluate(data) {
      const { topCategories, totalExpenses, threshold = 0.7 } = data;

      if (topCategories && topCategories.length > 0 && totalExpenses > 0) {
        const top3Total = topCategories.slice(0, 3).reduce((sum, cat) => sum + cat.amount, 0);
        const concentration = top3Total / totalExpenses;

        if (concentration > threshold) {
          const topNames = topCategories.slice(0, 3).map(c => c.name).join(', ');

          return {
            triggered: true,
            evidence: {
              topCategories: topCategories.slice(0, 3).map(c => ({
                name: c.name,
                amount: c.amount,
                percent: ((c.amount / totalExpenses) * 100).toFixed(1)
              })),
              totalExpenses,
              concentration: (concentration * 100).toFixed(1),
              threshold: (threshold * 100).toFixed(1)
            },
            impact: {
              financialImpact: top3Total,
              description: `${(concentration * 100).toFixed(1)}% of expenses in 3 categories: ${topNames}`
            },
            urgency: 'MEDIUM_TERM',
            currentState: { concentration },
            expectedImpact: 'Optimized expense structure',
            risks: ['Inefficient spending'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `3 expense categories represent ${evidence.concentration}% of total expenses:\n`;
      
      for (const cat of evidence.topCategories) {
        recommendation += `- ${cat.name}: ₦${cat.amount.toLocaleString()} (${cat.percent}%)\n`;
      }
      
      recommendation += 'Review these categories for cost optimization opportunities.';
      return recommendation;
    }
  },

  // ============================================================
  // ADVERTISING_EFFICIENCY
  // ============================================================
  {
    id: 'ADVERTISING_EFFICIENCY',
    type: DECISION_TYPES.ADVERTISING_EFFICIENCY,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Advertising Efficiency',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Advertising Efficiency Review',
    defaultSummary: 'Advertising spend is increasing but revenue is not responding.',
    defaultRecommendation: 'Review advertising effectiveness and ROI.',
    requiredFields: ['adSpend', 'adSpendGrowth', 'revenueGrowth', 'roi'],

    async evaluate(data) {
      const { adSpend, adSpendGrowth, revenueGrowth, roi, channel } = data;

      if (adSpendGrowth && revenueGrowth) {
        const efficiency = adSpendGrowth / (revenueGrowth || 0.01);

        if (efficiency > 2 && adSpendGrowth > 0.1) {
          return {
            triggered: true,
            evidence: {
              adSpend,
              adSpendGrowth: (adSpendGrowth * 100).toFixed(1),
              revenueGrowth: (revenueGrowth * 100).toFixed(1),
              efficiency: efficiency.toFixed(1),
              roi: roi ? (roi * 100).toFixed(1) : 'unknown',
              channel: channel || 'Overall advertising'
            },
            impact: {
              financialImpact: adSpend,
              description: `${channel || 'Advertising'} spend up ${(adSpendGrowth * 100).toFixed(1)}% but revenue up only ${(revenueGrowth * 100).toFixed(1)}% (${efficiency.toFixed(1)}x less efficient)`
            },
            urgency: 'MEDIUM_TERM',
            currentState: { adSpendGrowth, revenueGrowth },
            expectedImpact: 'Improved advertising ROI',
            risks: ['Wasted spend', 'Poor channel selection'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `${evidence.channel} spend increased ${evidence.adSpendGrowth}% but revenue only grew ${evidence.revenueGrowth}% (${evidence.efficiency}x less efficient).`;
      
      if (evidence.roi !== 'unknown') {
        recommendation += ` ROI: ${evidence.roi}%.`;
      }
      
      recommendation += ' Review campaign effectiveness, channel mix, and targeting. Consider pausing underperforming campaigns.';
      return recommendation;
    }
  },

  // ============================================================
  // RENT_LEASE_REVIEW
  // ============================================================
  {
    id: 'RENT_LEASE_REVIEW',
    type: DECISION_TYPES.RENT_LEASE_REVIEW,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Rent/Lease Review',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Rent/Lease Review Recommended',
    defaultSummary: 'Rent expense is high relative to revenue.',
    defaultRecommendation: 'Review lease terms and consider renegotiation.',
    requiredFields: ['rentExpense', 'revenue', 'industryAverage'],

    async evaluate(data) {
      const { rentExpense, revenue, industryAverage = 0.15 } = data;

      if (rentExpense && revenue && revenue > 0) {
        const rentToRevenue = rentExpense / revenue;

        if (rentToRevenue > 0.2) {
          const gap = rentToRevenue - industryAverage;

          return {
            triggered: true,
            evidence: {
              rentExpense,
              revenue,
              rentToRevenue: (rentToRevenue * 100).toFixed(1),
              industryAverage: (industryAverage * 100).toFixed(1),
              gap: (gap * 100).toFixed(1)
            },
            impact: {
              financialImpact: rentExpense - (revenue * industryAverage),
              description: `${(rentToRevenue * 100).toFixed(1)}% of revenue vs industry average ${(industryAverage * 100).toFixed(1)}%`
            },
            urgency: rentToRevenue > 0.3 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { rentToRevenue },
            expectedImpact: 'Reduced fixed costs',
            risks: ['Moving costs', 'Location change impact'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Rent is ${evidence.rentToRevenue}% of revenue (industry average: ${evidence.industryAverage}%, gap: ${evidence.gap}%). Review lease terms and consider renegotiating or evaluating alternative locations.`;
    }
  },

  // ============================================================
  // SALARY_COST_REVIEW
  // ============================================================
  {
    id: 'SALARY_COST_REVIEW',
    type: DECISION_TYPES.SALARY_COST_REVIEW,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Salary Cost Review',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Salary Cost Review Recommended',
    defaultSummary: 'Salary costs are growing faster than revenue.',
    defaultRecommendation: 'Review headcount and productivity.',
    requiredFields: ['salaryGrowth', 'revenueGrowth', 'salaryExpense'],

    async evaluate(data) {
      const { salaryGrowth, revenueGrowth, salaryExpense, revenue } = data;

      if (salaryGrowth !== undefined && revenueGrowth !== undefined) {
        const ratio = salaryGrowth / (revenueGrowth || 0.01);

        if (ratio > 1.5 && salaryGrowth > 0.05) {
          return {
            triggered: true,
            evidence: {
              salaryGrowth: (salaryGrowth * 100).toFixed(1),
              revenueGrowth: (revenueGrowth * 100).toFixed(1),
              ratio: ratio.toFixed(1),
              salaryExpense,
              revenue
            },
            impact: {
              financialImpact: salaryExpense * salaryGrowth,
              description: `Salary costs grew ${(salaryGrowth * 100).toFixed(1)}% vs ${(revenueGrowth * 100).toFixed(1)}% revenue growth`
            },
            urgency: ratio > 2 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { salaryGrowth, revenueGrowth },
            expectedImpact: 'Aligned labor costs with revenue',
            risks: ['Margin compression', 'Overstaffing'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Salary costs grew ${evidence.salaryGrowth}% compared to ${evidence.revenueGrowth}% revenue growth (${evidence.ratio}x faster). Review headcount, productivity, and compensation structure. Consider whether all positions are essential.`;
    }
  },

  // ============================================================
  // DISCRETIONARY_EXPENSE_REVIEW
  // ============================================================
  {
    id: 'DISCRETIONARY_EXPENSE_REVIEW',
    type: DECISION_TYPES.DISCRETIONARY_EXPENSE_REVIEW,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Discretionary Expense Review',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Discretionary Expense Review',
    defaultSummary: 'Discretionary spending is high relative to revenue.',
    defaultRecommendation: 'Review discretionary spending categories.',
    requiredFields: ['discretionarySpend', 'revenue'],

    async evaluate(data) {
      const { discretionarySpend, revenue } = data;

      if (discretionarySpend && revenue && revenue > 0) {
        const percentOfRevenue = discretionarySpend / revenue;

        if (percentOfRevenue > 0.15) {
          return {
            triggered: true,
            evidence: {
              discretionarySpend,
              revenue,
              percentOfRevenue: (percentOfRevenue * 100).toFixed(1)
            },
            impact: {
              financialImpact: discretionarySpend,
              description: `${(percentOfRevenue * 100).toFixed(1)}% of revenue in discretionary spending`
            },
            urgency: percentOfRevenue > 0.2 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { discretionarySpend, percentOfRevenue },
            expectedImpact: 'Reduced discretionary spend and improved margin',
            risks: ['May impact employee morale or business growth'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Discretionary spending is ${evidence.percentOfRevenue}% of revenue (₦${evidence.discretionarySpend.toLocaleString()}). Review categories like travel, entertainment, and non-essential services for potential savings.`;
    }
  },

  // ============================================================
  // COST_CONTROL_OPPORTUNITY
  // ============================================================
  {
    id: 'COST_CONTROL_OPPORTUNITY',
    type: DECISION_TYPES.COST_CONTROL_OPPORTUNITY,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Cost Control Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Cost Control Opportunity',
    defaultSummary: 'Expense category above industry average.',
    defaultRecommendation: 'Review category for cost optimization.',
    requiredFields: ['categoryExpense', 'categoryAverage', 'expenseCategory'],

    async evaluate(data) {
      const { categoryExpense, categoryAverage, expenseCategory } = data;

      if (categoryExpense && categoryAverage && categoryAverage > 0) {
        const ratio = categoryExpense / categoryAverage;

        if (ratio > 1.2) {
          const savings = categoryExpense - categoryAverage;
          const percentAbove = ((ratio - 1) * 100).toFixed(1);

          return {
            triggered: true,
            evidence: {
              categoryExpense,
              categoryAverage,
              expenseCategory: expenseCategory || 'Expense category',
              ratio: ratio.toFixed(1),
              percentAbove,
              savings
            },
            impact: {
              financialImpact: savings,
              description: `${expenseCategory || 'Expense'} is ${percentAbove}% above average (₦${categoryExpense.toLocaleString()} vs ₦${categoryAverage.toLocaleString()})`
            },
            urgency: 'MEDIUM_TERM',
            currentState: { categoryExpense, categoryAverage },
            expectedImpact: 'Reduced expenses and improved profitability',
            risks: ['May impact quality if cuts are too deep'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `${evidence.expenseCategory} is ₦${evidence.categoryExpense.toLocaleString()} (${evidence.percentAbove}% above average of ₦${evidence.categoryAverage.toLocaleString()}). Potential savings: ₦${evidence.savings.toLocaleString()}. Review this category for optimization opportunities.`;
    }
  },

  // ============================================================
  // FIXED_COST_WARNING
  // ============================================================
  {
    id: 'FIXED_COST_WARNING',
    type: DECISION_TYPES.FIXED_COST_WARNING,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Fixed Cost Warning',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Fixed Cost Warning',
    defaultSummary: 'Fixed costs represent a significant portion of revenue.',
    defaultRecommendation: 'Review fixed cost structure and reduce where possible.',
    requiredFields: ['fixedCosts', 'totalCosts', 'revenue'],

    async evaluate(data) {
      const { fixedCosts, totalCosts, revenue } = data;

      if (fixedCosts && revenue && revenue > 0) {
        const fixedToRevenue = fixedCosts / revenue;
        const fixedToTotal = totalCosts > 0 ? fixedCosts / totalCosts : 0;

        if (fixedToRevenue > 0.5) {
          const severity = fixedToRevenue > 0.6 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

          return {
            triggered: true,
            evidence: {
              fixedCosts,
              totalCosts,
              revenue,
              fixedToRevenue: (fixedToRevenue * 100).toFixed(1),
              fixedToTotal: (fixedToTotal * 100).toFixed(1)
            },
            impact: {
              financialImpact: fixedCosts,
              description: `${(fixedToRevenue * 100).toFixed(1)}% of revenue is fixed costs`
            },
            urgency: fixedToRevenue > 0.6 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { fixedToRevenue },
            expectedImpact: 'Reduced fixed cost burden',
            risks: ['Profit volatility', 'Break-even risk'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Fixed costs are ${evidence.fixedToRevenue}% of revenue (${evidence.fixedToTotal}% of total costs). High fixed costs create break-even risk. Review fixed cost categories (rent, salaries, insurance) for reduction opportunities. Consider variable cost alternatives where possible.`;
    }
  },

  // ============================================================
  // VARIABLE_COST_OPTIMIZATION
  // ============================================================
  {
    id: 'VARIABLE_COST_OPTIMIZATION',
    type: DECISION_TYPES.VARIABLE_COST_OPTIMIZATION,
    category: DECISION_CATEGORIES.EXPENSES,
    name: 'Variable Cost Optimization',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Variable Cost Optimization',
    defaultSummary: 'Variable costs are rising faster than sales volume.',
    defaultRecommendation: 'Review variable cost drivers and efficiency.',
    requiredFields: ['variableCostGrowth', 'volumeGrowth', 'variableCosts'],

    async evaluate(data) {
      const { variableCostGrowth, volumeGrowth, variableCosts } = data;

      if (variableCostGrowth !== undefined && volumeGrowth !== undefined) {
        const ratio = variableCostGrowth / (volumeGrowth || 0.01);

        if (ratio > 1.2 && variableCostGrowth > 0.03) {
          return {
            triggered: true,
            evidence: {
              variableCostGrowth: (variableCostGrowth * 100).toFixed(1),
              volumeGrowth: (volumeGrowth * 100).toFixed(1),
              ratio: ratio.toFixed(1),
              variableCosts
            },
            impact: {
              financialImpact: variableCosts * variableCostGrowth,
              description: `Variable costs up ${(variableCostGrowth * 100).toFixed(1)}% vs ${(volumeGrowth * 100).toFixed(1)}% volume growth`
            },
            urgency: ratio > 1.5 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { variableCostGrowth, volumeGrowth },
            expectedImpact: 'Improved cost efficiency',
            risks: ['Margin compression'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Variable costs grew ${evidence.variableCostGrowth}% while volume grew ${evidence.volumeGrowth}% (${evidence.ratio}x faster). Review supplier pricing, production efficiency, and waste reduction opportunities.`;
    }
  }
];

module.exports = expenseRules;