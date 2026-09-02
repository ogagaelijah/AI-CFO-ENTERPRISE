/**
 * Supplier Decision Rules
 * 
 * Detects supplier issues and opportunities * 
 * @version 1.0
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
  DECISION_PRIORITY
} = require('../contracts/DecisionContracts');

/**
 * Supplier Rule Definitions
 */
const supplierRules = [
  // ============================================================
  // SUPPLIER_CONCENTRATION_RISK
  // ============================================================
  {
    id: 'SUPPLIER_CONCENTRATION_RISK',
    type: DECISION_TYPES.SUPPLIER_CONCENTRATION_RISK,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Concentration Risk',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 65,
    defaultTitle: 'Supplier Concentration Risk',
    defaultSummary: 'Significant portion of purchases from a single supplier.',
    defaultRecommendation: 'Consider diversifying supplier base.',
    requiredFields: ['topSupplierPurchases', 'totalPurchases', 'topSupplierName'],

    async evaluate(data) {
      const { topSupplierPurchases, totalPurchases, topSupplierName, supplierId, threshold = 0.6 } = data;

      if (topSupplierPurchases && totalPurchases && totalPurchases > 0) {
        const concentration = topSupplierPurchases / totalPurchases;

        if (concentration > threshold) {
          const severity = concentration > 0.75 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

          return {
            triggered: true,
            evidence: {
              topSupplierName: topSupplierName || 'Supplier',
              topSupplierPurchases,
              totalPurchases,
              concentration: (concentration * 100).toFixed(1),
              threshold: (threshold * 100).toFixed(1)
            },
            impact: {
              financialImpact: topSupplierPurchases,
              description: `${(concentration * 100).toFixed(1)}% of purchases from ${topSupplierName || 'one supplier'}`
            },
            urgency: concentration > 0.75 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { concentration, topSupplierPurchases },
            expectedImpact: 'Reduced supplier dependency risk',
            risks: ['Supply disruption', 'Price leverage', 'Quality dependency'],
            relatedEntity: 'SUPPLIER',
            relatedEntityId: supplierId || 'unknown'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const urgency = evidence.concentration > 75 ? '🚨 CRITICAL: ' : '';
      
      return `${urgency}${evidence.concentration}% of your purchases (₦${evidence.topSupplierPurchases.toLocaleString()}) are from ${evidence.topSupplierName}. Consider diversifying your supplier base to reduce dependency risk.`;
    },

    alternatives: [
      'Identify alternative suppliers',
      'Negotiate backup supply arrangements'
    ],

    assumptions: [
      'Current purchasing patterns will continue'
    ]
  },

  // ============================================================
  // SUPPLIER_COST_INCREASE
  // ============================================================
  {
    id: 'SUPPLIER_COST_INCREASE',
    type: DECISION_TYPES.SUPPLIER_COST_INCREASE,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Cost Increase',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Supplier Cost Increase Detected',
    defaultSummary: 'A supplier has increased costs significantly.',
    defaultRecommendation: 'Review contract and consider alternatives.',
    requiredFields: ['supplierName', 'costIncrease', 'category', 'purchaseVolume'],

    async evaluate(data) {
      const { supplierName, costIncrease, category, purchaseVolume } = data;

      if (costIncrease > 0.10) {
        const severity = costIncrease > 0.20 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;
        const urgency = costIncrease > 0.20 ? 'SHORT_TERM' : 'MEDIUM_TERM';
        const impact = purchaseVolume ? purchaseVolume * costIncrease : null;

        return {
          triggered: true,
          evidence: {
            supplierName: supplierName || 'Supplier',
            costIncrease: (costIncrease * 100).toFixed(1),
            category: category || 'General',
            purchaseVolume,
            impact
          },
          impact: {
            financialImpact: impact,
            description: `${supplierName || 'Supplier'} costs increased ${(costIncrease * 100).toFixed(1)}%`
          },
          urgency,
          currentState: { costIncrease },
          expectedImpact: 'Reduced supplier costs or alternative found',
          risks: ['Margin erosion', 'Competitive disadvantage'],
          relatedEntity: 'SUPPLIER',
          relatedEntityId: 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `${evidence.supplierName} increased ${evidence.category} costs by ${evidence.costIncrease}%.`;
      
      if (evidence.impact) {
        recommendation += ` Annual impact: ₦${evidence.impact.toLocaleString()}.`;
      }
      
      recommendation += ' Review the contract and consider negotiating or exploring alternative suppliers.';
      return recommendation;
    }
  },

  // ============================================================
  // SUPPLIER_PAYMENT_NEGOTIATION
  // ============================================================
  {
    id: 'SUPPLIER_PAYMENT_NEGOTIATION',
    type: DECISION_TYPES.SUPPLIER_PAYMENT_NEGOTIATION,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Payment Negotiation Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Supplier Payment Negotiation Opportunity',
    defaultSummary: 'Strong relationship with high-volume supplier.',
    defaultRecommendation: 'Negotiate better payment terms or volume discounts.',
    requiredFields: ['supplierName', 'purchaseVolume', 'relationshipStrength'],

    async evaluate(data) {
      const { supplierName, purchaseVolume, relationshipStrength } = data;

      if (purchaseVolume > 1000000 && relationshipStrength > 0.7) {
        return {
          triggered: true,
          evidence: {
            supplierName: supplierName || 'Supplier',
            purchaseVolume,
            relationshipStrength: (relationshipStrength * 100).toFixed(1)
          },
          impact: {
            financialImpact: purchaseVolume * 0.02, // Estimated 2% savings
            description: `High volume (₦${purchaseVolume.toLocaleString()}) with strong supplier relationship`
          },
          urgency: 'MEDIUM_TERM',
          currentState: { purchaseVolume },
          expectedImpact: 'Improved payment terms or discounts',
          risks: ['Relationship strain if negotiation is aggressive'],
          relatedEntity: 'SUPPLIER',
          relatedEntityId: 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `You have a strong relationship (${evidence.relationshipStrength}%) with ${evidence.supplierName} and purchase volume of ₦${evidence.purchaseVolume.toLocaleString()}. Consider negotiating better payment terms, volume discounts, or early payment discounts.`;
    }
  },

  // ============================================================
  // SUPPLIER_DIVERSIFICATION
  // ============================================================
  {
    id: 'SUPPLIER_DIVERSIFICATION',
    type: DECISION_TYPES.SUPPLIER_DIVERSIFICATION,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Diversification Recommended',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Supplier Diversification Recommended',
    defaultSummary: 'High supplier concentration in volatile industry.',
    defaultRecommendation: 'Diversify supplier base to reduce risk.',
    requiredFields: ['topSupplierConcentration', 'industryVolatility', 'supplierNames'],

    async evaluate(data) {
      const { topSupplierConcentration, industryVolatility, supplierNames, concentration } = data;

      const conc = concentration || topSupplierConcentration;

      if (conc > 0.5 && industryVolatility > 0.5) {
        return {
          triggered: true,
          evidence: {
            concentration: (conc * 100).toFixed(1),
            industryVolatility: (industryVolatility * 100).toFixed(1),
            supplierNames: supplierNames || 'Primary suppliers',
            riskLevel: 'HIGH'
          },
          impact: {
            financialImpact: null,
            description: `${(conc * 100).toFixed(1)}% supplier concentration in volatile industry`
          },
          urgency: 'SHORT_TERM',
          currentState: { concentration: conc },
          expectedImpact: 'Reduced supply chain risk',
          risks: ['Supply disruption', 'Price volatility'],
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `⚠️ ${evidence.concentration}% supplier concentration in a volatile industry (${evidence.industryVolatility}% volatility). Diversify your supplier base to reduce supply chain risk. Identify at least 2-3 alternative suppliers.`;
    }
  }
];

module.exports = supplierRules;