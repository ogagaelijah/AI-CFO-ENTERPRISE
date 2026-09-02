'use strict';

/**
 * Customer Decision Rules
 * Path: src/application/services/decision/rules/customerRules.js
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
const customerRules = Object.freeze([
  // ============================================================
  // CUSTOMER_CONCENTRATION_RISK
  // ============================================================
  Object.freeze({
    id: 'CUSTOMER_CONCENTRATION_RISK',
    type: DECISION_TYPES.CUSTOMER_CONCENTRATION_RISK,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Concentration Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'High Customer Concentration',
    defaultSummary: 'Significant revenue is concentrated in one customer.',
    defaultRecommendation: 'Consider diversifying your customer base.',
    requiredFields: Object.freeze([
      'topCustomerRevenue',
      'totalRevenue',
      'topCustomerName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const topCustomerRevenue = toNumber(data.topCustomerRevenue);
      const totalRevenue = toNumber(data.totalRevenue);
      const topCustomerName = data.topCustomerName || 'Customer';
      const customerId = data.customerId || 'unknown';
      const threshold = toNumber(data.threshold, 0.4);

      if (topCustomerRevenue <= 0 || totalRevenue <= 0) {
        return Object.freeze({ triggered: false });
      }

      const concentration = topCustomerRevenue / totalRevenue;

      if (concentration > threshold) {
        const isCritical = concentration > 0.5;

        return Object.freeze({
          triggered: true,
          severity: isCritical
            ? DECISION_SEVERITY.CRITICAL
            : DECISION_SEVERITY.WARNING,
          evidence: Object.freeze({
            topCustomerName,
            topCustomerRevenue,
            totalRevenue,
            concentration: pct(concentration),
            threshold: pct(threshold),
          }),
          impact: Object.freeze({
            financialImpact: topCustomerRevenue,
            description: `${pct(
              concentration
            )}% of revenue from ${topCustomerName}`,
          }),
          urgency: isCritical
            ? DECISION_TIMEFRAME.SHORT_TERM
            : DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({
            concentration,
            topCustomerRevenue,
          }),
          expectedImpact: 'Reduced customer dependency risk',
          risks: Object.freeze([
            'Revenue instability if customer leaves',
            'Limited negotiation power',
          ]),
          relatedEntity: DECISION_ENTITY.CUSTOMER,
          relatedEntityId: customerId,
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const urgency =
        toNumber(evidence.concentration) > 50 ? '🚨 CRITICAL: ' : '';
      return `${urgency}${evidence.concentration}% of your revenue (${NGN.format(
        evidence.topCustomerRevenue
      )}) comes from ${
        evidence.topCustomerName
      }. Consider diversifying your customer base to reduce dependency risk.`;
    },

    alternatives: Object.freeze([
      'Develop new customer acquisition channels',
      'Create loyalty programs for existing customers',
    ]),
    assumptions: Object.freeze([
      'Current revenue mix is representative',
    ]),
  }),

  // ============================================================
  // TOP_5_CONCENTRATION
  // ============================================================
  Object.freeze({
    id: 'TOP_5_CONCENTRATION',
    type: DECISION_TYPES.TOP_5_CONCENTRATION,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Top 5 Concentration Risk',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 65,
    defaultTitle: 'Top 5 Customer Concentration',
    defaultSummary:
      'Top 5 customers represent a significant portion of revenue.',
    defaultRecommendation: 'Review customer diversification strategy.',
    requiredFields: Object.freeze([
      'top5Revenue',
      'totalRevenue',
      'top5Names',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const top5Revenue = toNumber(data.top5Revenue);
      const totalRevenue = toNumber(data.totalRevenue);
      const top5Names = data.top5Names || 'Top 5 customers';
      const threshold = toNumber(data.threshold, 0.6);

      if (top5Revenue <= 0 || totalRevenue <= 0) {
        return Object.freeze({ triggered: false });
      }

      const concentration = top5Revenue / totalRevenue;

      if (concentration > threshold) {
        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.INFO,
          evidence: Object.freeze({
            top5Revenue,
            totalRevenue,
            top5Names,
            concentration: pct(concentration),
            threshold: pct(threshold),
          }),
          impact: Object.freeze({
            financialImpact: top5Revenue,
            description: `${pct(
              concentration
            )}% of revenue from top 5 customers`,
          }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ concentration, top5Revenue }),
          expectedImpact: 'Reduced customer dependency risk',
          risks: Object.freeze([
            'Revenue concentration risk',
            'Limited negotiation power',
          ]),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.concentration}% of your revenue (${NGN.format(
        evidence.top5Revenue
      )}) comes from your top 5 customers. Consider diversifying your customer base to reduce dependency risk.`;
    },
  }),

  // ============================================================
  // CUSTOMER_REVENUE_DECLINE
  // ============================================================
  Object.freeze({
    id: 'CUSTOMER_REVENUE_DECLINE',
    type: DECISION_TYPES.CUSTOMER_REVENUE_DECLINE,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Revenue Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Customer Revenue Declining',
    defaultSummary: "A customer's revenue has dropped significantly.",
    defaultRecommendation: 'Reach out to understand the reason.',
    requiredFields: Object.freeze([
      'customerName',
      'previousRevenue',
      'currentRevenue',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const customerName = data.customerName || 'Customer';
      const previousRevenue = toNumber(data.previousRevenue);
      const currentRevenue = toNumber(data.currentRevenue);
      const customerId = data.customerId || 'unknown';

      const decline =
        data.declinePercent != null
          ? toNumber(data.declinePercent)
          : previousRevenue > 0
            ? ((previousRevenue - currentRevenue) / previousRevenue) * 100
            : 0;

      if (decline <= 30) {
        return Object.freeze({ triggered: false });
      }

      const isCritical = decline > 50;

      return Object.freeze({
        triggered: true,
        severity: isCritical
          ? DECISION_SEVERITY.CRITICAL
          : DECISION_SEVERITY.WARNING,
        evidence: Object.freeze({
          customerName,
          previousRevenue,
          currentRevenue,
          decline: decline.toFixed(1),
          revenueLost: previousRevenue - currentRevenue,
        }),
        impact: Object.freeze({
          financialImpact: previousRevenue - currentRevenue,
          description: `${customerName} revenue declined ${decline.toFixed(
            1
          )}%`,
        }),
        urgency: isCritical
          ? DECISION_TIMEFRAME.SHORT_TERM
          : DECISION_TIMEFRAME.MEDIUM_TERM,
        currentState: Object.freeze({ previousRevenue, currentRevenue }),
        expectedImpact: 'Retained customer revenue',
        risks: Object.freeze(['Customer churn', 'Revenue loss']),
        relatedEntity: DECISION_ENTITY.CUSTOMER,
        relatedEntityId: customerId,
      });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const customer = evidence.customerName || 'Customer';
      return `${customer} revenue declined ${
        evidence.decline
      }% (from ${NGN.format(evidence.previousRevenue)} to ${NGN.format(
        evidence.currentRevenue
      )}). Reach out to understand the reason and identify opportunities to win back business.`;
    },
  }),

  // ============================================================
  // HIGH_VALUE_CUSTOMER_RETENTION
  // ============================================================
  Object.freeze({
    id: 'HIGH_VALUE_CUSTOMER_RETENTION',
    type: DECISION_TYPES.HIGH_VALUE_CUSTOMER_RETENTION,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'High-Value Customer Retention',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 70,
    defaultTitle: 'High-Value Customer Retention Opportunity',
    defaultSummary: 'Top customer revenue is growing.',
    defaultRecommendation:
      'Prioritize retention and relationship building.',
    requiredFields: Object.freeze([
      'customerName',
      'revenueGrowth',
      'customerRevenue',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const customerName = data.customerName || 'Customer';
      const revenueGrowth = toNumber(data.revenueGrowth);
      const customerRevenue = toNumber(data.customerRevenue);
      const customerId = data.customerId || 'unknown';

      if (revenueGrowth <= 0.15) {
        return Object.freeze({ triggered: false });
      }

      return Object.freeze({
        triggered: true,
        severity: DECISION_SEVERITY.OPPORTUNITY,
        evidence: Object.freeze({
          customerName,
          revenueGrowth: pct(revenueGrowth),
          customerRevenue,
          isHighValue: customerRevenue > 1_000_000,
        }),
        impact: Object.freeze({
          financialImpact: customerRevenue * revenueGrowth,
          description: `${customerName} revenue growing ${pct(
            revenueGrowth
          )}%`,
        }),
        urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
        currentState: Object.freeze({ revenueGrowth, customerRevenue }),
        expectedImpact: 'Continued revenue growth and loyalty',
        risks: Object.freeze([
          'Competitor action could disrupt relationship',
        ]),
        relatedEntity: DECISION_ENTITY.CUSTOMER,
        relatedEntityId: customerId,
      });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const customer = evidence.customerName || 'Customer';
      let recommendation = `${customer} is a high-value customer growing at ${evidence.revenueGrowth}%. `;
      if (evidence.customerRevenue > 1_000_000) {
        recommendation +=
          'This is a key account. Prioritize relationship building, personalized service, and regular check-ins to ensure retention.';
      } else {
        recommendation +=
          'Consider nurturing this relationship to grow revenue further.';
      }
      return recommendation;
    },
  }),

  // ============================================================
  // CUSTOMER_CHURN_RISK
  // ============================================================
  Object.freeze({
    id: 'CUSTOMER_CHURN_RISK',
    type: DECISION_TYPES.CUSTOMER_CHURN_RISK,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Churn Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Customer Churn Risk Detected',
    defaultSummary: 'Customer has not purchased for over 60 days.',
    defaultRecommendation:
      'Re-engage the customer with targeted outreach.',
    requiredFields: Object.freeze([
      'customerName',
      'daysSinceLastPurchase',
      'customerValue',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const customerName = data.customerName || 'Customer';
      const daysSinceLastPurchase = toNumber(data.daysSinceLastPurchase);
      const customerValue = toNumber(data.customerValue);
      const customerId = data.customerId || 'unknown';

      if (daysSinceLastPurchase <= 60) {
        return Object.freeze({ triggered: false });
      }

      const isHighRisk = daysSinceLastPurchase > 90;

      return Object.freeze({
        triggered: true,
        severity: isHighRisk
          ? DECISION_SEVERITY.CRITICAL
          : DECISION_SEVERITY.WARNING,
        evidence: Object.freeze({
          customerName,
          daysSinceLastPurchase,
          customerValue,
          riskLevel: isHighRisk ? 'HIGH' : 'MEDIUM',
        }),
        impact: Object.freeze({
          financialImpact: customerValue || null,
          description: `${customerName} last purchased ${daysSinceLastPurchase} days ago`,
        }),
        urgency: isHighRisk
          ? DECISION_TIMEFRAME.SHORT_TERM
          : DECISION_TIMEFRAME.MEDIUM_TERM,
        currentState: Object.freeze({ daysSinceLastPurchase }),
        expectedImpact: 'Re-engaged customer and recovered revenue',
        risks: Object.freeze(['Customer churn', 'Revenue loss']),
        relatedEntity: DECISION_ENTITY.CUSTOMER,
        relatedEntityId: customerId,
      });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const customer = evidence.customerName || 'Customer';
      const urgency =
        evidence.riskLevel === 'HIGH' ? '⚠️ HIGH RISK: ' : '';
      return `${urgency}${customer} last purchased ${evidence.daysSinceLastPurchase} days ago. Consider a targeted re-engagement campaign, special offer, or check-in call to win back this customer.`;
    },
  }),

  // ============================================================
  // CUSTOMER_ACQUISITION_OPPORTUNITY
  // ============================================================
  Object.freeze({
    id: 'CUSTOMER_ACQUISITION_OPPORTUNITY',
    type: DECISION_TYPES.CUSTOMER_ACQUISITION_OPPORTUNITY,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Acquisition Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Customer Acquisition Opportunity',
    defaultSummary: 'New customer acquisition is growing.',
    defaultRecommendation:
      'Invest in acquisition channels that are working.',
    requiredFields: Object.freeze([
      'newCustomerCount',
      'acquisitionGrowth',
      'acquisitionChannel',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const newCustomerCount = toNumber(data.newCustomerCount);
      const acquisitionGrowth = toNumber(data.acquisitionGrowth);
      const acquisitionChannel =
        data.acquisitionChannel || 'Overall acquisition';

      if (acquisitionGrowth <= 0.1 || newCustomerCount <= 0) {
        return Object.freeze({ triggered: false });
      }

      return Object.freeze({
        triggered: true,
        severity: DECISION_SEVERITY.OPPORTUNITY,
        evidence: Object.freeze({
          newCustomerCount,
          acquisitionGrowth: pct(acquisitionGrowth),
          acquisitionChannel,
        }),
        impact: Object.freeze({
          financialImpact: null,
          description: `New customer acquisition growing ${pct(
            acquisitionGrowth
          )}%`,
        }),
        urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
        currentState: Object.freeze({
          newCustomerCount,
          acquisitionGrowth,
        }),
        expectedImpact: 'Continued revenue growth',
        risks: Object.freeze(['Acquisition cost may increase']),
        relatedEntity: DECISION_ENTITY.BUSINESS,
        relatedEntityId: 'global',
      });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `New customer acquisition is growing at ${evidence.acquisitionGrowth}% (${evidence.newCustomerCount} new customers).`;
      if (
        evidence.acquisitionChannel &&
        evidence.acquisitionChannel !== 'Overall acquisition'
      ) {
        recommendation += ` The ${evidence.acquisitionChannel} channel is performing well. Consider increasing investment in this channel.`;
      } else {
        recommendation +=
          ' Review which acquisition channels are most effective and consider increasing investment.';
      }
      return recommendation;
    },
  }),
]);

module.exports = customerRules;