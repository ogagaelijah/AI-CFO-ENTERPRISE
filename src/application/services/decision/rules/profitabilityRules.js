/**
 * Profitability Decision Rules
 * 
 * Detects profitability issues and opportunities
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
 * Profitability Rule Definitions
 */
const profitabilityRules = [
  // ============================================================
  // GROSS_MARGIN_DECLINE
  // ============================================================
  {
    id: 'GROSS_MARGIN_DECLINE',
    type: DECISION_TYPES.GROSS_MARGIN_DECLINE,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Gross Margin Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Gross Margin Declining',
    defaultSummary: 'Gross margin has dropped by more than 5%.',
    defaultRecommendation: 'Review pricing and cost of goods sold immediately.',
    requiredFields: ['currentGrossMargin', 'previousGrossMargin', 'revenue', 'cogs'],

    async evaluate(data) {
      const { currentGrossMargin, previousGrossMargin, revenue, cogs, productId, productName } = data;

      if (previousGrossMargin) {
        const decline = previousGrossMargin - currentGrossMargin;
        const declinePercent = (decline / previousGrossMargin) * 100;

        if (decline > 0.05) {
          const severity = decline > 0.10 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;
          const urgency = decline > 0.08 ? 'SHORT_TERM' : 'MEDIUM_TERM';

          return {
            triggered: true,
            evidence: {
              currentGrossMargin: (currentGrossMargin * 100).toFixed(1),
              previousGrossMargin: (previousGrossMargin * 100).toFixed(1),
              decline: (decline * 100).toFixed(1),
              declinePercent: declinePercent.toFixed(1),
              revenue,
              cogs,
              productName: productName || 'Overall Business'
            },
            impact: {
              financialImpact: revenue * decline,
              description: `Gross margin declined ${(decline * 100).toFixed(1)}% (${declinePercent.toFixed(1)}% drop)`
            },
            urgency,
            currentState: { currentGrossMargin, previousGrossMargin },
            expectedImpact: 'Restored gross margin levels',
            risks: ['Continued margin erosion', 'Profitability decline'],
            relatedEntity: productId ? 'PRODUCT' : 'BUSINESS',
            relatedEntityId: productId || '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      if (evidence.productName && evidence.productName !== 'Overall Business') {
        return `${evidence.productName} gross margin declined from ${evidence.previousGrossMargin}% to ${evidence.currentGrossMargin}% (${evidence.declinePercent}% drop). Review pricing, supplier costs, and production efficiency.`;
      }
      return `Overall gross margin declined from ${evidence.previousGrossMargin}% to ${evidence.currentGrossMargin}% (${evidence.declinePercent}% drop). Review pricing strategy and supplier costs.`;
    }
  },

  // ============================================================
  // NET_PROFIT_DECLINE
  // ============================================================
  {
    id: 'NET_PROFIT_DECLINE',
    type: DECISION_TYPES.NET_PROFIT_DECLINE,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Net Profit Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Net Profit Declining',
    defaultSummary: 'Net profit has decreased significantly.',
    defaultRecommendation: 'Analyze expense growth and operational efficiency.',
    requiredFields: ['currentProfit', 'previousProfit', 'revenue', 'expenses'],

    async evaluate(data) {
      const { currentProfit, previousProfit, revenue, expenses, revenueGrowth } = data;

      if (previousProfit > 0) {
        const profitDecline = (previousProfit - currentProfit) / previousProfit;

        if (profitDecline > 0.2) {
          const severity = profitDecline > 0.4 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

          return {
            triggered: true,
            evidence: {
              currentProfit,
              previousProfit,
              profitDecline: (profitDecline * 100).toFixed(1),
              revenue,
              expenses,
              revenueGrowth: revenueGrowth ? (revenueGrowth * 100).toFixed(1) : 'unknown'
            },
            impact: {
              financialImpact: previousProfit - currentProfit,
              description: `Profit declined by ${(profitDecline * 100).toFixed(1)}%`
            },
            urgency: profitDecline > 0.3 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { currentProfit, previousProfit },
            expectedImpact: 'Restored profitability and efficiency',
            risks: ['Continued profit decline', 'Cash flow pressure'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `Net profit declined ${evidence.profitDecline}% (from ₦${evidence.previousProfit.toLocaleString()} to ₦${evidence.currentProfit.toLocaleString()}).`;
      
      if (evidence.revenueGrowth !== 'unknown') {
        recommendation += ` Revenue grew ${evidence.revenueGrowth}% during this period.`;
      }
      
      recommendation += ' Review expense categories and operational efficiency to identify the cause.';
      return recommendation;
    }
  },

  // ============================================================
  // REVENUE_GROWTH_PROFIT_DECLINE
  // ============================================================
  {
    id: 'REVENUE_GROWTH_PROFIT_DECLINE',
    type: DECISION_TYPES.REVENUE_GROWTH_PROFIT_DECLINE,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Revenue Growth, Profit Decline',
    severity: DECISION_SEVERITY.HIGH,
    minConfidence: 75,
    defaultTitle: 'Revenue Growing but Profit Falling',
    defaultSummary: 'Revenue is increasing but profit is declining.',
    defaultRecommendation: 'Review cost structure and pricing strategy.',
    requiredFields: ['revenueGrowth', 'profitGrowth', 'revenue', 'profit'],

    async evaluate(data) {
      const { revenueGrowth, profitGrowth, revenue, profit, period = 'month' } = data;

      // Revenue is growing (> 5%) but profit is declining (< -5%)
      if (revenueGrowth > 0.05 && profitGrowth < -0.05) {
        const gap = revenueGrowth - profitGrowth;

        return {
          triggered: true,
          evidence: {
            revenueGrowth: (revenueGrowth * 100).toFixed(1),
            profitGrowth: (profitGrowth * 100).toFixed(1),
            gap: (gap * 100).toFixed(1),
            revenue,
            profit,
            period
          },
          impact: {
            financialImpact: profit,
            description: `Revenue up ${(revenueGrowth * 100).toFixed(1)}% but profit down ${(profitGrowth * 100).toFixed(1)}%`
          },
          urgency: 'HIGH',
          currentState: { revenueGrowth, profitGrowth },
          expectedImpact: 'Aligned revenue and profit growth',
          risks: ['Margin erosion', 'Inefficient operations'],
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Revenue grew ${evidence.revenueGrowth}% but profit declined ${evidence.profitGrowth}% (gap: ${evidence.gap}%). This suggests costs are growing faster than revenue. Review expense categories, pricing, and operational efficiency.`;
    }
  },

  // ============================================================
  // PRODUCT_PROFITABILITY_ALERT
  // ============================================================
  {
    id: 'PRODUCT_PROFITABILITY_ALERT',
    type: DECISION_TYPES.PRODUCT_PROFITABILITY_ALERT,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Product Profitability Alert',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 65,
    defaultTitle: 'Product Below Average Margin',
    defaultSummary: 'Product margin is below the business average.',
    defaultRecommendation: 'Review product pricing and cost structure.',
    requiredFields: ['productMargin', 'averageMargin', 'productName', 'productRevenue'],

    async evaluate(data) {
      const { productMargin, averageMargin, productName, productId, productRevenue } = data;

      if (averageMargin && productMargin) {
        const gap = averageMargin - productMargin;
        const gapPercent = averageMargin > 0 ? (gap / averageMargin) * 100 : 0;

        if (gap > 0.05 && gapPercent > 20) {
          return {
            triggered: true,
            evidence: {
              productMargin: (productMargin * 100).toFixed(1),
              averageMargin: (averageMargin * 100).toFixed(1),
              gap: (gap * 100).toFixed(1),
              gapPercent: gapPercent.toFixed(1),
              productName: productName || 'Item',
              productRevenue
            },
            impact: {
              financialImpact: productRevenue ? productRevenue * gap : null,
              description: `${productName || 'Product'} margin ${(gap * 100).toFixed(1)}% below average (${gapPercent.toFixed(1)}% less)`
            },
            urgency: gapPercent > 40 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { productMargin, averageMargin },
            expectedImpact: 'Improved product profitability',
            risks: ['Continued underperformance'],
            relatedEntity: 'PRODUCT',
            relatedEntityId: productId || 'unknown'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const name = evidence.productName || 'This product';
      return `${name} margin (${evidence.productMargin}%) is ${evidence.gap}% below the business average (${evidence.averageMargin}%). Review pricing, costs, and sales volume. Consider whether this product should be promoted, improved, or discontinued.`;
    }
  },

  // ============================================================
  // MARGIN_IMPROVEMENT_OPPORTUNITY
  // ============================================================
  {
    id: 'MARGIN_IMPROVEMENT_OPPORTUNITY',
    type: DECISION_TYPES.MARGIN_IMPROVEMENT_OPPORTUNITY,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Margin Improvement Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Margin Improvement Opportunity',
    defaultSummary: 'Margins are trending upward.',
    defaultRecommendation: 'Identify and replicate success factors.',
    requiredFields: ['marginTrend', 'currentMargin', 'previousMargin'],

    async evaluate(data) {
      const { marginTrend, currentMargin, previousMargin, period = 'month' } = data;

      if (marginTrend > 0.02) {
        const improvement = currentMargin - previousMargin;

        return {
          triggered: true,
          evidence: {
            marginTrend: (marginTrend * 100).toFixed(1),
            currentMargin: (currentMargin * 100).toFixed(1),
            previousMargin: (previousMargin * 100).toFixed(1),
            improvement: (improvement * 100).toFixed(1),
            period
          },
          impact: {
            financialImpact: null,
            description: `Margin improving at ${(marginTrend * 100).toFixed(1)}% per ${period}`
          },
          urgency: 'MEDIUM_TERM',
          currentState: { marginTrend, currentMargin },
          expectedImpact: 'Continued margin improvement',
          risks: ['Trend may not be sustainable'],
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Margins are trending upward (${evidence.marginTrend}% per ${evidence.period}) from ${evidence.previousMargin}% to ${evidence.currentMargin}%. Identify what's driving this improvement and replicate across other products or areas.`;
    }
  }
];

module.exports = profitabilityRules;