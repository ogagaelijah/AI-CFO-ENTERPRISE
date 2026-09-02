/**
 * Working Capital Decision Rules
 * 
 * Detects working capital issues and optimization opportunities
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
 * Working Capital Rule Definitions
 */
const workingCapitalRules = [
  // ============================================================
  // WORKING_CAPITAL_PRESSURE
  // ============================================================
  {
    id: 'WORKING_CAPITAL_PRESSURE',
    type: DECISION_TYPES.WORKING_CAPITAL_PRESSURE,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Working Capital Pressure',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Working Capital Pressure Detected',
    defaultSummary: 'Receivables and inventory are high while cash is declining.',
    defaultRecommendation: 'Prioritize collections and review inventory.',
    requiredFields: ['receivables', 'inventory', 'cash', 'trend'],

    async evaluate(data) {
      const { receivables, inventory, cash, trend, period = 'month' } = data;

      // Calculate working capital pressure
      const workingCapital = cash + receivables + inventory;
      const pressure = (receivables + inventory) / workingCapital;

      if (pressure > 0.7 && cash < 0 && trend < 0) {
        return {
          triggered: true,
          evidence: {
            receivables,
            inventory,
            cash,
            workingCapital,
            pressure: (pressure * 100).toFixed(1),
            trend: trend ? (trend * 100).toFixed(1) : 'unknown'
          },
          impact: {
            financialImpact: workingCapital,
            description: `${(pressure * 100).toFixed(1)}% of working capital in receivables + inventory`
          },
          urgency: 'SHORT_TERM',
          currentState: { receivables, inventory, cash },
          expectedImpact: 'Improved cash position and working capital',
          risks: ['Cash crisis', 'Liquidity pressure'],
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Working capital pressure detected: ${evidence.pressure}% of working capital (₦${evidence.workingCapital.toLocaleString()}) is in receivables (₦${evidence.receivables.toLocaleString()}) and inventory (₦${evidence.inventory.toLocaleString()}) with cash declining ${evidence.trend}%. Prioritize collections and review inventory levels.`;
    }
  },

  // ============================================================
  // WORKING_CAPITAL_OPTIMIZATION
  // ============================================================
  {
    id: 'WORKING_CAPITAL_OPTIMIZATION',
    type: DECISION_TYPES.WORKING_CAPITAL_OPTIMIZATION,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Working Capital Optimization',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Working Capital Optimization Opportunity',
    defaultSummary: 'Receivables are high while payables are low.',
    defaultRecommendation: 'Optimize working capital structure.',
    requiredFields: ['receivables', 'payables', 'inventory', 'cash'],

    async evaluate(data) {
      const { receivables, payables, inventory, cash } = data;

      if (receivables > 0 && payables > 0) {
        const workingCapital = cash + receivables + inventory - payables;
        const ratio = receivables / payables;

        if (ratio > 2) {
          return {
            triggered: true,
            evidence: {
              receivables,
              payables,
              inventory,
              cash,
              workingCapital,
              ratio: ratio.toFixed(1)
            },
            impact: {
              financialImpact: receivables - payables,
              description: `Receivables are ${ratio.toFixed(1)}x higher than payables`
            },
            urgency: 'MEDIUM_TERM',
            currentState: { receivables, payables, ratio },
            expectedImpact: 'Optimized working capital',
            risks: ['Supplier relationship strain'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Receivables (₦${evidence.receivables.toLocaleString()}) are ${evidence.ratio}x higher than payables (₦${evidence.payables.toLocaleString()}). Consider optimizing working capital by accelerating collections and negotiating extended payment terms with suppliers.`;
    }
  },

  // ============================================================
  // CASH_CONVERSION_CYCLE_LENGTHENING
  // ============================================================
  {
    id: 'CASH_CONVERSION_CYCLE_LENGTHENING',
    type: DECISION_TYPES.CASH_CONVERSION_CYCLE_LENGTHENING,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Cash Conversion Cycle Lengthening',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Cash Conversion Cycle Lengthening',
    defaultSummary: 'Cash conversion cycle is increasing over time.',
    defaultRecommendation: 'Review receivables and inventory management.',
    requiredFields: ['cccHistory', 'currentCCC', 'periods'],

    async evaluate(data) {
      const { cccHistory, currentCCC, periods = 3 } = data;

      if (!cccHistory || cccHistory.length < periods) {
        return { triggered: false };
      }

      const lastN = cccHistory.slice(-periods);
      let isIncreasing = true;
      for (let i = 1; i < lastN.length; i++) {
        if (lastN[i].value <= lastN[i - 1].value) {
          isIncreasing = false;
          break;
        }
      }

      if (isIncreasing) {
        const firstValue = lastN[0].value;
        const lastValue = lastN[lastN.length - 1].value;
        const increase = lastValue - firstValue;

        if (increase > 10) {
          return {
            triggered: true,
            evidence: {
              periods,
              firstCCC: firstValue,
              currentCCC: lastValue,
              increase: increase.toFixed(1),
              change: 'lengthening'
            },
            impact: {
              financialImpact: null,
              description: `Cash conversion cycle increased by ${increase.toFixed(1)} days over ${periods} periods`
            },
            urgency: increase > 15 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { currentCCC, increase },
            expectedImpact: 'Shortened cash conversion cycle',
            risks: ['Working capital pressure', 'Liquidity risk'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Cash conversion cycle increased by ${evidence.increase} days over ${evidence.periods} periods (from ${evidence.firstCCC} to ${evidence.currentCCC} days). Review receivables collection and inventory management to reverse this trend.`;
    }
  },

  // ============================================================
  // LIQUIDITY_RISK
  // ============================================================
  {
    id: 'LIQUIDITY_RISK',
    type: DECISION_TYPES.LIQUIDITY_RISK,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Liquidity Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Liquidity Risk Detected',
    defaultSummary: 'Current ratio is below healthy threshold.',
    defaultRecommendation: 'Improve liquidity position immediately.',
    requiredFields: ['currentAssets', 'currentLiabilities'],

    async evaluate(data) {
      const { currentAssets, currentLiabilities } = data;

      if (currentAssets && currentLiabilities && currentLiabilities > 0) {
        const currentRatio = currentAssets / currentLiabilities;

        if (currentRatio < 1.2) {
          const severity = currentRatio < 1.0 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;
          const urgency = currentRatio < 1.0 ? 'IMMEDIATE' : 'SHORT_TERM';

          return {
            triggered: true,
            evidence: {
              currentAssets,
              currentLiabilities,
              currentRatio: currentRatio.toFixed(2),
              shortfall: Math.max(0, currentLiabilities * 1.2 - currentAssets)
            },
            impact: {
              financialImpact: currentLiabilities - currentAssets,
              description: `Current ratio of ${currentRatio.toFixed(2)} (below 1.2 threshold)`
            },
            urgency,
            currentState: { currentAssets, currentLiabilities },
            expectedImpact: 'Improved liquidity position',
            risks: ['Inability to meet short-term obligations', 'Business disruption'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const urgency = evidence.currentRatio < 1.0 ? '🚨 CRITICAL: ' : '⚠️ ';
      
      return `${urgency}Current ratio is ${evidence.currentRatio} (below healthy threshold of 1.2). Assets: ₦${evidence.currentAssets.toLocaleString()}, Liabilities: ₦${evidence.currentLiabilities.toLocaleString()}. Immediate actions: accelerate collections, reduce inventory, and review short-term debt.`;
    }
  },

  // ============================================================
  // QUICK_RATIO_WARNING
  // ============================================================
  {
    id: 'QUICK_RATIO_WARNING',
    type: DECISION_TYPES.QUICK_RATIO_WARNING,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Quick Ratio Warning',
    severity: DECISION_SEVERITY.CRITICAL,
    minConfidence: 75,
    defaultTitle: '🚨 CRITICAL: Quick Ratio Warning',
    defaultSummary: 'Quick ratio is dangerously low.',
    defaultRecommendation: 'Immediate liquidity actions required.',
    requiredFields: ['cash', 'receivables', 'currentLiabilities'],

    async evaluate(data) {
      const { cash, receivables, currentLiabilities } = data;

      if (currentLiabilities && currentLiabilities > 0) {
        const quickAssets = (cash || 0) + (receivables || 0);
        const quickRatio = quickAssets / currentLiabilities;

        if (quickRatio < 0.8) {
          return {
            triggered: true,
            evidence: {
              cash,
              receivables,
              quickAssets,
              currentLiabilities,
              quickRatio: quickRatio.toFixed(2),
              shortfall: Math.max(0, currentLiabilities * 0.8 - quickAssets)
            },
            impact: {
              financialImpact: quickAssets,
              description: `Quick ratio of ${quickRatio.toFixed(2)} (below 0.8 threshold)`
            },
            urgency: 'IMMEDIATE',
            currentState: { cash, receivables, quickRatio },
            expectedImpact: 'Improved immediate liquidity',
            risks: ['Inability to meet urgent obligations'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `🚨 CRITICAL: Quick ratio is ${evidence.quickRatio} (below 0.8 threshold). Liquid assets (cash + receivables) are ₦${evidence.quickAssets.toLocaleString()} vs current liabilities of ₦${evidence.currentLiabilities.toLocaleString()}. Immediate actions: accelerate collections and secure emergency financing if needed.`;
    }
  },

  // ============================================================
  // OPERATING_LEVERAGE_RISK
  // ============================================================
  {
    id: 'OPERATING_LEVERAGE_RISK',
    type: DECISION_TYPES.OPERATING_LEVERAGE_RISK,
    category: DECISION_CATEGORIES.WORKING_CAPITAL,
    name: 'Operating Leverage Risk',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Operating Leverage Risk',
    defaultSummary: 'Fixed costs represent a high portion of total costs.',
    defaultRecommendation: 'Review fixed cost structure.',
    requiredFields: ['fixedCosts', 'totalCosts', 'revenue'],

    async evaluate(data) {
      const { fixedCosts, totalCosts, revenue } = data;

      if (fixedCosts && totalCosts && totalCosts > 0) {
        const fixedPercentage = (fixedCosts / totalCosts) * 100;

        if (fixedPercentage > 60) {
          const breakEvenRevenue = totalCosts / (1 - (fixedCosts / totalCosts));
          const currentMargin = revenue > 0 ? (revenue - totalCosts) / revenue : 0;

          return {
            triggered: true,
            evidence: {
              fixedCosts,
              totalCosts,
              fixedPercentage: fixedPercentage.toFixed(1),
              breakEvenRevenue,
              currentMargin: currentMargin ? (currentMargin * 100).toFixed(1) : 'unknown',
              revenue
            },
            impact: {
              financialImpact: fixedCosts,
              description: `${fixedPercentage.toFixed(1)}% of costs are fixed`
            },
            urgency: fixedPercentage > 75 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { fixedPercentage },
            expectedImpact: 'Reduced operating leverage risk',
            risks: ['Profit volatility', 'Break-even risk'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `Fixed costs are ${evidence.fixedPercentage}% of total costs.`;
      
      if (evidence.breakEvenRevenue) {
        recommendation += ` Break-even revenue: ₦${evidence.breakEvenRevenue.toLocaleString()}.`;
      }
      
      if (evidence.currentMargin !== 'unknown') {
        recommendation += ` Current margin: ${evidence.currentMargin}%.`;
      }
      
      recommendation += ' Consider converting fixed costs to variable costs where possible to reduce risk.';
      return recommendation;
    }
  }
];

module.exports = workingCapitalRules;