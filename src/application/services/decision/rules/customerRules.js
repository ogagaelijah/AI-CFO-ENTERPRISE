/**
 * Customer Decision Rules
 * 
 * Detects customer issues and opportunities
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
 * Customer Rule Definitions
 */
const customerRules = [
  // ============================================================
  // CUSTOMER_CONCENTRATION_RISK
  // ============================================================
  {
    id: 'CUSTOMER_CONCENTRATION_RISK',
    type: DECISION_TYPES.CUSTOMER_CONCENTRATION_RISK,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Concentration Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'High Customer Concentration',
    defaultSummary: 'Significant revenue is concentrated in one customer.',
    defaultRecommendation: 'Consider diversifying your customer base.',
    requiredFields: ['topCustomerRevenue', 'totalRevenue', 'topCustomerName'],

    async evaluate(data) {
      const { topCustomerRevenue, totalRevenue, topCustomerName, customerId, threshold = 0.4 } = data;

      if (topCustomerRevenue && totalRevenue && totalRevenue > 0) {
        const concentration = topCustomerRevenue / totalRevenue;

        if (concentration > threshold) {
          const severity = concentration > 0.5 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

          return {
            triggered: true,
            evidence: {
              topCustomerName: topCustomerName || 'Customer',
              topCustomerRevenue,
              totalRevenue,
              concentration: (concentration * 100).toFixed(1),
              threshold: (threshold * 100).toFixed(1)
            },
            impact: {
              financialImpact: topCustomerRevenue,
              description: `${(concentration * 100).toFixed(1)}% of revenue from ${topCustomerName || 'one customer'}`
            },
            urgency: concentration > 0.5 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { concentration, topCustomerRevenue },
            expectedImpact: 'Reduced customer dependency risk',
            risks: ['Revenue instability if customer leaves', 'Limited negotiation power'],
            relatedEntity: 'CUSTOMER',
            relatedEntityId: customerId || 'unknown'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const urgency = evidence.concentration > 50 ? '🚨 CRITICAL: ' : '';
      return `${urgency}${evidence.concentration}% of your revenue (₦${evidence.topCustomerRevenue.toLocaleString()}) comes from ${evidence.topCustomerName}. Consider diversifying your customer base to reduce dependency risk.`;
    },

    alternatives: [
      'Develop new customer acquisition channels',
      'Create loyalty programs for existing customers'
    ],

    assumptions: [
      'Current revenue mix is representative'
    ]
  },

  // ============================================================
  // TOP_5_CONCENTRATION
  // ============================================================
  {
    id: 'TOP_5_CONCENTRATION',
    type: DECISION_TYPES.TOP_5_CONCENTRATION,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Top 5 Concentration Risk',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 65,
    defaultTitle: 'Top 5 Customer Concentration',
    defaultSummary: 'Top 5 customers represent a significant portion of revenue.',
    defaultRecommendation: 'Review customer diversification strategy.',
    requiredFields: ['top5Revenue', 'totalRevenue', 'top5Names'],

    async evaluate(data) {
      const { top5Revenue, totalRevenue, top5Names, threshold = 0.6 } = data;

      if (top5Revenue && totalRevenue && totalRevenue > 0) {
        const concentration = top5Revenue / totalRevenue;

        if (concentration > threshold) {
          return {
            triggered: true,
            evidence: {
              top5Revenue,
              totalRevenue,
              top5Names: top5Names || 'Top 5 customers',
              concentration: (concentration * 100).toFixed(1),
              threshold: (threshold * 100).toFixed(1)
            },
            impact: {
              financialImpact: top5Revenue,
              description: `${(concentration * 100).toFixed(1)}% of revenue from top 5 customers`
            },
            urgency: 'MEDIUM_TERM',
            currentState: { concentration, top5Revenue },
            expectedImpact: 'Reduced customer dependency risk',
            risks: ['Revenue concentration risk', 'Limited negotiation power'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `${evidence.concentration}% of your revenue (₦${evidence.top5Revenue.toLocaleString()}) comes from your top 5 customers. Consider diversifying your customer base to reduce dependency risk.`;
    }
  },

  // ============================================================
  // CUSTOMER_REVENUE_DECLINE
  // ============================================================
  {
    id: 'CUSTOMER_REVENUE_DECLINE',
    type: DECISION_TYPES.CUSTOMER_REVENUE_DECLINE,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Revenue Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Customer Revenue Declining',
    defaultSummary: 'A customer\'s revenue has dropped significantly.',
    defaultRecommendation: 'Reach out to understand the reason.',
    requiredFields: ['customerName', 'previousRevenue', 'currentRevenue', 'declinePercent'],

    async evaluate(data) {
      const { customerName, previousRevenue, currentRevenue, declinePercent, customerId } = data;

      const decline = declinePercent || (previousRevenue > 0 ? ((previousRevenue - currentRevenue) / previousRevenue) * 100 : 0);

      if (decline > 30 && currentRevenue !== undefined) {
        const severity = decline > 50 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

        return {
          triggered: true,
          evidence: {
            customerName: customerName || 'Customer',
            previousRevenue,
            currentRevenue,
            decline: decline.toFixed(1),
            revenueLost: previousRevenue - currentRevenue
          },
          impact: {
            financialImpact: previousRevenue - currentRevenue,
            description: `${customerName || 'Customer'} revenue declined ${decline.toFixed(1)}%`
          },
          urgency: decline > 50 ? 'SHORT_TERM' : 'MEDIUM_TERM',
          currentState: { previousRevenue, currentRevenue },
          expectedImpact: 'Retained customer revenue',
          risks: ['Customer churn', 'Revenue loss'],
          relatedEntity: 'CUSTOMER',
          relatedEntityId: customerId || 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const customer = evidence.customerName || 'Customer';
      return `${customer} revenue declined ${evidence.decline}% (from ₦${evidence.previousRevenue.toLocaleString()} to ₦${evidence.currentRevenue.toLocaleString()}). Reach out to understand the reason and identify opportunities to win back business.`;
    }
  },

  // ============================================================
  // HIGH_VALUE_CUSTOMER_RETENTION
  // ============================================================
  {
    id: 'HIGH_VALUE_CUSTOMER_RETENTION',
    type: DECISION_TYPES.HIGH_VALUE_CUSTOMER_RETENTION,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'High-Value Customer Retention',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 70,
    defaultTitle: 'High-Value Customer Retention Opportunity',
    defaultSummary: 'Top customer revenue is growing.',
    defaultRecommendation: 'Prioritize retention and relationship building.',
    requiredFields: ['customerName', 'revenueGrowth', 'customerRevenue'],

    async evaluate(data) {
      const { customerName, revenueGrowth, customerRevenue, customerId } = data;

      if (revenueGrowth > 0.15) {
        return {
          triggered: true,
          evidence: {
            customerName: customerName || 'Customer',
            revenueGrowth: (revenueGrowth * 100).toFixed(1),
            customerRevenue,
            isHighValue: customerRevenue > 1000000 // Assuming high value is > ₦1M
          },
          impact: {
            financialImpact: customerRevenue * revenueGrowth,
            description: `${customerName || 'Customer'} revenue growing ${(revenueGrowth * 100).toFixed(1)}%`
          },
          urgency: 'MEDIUM_TERM',
          currentState: { revenueGrowth, customerRevenue },
          expectedImpact: 'Continued revenue growth and loyalty',
          risks: ['Competitor action could disrupt relationship'],
          relatedEntity: 'CUSTOMER',
          relatedEntityId: customerId || 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const customer = evidence.customerName || 'Customer';
      let recommendation = `${customer} is a high-value customer growing at ${evidence.revenueGrowth}%. `;
      
      if (evidence.customerRevenue > 1000000) {
        recommendation += 'This is a key account. Prioritize relationship building, personalized service, and regular check-ins to ensure retention.';
      } else {
        recommendation += 'Consider nurturing this relationship to grow revenue further.';
      }
      
      return recommendation;
    }
  },

  // ============================================================
  // CUSTOMER_CHURN_RISK
  // ============================================================
  {
    id: 'CUSTOMER_CHURN_RISK',
    type: DECISION_TYPES.CUSTOMER_CHURN_RISK,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Churn Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Customer Churn Risk Detected',
    defaultSummary: 'Customer has not purchased for over 60 days.',
    defaultRecommendation: 'Re-engage the customer with targeted outreach.',
    requiredFields: ['customerName', 'daysSinceLastPurchase', 'customerValue'],

    async evaluate(data) {
      const { customerName, daysSinceLastPurchase, customerValue, customerId } = data;

      if (daysSinceLastPurchase > 60) {
        const severity = daysSinceLastPurchase > 90 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

        return {
          triggered: true,
          evidence: {
            customerName: customerName || 'Customer',
            daysSinceLastPurchase,
            customerValue,
            riskLevel: daysSinceLastPurchase > 90 ? 'HIGH' : 'MEDIUM'
          },
          impact: {
            financialImpact: customerValue || null,
            description: `${customerName || 'Customer'} last purchased ${daysSinceLastPurchase} days ago`
          },
          urgency: daysSinceLastPurchase > 90 ? 'SHORT_TERM' : 'MEDIUM_TERM',
          currentState: { daysSinceLastPurchase },
          expectedImpact: 'Re-engaged customer and recovered revenue',
          risks: ['Customer churn', 'Revenue loss'],
          relatedEntity: 'CUSTOMER',
          relatedEntityId: customerId || 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const customer = evidence.customerName || 'Customer';
      const urgency = evidence.riskLevel === 'HIGH' ? '⚠️ HIGH RISK: ' : '';
      
      return `${urgency}${customer} last purchased ${evidence.daysSinceLastPurchase} days ago. Consider a targeted re-engagement campaign, special offer, or check-in call to win back this customer.`;
    }
  },

  // ============================================================
  // CUSTOMER_ACQUISITION_OPPORTUNITY
  // ============================================================
  {
    id: 'CUSTOMER_ACQUISITION_OPPORTUNITY',
    type: DECISION_TYPES.CUSTOMER_ACQUISITION_OPPORTUNITY,
    category: DECISION_CATEGORIES.CUSTOMERS,
    name: 'Customer Acquisition Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Customer Acquisition Opportunity',
    defaultSummary: 'New customer acquisition is growing.',
    defaultRecommendation: 'Invest in acquisition channels that are working.',
    requiredFields: ['newCustomerCount', 'acquisitionGrowth', 'acquisitionChannel'],

    async evaluate(data) {
      const { newCustomerCount, acquisitionGrowth, acquisitionChannel } = data;

      if (acquisitionGrowth > 0.1 && newCustomerCount > 0) {
        return {
          triggered: true,
          evidence: {
            newCustomerCount,
            acquisitionGrowth: (acquisitionGrowth * 100).toFixed(1),
            acquisitionChannel: acquisitionChannel || 'Overall acquisition'
          },
          impact: {
            financialImpact: null,
            description: `New customer acquisition growing ${(acquisitionGrowth * 100).toFixed(1)}%`
          },
          urgency: 'MEDIUM_TERM',
          currentState: { newCustomerCount, acquisitionGrowth },
          expectedImpact: 'Continued revenue growth',
          risks: ['Acquisition cost may increase'],
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `New customer acquisition is growing at ${evidence.acquisitionGrowth}% (${evidence.newCustomerCount} new customers).`;
      
      if (evidence.acquisitionChannel && evidence.acquisitionChannel !== 'Overall acquisition') {
        recommendation += ` The ${evidence.acquisitionChannel} channel is performing well. Consider increasing investment in this channel.`;
      } else {
        recommendation += ' Review which acquisition channels are most effective and consider increasing investment.';
      }
      
      return recommendation;
    }
  }
];

module.exports = customerRules;