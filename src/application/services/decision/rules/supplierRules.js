'use strict';

/**
 * Supplier Decision Rules
 * Path: src/application/services/decision/rules/supplierRules.js
 * SSOT: DecisionContracts
 * @version 1.2.1-prod
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
  DECISION_PRIORITY, // <-- ADDED
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
const supplierRules = Object.freeze([
  // ============================================================
  // SUPPLIER_CONCENTRATION_RISK
  // ============================================================
  Object.freeze({
    id: 'SUPPLIER_CONCENTRATION_RISK',
    type: DECISION_TYPES.SUPPLIER_CONCENTRATION_RISK,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Concentration Risk',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.HIGH, // <-- ADDED
    minConfidence: 65,
    defaultTitle: 'Supplier Concentration Risk',
    defaultSummary: 'Significant portion of purchases from a single supplier.',
    defaultRecommendation: 'Consider diversifying supplier base.',
    requiredFields: Object.freeze(['topSupplierPurchases','totalPurchases','topSupplierName']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const topSupplierPurchases = toNumber(data.topSupplierPurchases);
        const totalPurchases = toNumber(data.totalPurchases);
        const topSupplierName = data.topSupplierName || 'Supplier';
        const supplierId = data.supplierId || 'unknown';
        const threshold = toNumber(data.threshold, 0.6);

        if (topSupplierPurchases <= 0 || totalPurchases <= 0) {
          return Object.freeze({ triggered: false });
        }

        const concentration = topSupplierPurchases / totalPurchases;

        if (concentration > threshold) {
          const isCritical = concentration > 0.75;
          return Object.freeze({
            triggered: true,
            severity: isCritical ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({ topSupplierName, topSupplierPurchases, totalPurchases, concentration: pct(concentration), threshold: pct(threshold) }),
            impact: Object.freeze({ financialImpact: topSupplierPurchases, description: `${pct(concentration)}% of purchases from ${topSupplierName}` }),
            urgency: isCritical ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ concentration, topSupplierPurchases }),
            expectedImpact: 'Reduced supplier dependency risk',
            risks: Object.freeze(['Supply disruption','Price leverage','Quality dependency']),
            relatedEntity: DECISION_ENTITY.SUPPLIER,
            relatedEntityId: supplierId,
          });
        }
        return Object.freeze({ triggered: false });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const urgency = toNumber(evidence.concentration) > 75 ? '🚨 CRITICAL: ' : '';
      return `${urgency}${evidence.concentration}% of your purchases (${NGN.format(evidence.topSupplierPurchases)}) are from ${evidence.topSupplierName}. Consider diversifying your supplier base to reduce dependency risk.`;
    },

    alternatives: Object.freeze(['Identify alternative suppliers','Negotiate backup supply arrangements']),
    assumptions: Object.freeze(['Current purchasing patterns will continue']),
  }),

  // ============================================================
  // SUPPLIER_COST_INCREASE
  // ============================================================
  Object.freeze({
    id: 'SUPPLIER_COST_INCREASE',
    type: DECISION_TYPES.SUPPLIER_COST_INCREASE,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Cost Increase',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH, // <-- ADDED
    minConfidence: 70,
    defaultTitle: 'Supplier Cost Increase Detected',
    defaultSummary: 'A supplier has increased costs significantly.',
    defaultRecommendation: 'Review contract and consider alternatives.',
    requiredFields: Object.freeze(['supplierName','costIncrease','category','purchaseVolume']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const supplierName = data.supplierName || 'Supplier';
        const costIncrease = toNumber(data.costIncrease);
        const category = data.category || 'General';
        const purchaseVolume = toNumber(data.purchaseVolume);
        const supplierId = data.supplierId || 'unknown';

        if (costIncrease <= 0.1) return Object.freeze({ triggered: false });

        const isCritical = costIncrease > 0.2;
        const impact = purchaseVolume > 0 ? purchaseVolume * costIncrease : null;

        return Object.freeze({
          triggered: true,
          severity: isCritical ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
          evidence: Object.freeze({ supplierName, costIncrease: pct(costIncrease), category, purchaseVolume, impact }),
          impact: Object.freeze({ financialImpact: impact, description: `${supplierName} costs increased ${pct(costIncrease)}%` }),
          urgency: isCritical ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ costIncrease }),
          expectedImpact: 'Reduced supplier costs or alternative found',
          risks: Object.freeze(['Margin erosion','Competitive disadvantage']),
          relatedEntity: DECISION_ENTITY.SUPPLIER,
          relatedEntityId: supplierId,
        });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `${evidence.supplierName} increased ${evidence.category} costs by ${evidence.costIncrease}%.`;
      if (evidence.impact) recommendation += ` Annual impact: ${NGN.format(evidence.impact)}.`;
      recommendation += ' Review the contract and consider negotiating or exploring alternative suppliers.';
      return recommendation;
    },
  }),

  // ============================================================
  // SUPPLIER_PAYMENT_NEGOTIATION
  // ============================================================
  Object.freeze({
    id: 'SUPPLIER_PAYMENT_NEGOTIATION',
    type: DECISION_TYPES.SUPPLIER_PAYMENT_NEGOTIATION,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Payment Negotiation Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    priority: DECISION_PRIORITY.MEDIUM, // <-- ADDED
    minConfidence: 60,
    defaultTitle: 'Supplier Payment Negotiation Opportunity',
    defaultSummary: 'Strong relationship with high-volume supplier.',
    defaultRecommendation: 'Negotiate better payment terms or volume discounts.',
    requiredFields: Object.freeze(['supplierName','purchaseVolume','relationshipStrength']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const supplierName = data.supplierName || 'Supplier';
        const purchaseVolume = toNumber(data.purchaseVolume);
        const relationshipStrength = toNumber(data.relationshipStrength);
        const supplierId = data.supplierId || 'unknown';

        if (purchaseVolume <= 1_000_000 || relationshipStrength <= 0.7) {
          return Object.freeze({ triggered: false });
        }

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.OPPORTUNITY,
          evidence: Object.freeze({ supplierName, purchaseVolume, relationshipStrength: pct(relationshipStrength) }),
          impact: Object.freeze({ financialImpact: purchaseVolume * 0.02, description: `High volume (${NGN.format(purchaseVolume)}) with strong supplier relationship` }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ purchaseVolume }),
          expectedImpact: 'Improved payment terms or discounts',
          risks: Object.freeze(['Relationship strain if negotiation is aggressive']),
          relatedEntity: DECISION_ENTITY.SUPPLIER,
          relatedEntityId: supplierId,
        });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `You have a strong relationship (${evidence.relationshipStrength}%) with ${evidence.supplierName} and purchase volume of ${NGN.format(evidence.purchaseVolume)}. Consider negotiating better payment terms, volume discounts, or early payment discounts.`;
    },
  }),

  // ============================================================
  // SUPPLIER_DIVERSIFICATION
  // ============================================================
  Object.freeze({
    id: 'SUPPLIER_DIVERSIFICATION',
    type: DECISION_TYPES.SUPPLIER_DIVERSIFICATION,
    category: DECISION_CATEGORIES.SUPPLIERS,
    name: 'Supplier Diversification Recommended',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH, // <-- ADDED
    minConfidence: 65,
    defaultTitle: 'Supplier Diversification Recommended',
    defaultSummary: 'High supplier concentration in volatile industry.',
    defaultRecommendation: 'Diversify supplier base to reduce risk.',
    requiredFields: Object.freeze(['topSupplierConcentration','industryVolatility','supplierNames']),

    async evaluate(data) {
      try { // <-- ADDED
        data = safeData(data);
        const conc = toNumber(data.concentration ?? data.topSupplierConcentration);
        const industryVolatility = toNumber(data.industryVolatility);
        const supplierNames = data.supplierNames || 'Primary suppliers';

        if (conc <= 0.5 || industryVolatility <= 0.5) {
          return Object.freeze({ triggered: false });
        }

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.WARNING,
          evidence: Object.freeze({ concentration: pct(conc), industryVolatility: pct(industryVolatility), supplierNames, riskLevel: 'HIGH' }),
          impact: Object.freeze({ financialImpact: null, description: `${pct(conc)}% supplier concentration in volatile industry` }),
          urgency: DECISION_TIMEFRAME.SHORT_TERM,
          currentState: Object.freeze({ concentration: conc }),
          expectedImpact: 'Reduced supply chain risk',
          risks: Object.freeze(['Supply disruption','Price volatility']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      } catch { // <-- ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `⚠️ ${evidence.concentration}% supplier concentration in a volatile industry (${evidence.industryVolatility}% volatility). Diversify your supplier base to reduce supply chain risk. Identify at least 2-3 alternative suppliers.`;
    },
  }),
]);

module.exports = supplierRules;