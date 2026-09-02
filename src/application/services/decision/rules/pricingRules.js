'use strict';

/**
 * Pricing Decision Rules
 * Path: src/application/services/decision/rules/pricingRules.js
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
const pricingRules = Object.freeze([
  // ============================================================
  // MARGIN_COMPRESSION
  // ============================================================
  Object.freeze({
    id: 'MARGIN_COMPRESSION',
    type: DECISION_TYPES.MARGIN_COMPRESSION,
    category: DECISION_CATEGORIES.PRICING,
    name: 'Margin Compression',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Margin Compression Detected',
    defaultSummary: 'Gross margin has decreased significantly.',
    defaultRecommendation: 'Review pricing and product-level cost changes.',
    requiredFields: Object.freeze([
      'currentMargin',
      'previousMargin',
      'revenue',
      'costOfGoodsSold',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentMargin = toNumber(data.currentMargin);
      const previousMargin = toNumber(data.previousMargin);
      const revenue = toNumber(data.revenue);
      const costOfGoodsSold = toNumber(data.costOfGoodsSold);
      const productName = data.productName || 'Overall Business';
      const productId = data.productId || 'unknown';

      const marginDecline = previousMargin - currentMargin;
      const declinePercentage =
        previousMargin > 0 ? (marginDecline / previousMargin) * 100 : 0;

      if (declinePercentage > 20 && marginDecline > 0.05) {
        const severity =
          declinePercentage > 40
            ? DECISION_SEVERITY.CRITICAL
            : DECISION_SEVERITY.WARNING;
        const urgency =
          declinePercentage > 30
            ? DECISION_TIMEFRAME.SHORT_TERM
            : DECISION_TIMEFRAME.MEDIUM_TERM;

        return Object.freeze({
          triggered: true,
          severity,
          evidence: Object.freeze({
            currentMargin: pct(currentMargin),
            previousMargin: pct(previousMargin),
            marginDecline: pct(marginDecline),
            declinePercentage: declinePercentage.toFixed(1),
            revenue,
            costOfGoodsSold,
            productName,
            productId,
          }),
          impact: Object.freeze({
            financialImpact: revenue * marginDecline,
            description: `Margin declined from ${pct(
              previousMargin
            )}% to ${pct(currentMargin)}%`,
          }),
          urgency,
          currentState: Object.freeze({
            currentMargin,
            previousMargin,
            revenue,
          }),
          expectedImpact: 'Restored profitability',
          risks: Object.freeze([
            'Continued margin erosion',
            'Loss of competitive position',
          ]),
          relatedEntity:
            productId !== 'unknown'
              ? DECISION_ENTITY.PRODUCT
              : DECISION_ENTITY.BUSINESS,
          relatedEntityId: productId,
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      if (evidence.productName && evidence.productName !== 'Overall Business') {
        return `Review pricing for ${evidence.productName}. Margin declined from ${evidence.previousMargin}% to ${evidence.currentMargin}% (${evidence.declinePercentage}% drop). Consider adjusting selling price or finding lower-cost suppliers.`;
      }
      return `Overall margin declined from ${evidence.previousMargin}% to ${evidence.currentMargin}% (${evidence.declinePercentage}% drop). Review overall pricing strategy and supplier costs across the business.`;
    },

    alternatives: Object.freeze([
      'Renegotiate supplier pricing',
      'Review product mix',
      'Consider value-added services to justify price',
    ]),
    assumptions: Object.freeze([
      'Cost increases are the primary driver',
      'Market can absorb some price adjustment',
    ]),
  }),

  // ============================================================
  // BELOW_TARGET_MARGIN
  // ============================================================
  Object.freeze({
    id: 'BELOW_TARGET_MARGIN',
    type: DECISION_TYPES.BELOW_TARGET_MARGIN,
    category: DECISION_CATEGORIES.PRICING,
    name: 'Below Target Margin',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 65,
    defaultTitle: 'Margin Below Target',
    defaultSummary: 'Current margin is below business target.',
    defaultRecommendation: 'Review pricing strategy and cost structure.',
    requiredFields: Object.freeze([
      'currentMargin',
      'targetMargin',
      'productName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentMargin = toNumber(data.currentMargin);
      const targetMargin = toNumber(data.targetMargin);
      const productName = data.productName || 'Business';
      const productId = data.productId || 'unknown';
      const revenue = toNumber(data.revenue);

      if (targetMargin > 0 && currentMargin >= 0) {
        const gap = targetMargin - currentMargin;
        const gapPercent = (gap / targetMargin) * 100;

        if (gap > 0.03) {
          const urgency =
            gapPercent > 30
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM;
          const severity =
            gapPercent > 40
              ? DECISION_SEVERITY.WARNING
              : DECISION_SEVERITY.INFO;

          return Object.freeze({
            triggered: true,
            severity,
            evidence: Object.freeze({
              currentMargin: pct(currentMargin),
              targetMargin: pct(targetMargin),
              gap: pct(gap),
              gapPercent: gapPercent.toFixed(1),
              productName,
              revenue,
            }),
            impact: Object.freeze({
              financialImpact: revenue > 0 ? revenue * gap : null,
              description: `Margin ${pct(gap)}% below ${pct(
                targetMargin
              )}% target`,
            }),
            urgency,
            currentState: Object.freeze({ currentMargin, targetMargin }),
            expectedImpact: 'Improved margins to target level',
            risks: Object.freeze(['Continued underperformance']),
            relatedEntity:
              productId !== 'unknown'
                ? DECISION_ENTITY.PRODUCT
                : DECISION_ENTITY.BUSINESS,
            relatedEntityId: productId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.productName} margin (${evidence.currentMargin}%) is ${evidence.gap}% below target (${evidence.targetMargin}%). Review pricing and costs to close the gap.`;
    },
  }),

  // ============================================================
  // PRICE_BELOW_COST
  // ============================================================
  Object.freeze({
    id: 'PRICE_BELOW_COST',
    type: DECISION_TYPES.PRICE_BELOW_COST,
    category: DECISION_CATEGORIES.PRICING,
    name: 'Price Below Cost',
    severity: DECISION_SEVERITY.CRITICAL,
    minConfidence: 90,
    defaultTitle: '🚨 CRITICAL: Price Below Cost',
    defaultSummary: 'Selling price is below the cost of goods sold.',
    defaultRecommendation:
      'Immediately review pricing to stop selling at a loss.',
    requiredFields: Object.freeze([
      'sellingPrice',
      'averageCost',
      'productName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const sellingPrice = toNumber(data.sellingPrice);
      const averageCost = toNumber(data.averageCost);
      const quantitySold = toNumber(data.quantitySold);
      const productName = data.productName || 'Item';
      const productId = data.productId || 'unknown';

      if (
        sellingPrice > 0 &&
        averageCost > 0 &&
        sellingPrice < averageCost
      ) {
        const lossPerUnit = averageCost - sellingPrice;
        const totalLoss =
          quantitySold > 0 ? lossPerUnit * quantitySold : null;
        const lossPercent = (lossPerUnit / averageCost) * 100;

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.CRITICAL,
          evidence: Object.freeze({
            sellingPrice,
            averageCost,
            lossPerUnit,
            totalLoss,
            lossPercent: lossPercent.toFixed(1),
            productName,
            quantitySold: quantitySold || 'unknown',
          }),
          impact: Object.freeze({
            financialImpact: totalLoss || lossPerUnit,
            description: `Selling at ${lossPercent.toFixed(
              1
            )}% below cost (${NGN.format(lossPerUnit)} loss per unit)`,
          }),
          urgency: DECISION_TIMEFRAME.IMMEDIATE,
          currentState: Object.freeze({ sellingPrice, averageCost }),
          expectedImpact: 'Stop losses and restore profitability',
          risks: Object.freeze([
            'Continued financial losses',
            'Business viability risk',
          ]),
          relatedEntity: DECISION_ENTITY.PRODUCT,
          relatedEntityId: productId,
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `🚨 CRITICAL: ${evidence.productName} is selling at ${NGN.format(
        evidence.sellingPrice
      )} which is below cost (${NGN.format(
        evidence.averageCost
      )}). Loss per unit: ${NGN.format(evidence.lossPerUnit)} (${
        evidence.lossPercent
      }%). Immediate price review required.`;
    },
  }),

  // ============================================================
  // PRICE_INCREASE_OPPORTUNITY
  // ============================================================
  Object.freeze({
    id: 'PRICE_INCREASE_OPPORTUNITY',
    type: DECISION_TYPES.PRICE_INCREASE_OPPORTUNITY,
    category: DECISION_CATEGORIES.PRICING,
    name: 'Price Increase Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 65,
    defaultTitle: 'Price Increase Opportunity',
    defaultSummary: 'Margin is below target but demand remains strong.',
    defaultRecommendation: 'Consider implementing a price increase.',
    requiredFields: Object.freeze([
      'currentMargin',
      'targetMargin',
      'demandTrend',
      'productName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const currentMargin = toNumber(data.currentMargin);
      const targetMargin = toNumber(data.targetMargin);
      const demandTrend = toNumber(data.demandTrend);
      const priceElasticity = toNumber(data.priceElasticity, 0.5);
      const productName = data.productName || 'Item';
      const productId = data.productId || 'unknown';
      const revenue = toNumber(data.revenue);

      if (targetMargin > currentMargin && currentMargin < 1) {
        const gap = targetMargin - currentMargin;
        const requiredPriceIncrease = (gap / (1 - currentMargin)) * 100;

        if (
          demandTrend > 0.05 &&
          requiredPriceIncrease < 15 &&
          requiredPriceIncrease > 0
        ) {
          const potentialRevenue = revenue > 0 ? revenue * gap : null;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.OPPORTUNITY,
            evidence: Object.freeze({
              currentMargin: pct(currentMargin),
              targetMargin: pct(targetMargin),
              requiredPriceIncrease: requiredPriceIncrease.toFixed(1),
              demandTrend: pct(demandTrend),
              productName,
              priceElasticity,
            }),
            impact: Object.freeze({
              financialImpact: potentialRevenue,
              description: `Price increase of ${requiredPriceIncrease.toFixed(
                1
              )}% could achieve target margin`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({
              currentMargin,
              targetMargin,
              demandTrend,
            }),
            expectedImpact: 'Improved margins and profitability',
            risks: Object.freeze([
              'Potential demand reduction',
              'Competitor response',
            ]),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: productId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Demand for ${evidence.productName} is growing (${evidence.demandTrend}%) while margin (${evidence.currentMargin}%) is below target (${evidence.targetMargin}%). A ${evidence.requiredPriceIncrease}% price increase could achieve target margins. Consider testing with a small segment first.`;
    },
  }),

  // ============================================================
  // DISCOUNT_EFFECTIVENESS
  // ============================================================
  Object.freeze({
    id: 'DISCOUNT_EFFECTIVENESS',
    type: DECISION_TYPES.DISCOUNT_EFFECTIVENESS,
    category: DECISION_CATEGORIES.PRICING,
    name: 'Discount Effectiveness',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Discount Effectiveness Review',
    defaultSummary:
      'Discounts are high but volume is not increasing proportionally.',
    defaultRecommendation: 'Review discount strategy and effectiveness.',
    requiredFields: Object.freeze([
      'discountRate',
      'volumeChange',
      'marginImpact',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const discountRate = toNumber(data.discountRate);
      const volumeChange = toNumber(data.volumeChange);
      const marginImpact = toNumber(data.marginImpact);
      const productName = data.productName || 'Item';
      const productId = data.productId || 'unknown';

      if (discountRate > 0.05) {
        const volumeResponse =
          discountRate > 0 ? volumeChange / discountRate : 0;

        if (volumeResponse < 1.5 && marginImpact < -0.02) {
          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.INFO,
            evidence: Object.freeze({
              discountRate: pct(discountRate),
              volumeChange: pct(volumeChange),
              volumeResponse: volumeResponse.toFixed(2),
              marginImpact: pct(marginImpact),
              productName,
              effectiveness: volumeResponse < 1 ? 'poor' : 'moderate',
            }),
            impact: Object.freeze({
              financialImpact: null,
              description: `${pct(
                discountRate
              )}% discount resulted in only ${pct(
                volumeChange
              )}% volume increase`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ discountRate, volumeChange }),
            expectedImpact:
              'Improved margin through better discount strategy',
            risks: Object.freeze(['Continued margin erosion']),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: productId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.productName}: ${evidence.discountRate}% discount resulted in only ${evidence.volumeChange}% volume increase (response ratio: ${evidence.volumeResponse}x). Consider reducing or eliminating discounts to preserve margin.`;
    },
  }),

  // ============================================================
  // PRICE_SENSITIVITY_ALERT
  // ============================================================
  Object.freeze({
    id: 'PRICE_SENSITIVITY_ALERT',
    type: DECISION_TYPES.PRICE_SENSITIVITY_ALERT,
    category: DECISION_CATEGORIES.PRICING,
    name: 'Price Sensitivity Alert',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Price Sensitivity Detected',
    defaultSummary:
      'Sales volume declined significantly after price increase.',
    defaultRecommendation:
      'Review price increase impact and consider customer communication.',
    requiredFields: Object.freeze([
      'priceIncrease',
      'volumeDecline',
      'productName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const priceIncrease = toNumber(data.priceIncrease);
      const volumeDecline = toNumber(data.volumeDecline);
      const productName = data.productName || 'Item';
      const productId = data.productId || 'unknown';
      const revenueChange =
        data.revenueChange != null ? toNumber(data.revenueChange) : null;

      if (priceIncrease > 0 && volumeDecline < 0) {
        const elasticity = Math.abs(volumeDecline / priceIncrease);

        if (elasticity > 2) {
          const severity =
            elasticity > 3
              ? DECISION_SEVERITY.CRITICAL
              : DECISION_SEVERITY.WARNING;

          return Object.freeze({
            triggered: true,
            severity,
            evidence: Object.freeze({
              priceIncrease: pct(priceIncrease),
              volumeDecline: pct(volumeDecline),
              elasticity: elasticity.toFixed(2),
              productName,
              revenueChange:
                revenueChange != null ? pct(revenueChange) : 'unknown',
            }),
            impact: Object.freeze({
              financialImpact: null,
              description: `${pct(
                priceIncrease
              )}% price increase led to ${Math.abs(
                volumeDecline * 100
              ).toFixed(1)}% volume decline (elasticity: ${elasticity.toFixed(
                2
              )})`,
            }),
            urgency: DECISION_TIMEFRAME.SHORT_TERM,
            currentState: Object.freeze({ priceIncrease, volumeDecline }),
            expectedImpact: 'Restored customer trust and sales volume',
            risks: Object.freeze([
              'Continued volume decline',
              'Loss of market share',
            ]),
            relatedEntity: DECISION_ENTITY.PRODUCT,
            relatedEntityId: productId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.productName}: ${evidence.priceIncrease}% price increase led to ${evidence.volumeDecline}% volume decline (elasticity: ${evidence.elasticity}x). Customers are highly price sensitive. Consider communicating value more effectively or adjusting the increase.`;
    },
  }),
]);

module.exports = pricingRules;