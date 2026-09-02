/**
 * Growth Decision Rules
 * 
 * Detects growth opportunities and trends
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
 * Growth Rule Definitions
 */
const growthRules = [
  // ============================================================
  // REVENUE_GROWTH_OPPORTUNITY
  // ============================================================
  {
    id: 'REVENUE_GROWTH_OPPORTUNITY',
    type: DECISION_TYPES.REVENUE_GROWTH_OPPORTUNITY,
    category: DECISION_CATEGORIES.GROWTH,
    name: 'Revenue Growth Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 70,
    defaultTitle: 'Revenue Growth Opportunity',
    defaultSummary: 'Revenue is growing at a strong rate.',
    defaultRecommendation: 'Invest in areas driving growth.',
    requiredFields: ['revenueGrowth', 'growthDrivers', 'revenue'],

    async evaluate(data) {
      const { revenueGrowth, growthDrivers, revenue, period = 'month' } = data;

      if (revenueGrowth > 0.15) {
        const drivers = growthDrivers || ['Review drivers'];

        return {
          triggered: true,
          evidence: {
            revenueGrowth: (revenueGrowth * 100).toFixed(1),
            revenue,
            period,
            growthDrivers: drivers.slice(0, 3)
          },
          impact: {
            financialImpact: revenue * revenueGrowth,
            description: `Revenue growing ${(revenueGrowth * 100).toFixed(1)}% per ${period}`
          },
          urgency: 'MEDIUM_TERM',
          currentState: { revenueGrowth },
          expectedImpact: 'Continued revenue growth',
          risks: ['Growth may slow', 'Need to sustain momentum'],
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `Revenue is growing at ${evidence.revenueGrowth}% per ${evidence.period} (₦${evidence.revenue.toLocaleString()}).`;
      
      if (evidence.growthDrivers && evidence.growthDrivers.length > 0) {
        recommendation += ` Key drivers: ${evidence.growthDrivers.join(', ')}. `;
      }
      
      recommendation += 'Consider investing additional resources in these growth areas to sustain momentum.';
      return recommendation;
    }
  },

  // ============================================================
  // PRODUCT_GROWTH_LEADER
  // ============================================================
  {
    id: 'PRODUCT_GROWTH_LEADER',
    type: DECISION_TYPES.PRODUCT_GROWTH_LEADER,
    category: DECISION_CATEGORIES.GROWTH,
    name: 'Product Growth Leader',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 70,
    defaultTitle: 'Product Growth Leader Identified',
    defaultSummary: 'A product is showing strong growth.',
    defaultRecommendation: 'Prioritize investment in this product.',
    requiredFields: ['productName', 'productGrowth', 'productRevenue'],

    async evaluate(data) {
      const { productName, productGrowth, productRevenue, productId } = data;

      if (productGrowth > 0.25 && productRevenue) {
        return {
          triggered: true,
          evidence: {
            productName: productName || 'Product',
            productGrowth: (productGrowth * 100).toFixed(1),
            productRevenue,
            isStar: productGrowth > 0.5
          },
          impact: {
            financialImpact: productRevenue * productGrowth,
            description: `${productName || 'Product'} growing ${(productGrowth * 100).toFixed(1)}%`
          },
          urgency: 'MEDIUM_TERM',
          currentState: { productGrowth, productRevenue },
          expectedImpact: 'Maximized growth potential',
          risks: ['Competition may enter', 'Market may saturate'],
          relatedEntity: 'PRODUCT',
          relatedEntityId: productId || 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const product = evidence.productName || 'Product';
      const urgency = evidence.isStar ? '🌟 STAR PRODUCT: ' : '';
      
      return `${urgency}${product} is growing at ${evidence.productGrowth}% (₦${evidence.productRevenue.toLocaleString()}). Prioritize investment in marketing, inventory, and sales to maximize this growth opportunity.`;
    }
  },

  // ============================================================
  // MARKET_EXPANSION_SIGNAL
  // ============================================================
  {
    id: 'MARKET_EXPANSION_SIGNAL',
    type: DECISION_TYPES.MARKET_EXPANSION_SIGNAL,
    category: DECISION_CATEGORIES.GROWTH,
    name: 'Market Expansion Signal',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Market Expansion Signal Detected',
    defaultSummary: 'New customers and repeat purchases are increasing.',
    defaultRecommendation: 'Consider expanding market reach.',
    requiredFields: ['newCustomers', 'repeatPurchaseRate', 'marketIndicators'],

    async evaluate(data) {
      const { newCustomers, repeatPurchaseRate, marketIndicators } = data;

      if (newCustomers && newCustomers > 0 && repeatPurchaseRate > 0.3) {
        const indicators = marketIndicators || ['Growing demand'];

        return {
          triggered: true,
          evidence: {
            newCustomers,
            repeatPurchaseRate: (repeatPurchaseRate * 100).toFixed(1),
            marketIndicators: indicators.slice(0, 3),
            expansionReady: repeatPurchaseRate > 0.4
          },
          impact: {
            financialImpact: null,
            description: `${newCustomers} new customers with ${(repeatPurchaseRate * 100).toFixed(1)}% repeat purchase rate`
          },
          urgency: 'MEDIUM_TERM',
          currentState: { newCustomers, repeatPurchaseRate },
          expectedImpact: 'Expanded market reach and revenue',
          risks: ['Expansion costs', 'Execution challenges'],
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `You have ${evidence.newCustomers} new customers and a ${evidence.repeatPurchaseRate}% repeat purchase rate.`;
      
      if (evidence.expansionReady) {
        recommendation += ' This indicates market validation. Consider expanding your market reach through new channels or geographies.';
      } else {
        recommendation += ' Consider investing in customer retention before aggressive expansion.';
      }
      
      return recommendation;
    }
  }
];

module.exports = growthRules;