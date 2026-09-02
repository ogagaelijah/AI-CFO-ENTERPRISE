'use strict';

/**
 * Profitability Decision Rules
 * Path: src/application/services/decision/rules/profitabilityRules.js
 * SSOT: DecisionContracts
 * @version 1.2.0-prod
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
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

// ─── rules ───────────────────────────────────────────────────
const profitabilityRules = Object.freeze([
  // ============================================================
  // GROSS_MARGIN_DECLINE
  // ============================================================
  Object.freeze({
    id: 'GROSS_MARGIN_DECLINE',
    type: DECISION_TYPES.GROSS_MARGIN_DECLINE,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Gross Margin Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Gross Margin Declining',
    defaultSummary: 'Gross margin has dropped by more than 5%.',
    defaultRecommendation: 'Review pricing and cost of goods sold immediately.',
    requiredFields: Object.freeze([
      'currentGrossMargin',
      'previousGrossMargin',
      'revenue',
      'cogs',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentGrossMargin = toNumber(data.currentGrossMargin);
      const previousGrossMargin = toNumber(data.previousGrossMargin);
      const revenue = toNumber(data.revenue);
      const cogs = toNumber(data.cogs);
      const productName = data.productName || 'Overall Business';
      const productId = data.productId || 'unknown';

      if (previousGrossMargin > 0) {
        const decline = previousGrossMargin - currentGrossMargin;
        const declinePercent = (decline / previousGrossMargin) * 100;

        if (decline > 0.05) {
          const severity =
            decline > 0.1
              ? DECISION_SEVERITY.CRITICAL
              : DECISION_SEVERITY.WARNING;
          const urgency =
            decline > 0.08
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM;

          return Object.freeze({
            triggered: true,
            severity,
            evidence: Object.freeze({
              currentGrossMargin: pct(currentGrossMargin),
              previousGrossMargin: pct(previousGrossMargin),
              decline: pct(decline),
              declinePercent: declinePercent.toFixed(1),
              revenue,
              cogs,
              productName,
              productId,
            }),
            impact: Object.freeze({
              financialImpact: revenue * decline,
              description: `Gross margin declined ${pct(
                decline
              )}% (${declinePercent.toFixed(1)}% drop)`,
            }),
            urgency,
            currentState: Object.freeze({
              currentGrossMargin,
              previousGrossMargin,
            }),
            expectedImpact: 'Restored gross margin levels',
            risks: Object.freeze([
              'Continued margin erosion',
              'Profitability decline',
            ]),
            relatedEntity:
              productId !== 'unknown'
                ? DECISION_ENTITY.PRODUCT
                : DECISION_ENTITY.BUSINESS,
            relatedEntityId: productId !== 'unknown' ? productId : 'global',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      if (evidence.productName && evidence.productName !== 'Overall Business') {
        return `${evidence.productName} gross margin declined from ${evidence.previousGrossMargin}% to ${evidence.currentGrossMargin}% (${evidence.declinePercent}% drop). Review pricing, supplier costs, and production efficiency.`;
      }
      return `Overall gross margin declined from ${evidence.previousGrossMargin}% to ${evidence.currentGrossMargin}% (${evidence.declinePercent}% drop). Review pricing strategy and supplier costs.`;
    },
  }),

  // ============================================================
  // NET_PROFIT_DECLINE
  // ============================================================
  Object.freeze({
    id: 'NET_PROFIT_DECLINE',
    type: DECISION_TYPES.NET_PROFIT_DECLINE,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Net Profit Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Net Profit Declining',
    defaultSummary: 'Net profit has decreased significantly.',
    defaultRecommendation: 'Analyze expense growth and operational efficiency.',
    requiredFields: Object.freeze([
      'currentProfit',
      'previousProfit',
      'revenue',
      'expenses',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentProfit = toNumber(data.currentProfit);
      const previousProfit = toNumber(data.previousProfit);
      const revenue = toNumber(data.revenue);
      const expenses = toNumber(data.expenses);
      const revenueGrowth =
        data.revenueGrowth != null ? toNumber(data.revenueGrowth) : null;

      if (previousProfit > 0) {
        const profitDecline =
          (previousProfit - currentProfit) / previousProfit;

        if (profitDecline > 0.2) {
          const severity =
            profitDecline > 0.4
              ? DECISION_SEVERITY.CRITICAL
              : DECISION_SEVERITY.WARNING;
          const urgency =
            profitDecline > 0.3
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM;

          return Object.freeze({
            triggered: true,
            severity,
            evidence: Object.freeze({
              currentProfit,
              previousProfit,
              profitDecline: (profitDecline * 100).toFixed(1),
              revenue,
              expenses,
              revenueGrowth: revenueGrowth != null ? pct(revenueGrowth) : 'unknown', // FIXED: removed stray 'revenue' line
            }),
            impact: Object.freeze({
              financialImpact: previousProfit - currentProfit,
              description: `Profit declined by ${(profitDecline * 100).toFixed(
                1
              )}%`,
            }),
            urgency,
            currentState: Object.freeze({ currentProfit, previousProfit }),
            expectedImpact: 'Restored profitability and efficiency',
            risks: Object.freeze([
              'Continued profit decline',
              'Cash flow pressure',
            ]),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `Net profit declined ${
        evidence.profitDecline
      }% (from ${NGN.format(evidence.previousProfit)} to ${NGN.format(
        evidence.currentProfit
      )}).`;
      if (evidence.revenueGrowth !== 'unknown') {
        recommendation += ` Revenue grew ${evidence.revenueGrowth}% during this period.`;
      }
      recommendation +=
        ' Review expense categories and operational efficiency to identify the cause.';
      return recommendation;
    },
  }),

  // ============================================================
  // REVENUE_GROWTH_PROFIT_DECLINE
  // ============================================================
  Object.freeze({
    id: 'REVENUE_GROWTH_PROFIT_DECLINE',
    type: DECISION_TYPES.REVENUE_GROWTH_PROFIT_DECLINE,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Revenue Growth, Profit Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Revenue Growing but Profit Falling',
    defaultSummary: 'Revenue is increasing but profit is declining.',
    defaultRecommendation: 'Review cost structure and pricing strategy.',
    requiredFields: Object.freeze([
      'revenueGrowth',
      'profitGrowth',
      'revenue',
      'profit',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const revenueGrowth = toNumber(data.revenueGrowth);
      const profitGrowth = toNumber(data.profitGrowth);
      const revenue = toNumber(data.revenue);
      const profit = toNumber(data.profit);
      const period = data.period || 'month';

      if (revenueGrowth > 0.05 && profitGrowth < -0.05) {
        const gap = revenueGrowth - profitGrowth;

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.WARNING,
          evidence: Object.freeze({
            revenueGrowth: pct(revenueGrowth),
            profitGrowth: pct(profitGrowth),
            gap: pct(gap),
            revenue,
            profit,
            period,
          }),
          impact: Object.freeze({
            financialImpact: profit,
            description: `Revenue up ${pct(
              revenueGrowth
            )}% but profit down ${Math.abs(profitGrowth * 100).toFixed(1)}%`,
          }),
          urgency: DECISION_TIMEFRAME.SHORT_TERM,
          currentState: Object.freeze({ revenueGrowth, profitGrowth }),
          expectedImpact: 'Aligned revenue and profit growth',
          risks: Object.freeze(['Margin erosion', 'Inefficient operations']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Revenue grew ${evidence.revenueGrowth}% but profit declined ${evidence.profitGrowth}% (gap: ${evidence.gap}%). This suggests costs are growing faster than revenue. Review expense categories, pricing, and operational efficiency.`;
    },
  }),

  // ============================================================
  // PRODUCT_PROFITABILITY_ALERT
  // ============================================================
  Object.freeze({
    id: 'PRODUCT_PROFITABILITY_ALERT',
    type: DECISION_TYPES.PRODUCT_PROFITABILITY_ALERT,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Product Profitability Alert',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 65,
    defaultTitle: 'Product Below Average Margin',
    defaultSummary: 'Product margin is below the business average.',
    defaultRecommendation: 'Review product pricing and cost structure.',
    requiredFields: Object.freeze([
      'productMargin',
      'averageMargin',
      'productName',
      'productRevenue',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const productMargin = toNumber(data.productMargin);
      const averageMargin = toNumber(data.averageMargin);
      const productRevenue = toNumber(data.productRevenue);
      const productName = data.productName || 'Item';
      const productId = data.productId || 'unknown';

      if (averageMargin > 0 && productMargin >= 0) {
        const gap = averageMargin - productMargin;
        const gapPercent = (gap / averageMargin) * 100;

        if (gap > 0.05 && gapPercent > 20) {
          const urgency =
            gapPercent > 40
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              productMargin: pct(productMargin),
              averageMargin: pct(averageMargin),
              gap: pct(gap),
              gapPercent: gapPercent.toFixed(1),
              productName,
              productRevenue,
            }),
            impact: Object.freeze({
              financialImpact:
                productRevenue > 0 ? productRevenue * gap : null,
              description: `${productName} margin ${pct(
                gap
              )}% below average (${gapPercent.toFixed(1)}% less)`,
            }),
            urgency,
            currentState: Object.freeze({ productMargin, averageMargin }),
            expectedImpact: 'Improved product profitability',
            risks: Object.freeze(['Continued underperformance']),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: productId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const name = evidence.productName || 'This product';
      return `${name} margin (${evidence.productMargin}%) is ${evidence.gap}% below the business average (${evidence.averageMargin}%). Review pricing, costs, and sales volume. Consider whether this product should be promoted, improved, or discontinued.`;
    },
  }),

  // ============================================================
  // MARGIN_IMPROVEMENT_OPPORTUNITY
  // ============================================================
  Object.freeze({
    id: 'MARGIN_IMPROVEMENT_OPPORTUNITY',
    type: DECISION_TYPES.MARGIN_IMPROVEMENT_OPPORTUNITY,
    category: DECISION_CATEGORIES.PROFITABILITY,
    name: 'Margin Improvement Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Margin Improvement Opportunity',
    defaultSummary: 'Margins are trending upward.',
    defaultRecommendation: 'Identify and replicate success factors.',
    requiredFields: Object.freeze([
      'marginTrend',
      'currentMargin',
      'previousMargin',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const marginTrend = toNumber(data.marginTrend);
      const currentMargin = toNumber(data.currentMargin);
      const previousMargin = toNumber(data.previousMargin);
      const period = data.period || 'month';

      if (marginTrend > 0.02) {
        const improvement = currentMargin - previousMargin;

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.OPPORTUNITY,
          evidence: Object.freeze({
            marginTrend: pct(marginTrend),
            currentMargin: pct(currentMargin),
            previousMargin: pct(previousMargin),
            improvement: pct(improvement),
            period,
          }),
          impact: Object.freeze({
            financialImpact: null,
            description: `Margin improving at ${pct(
              marginTrend
            )}% per ${period}`,
          }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ marginTrend, currentMargin }),
          expectedImpact: 'Continued margin improvement',
          risks: Object.freeze(['Trend may not be sustainable']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Margins are trending upward (${evidence.marginTrend}% per ${evidence.period}) from ${evidence.previousMargin}% to ${evidence.currentMargin}%. Identify what's driving this improvement and replicate across other products or areas.`;
    },
  }),
]);

module.exports = profitabilityRules;