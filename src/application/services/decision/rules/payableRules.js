'use strict';

/**
 * Payable Decision Rules
 * Path: src/application/services/decision/rules/payableRules.js
 * SSOT: DecisionContracts
 * @version 1.2.1-prod
 */

const {
  DECISION_TYPES,
  DECISION_CATEGORIES,
  DECISION_SEVERITY,
  DECISION_TIMEFRAME,
  DECISION_ENTITY,
  DECISION_PRIORITY,
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

const safeSlice = (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []);

// ─── rules ───────────────────────────────────────────────────
const payableRules = Object.freeze([
  // ============================================================
  // SUPPLIER_PAYMENT_OVERDUE
  // ============================================================
  Object.freeze({
    id: 'SUPPLIER_PAYMENT_OVERDUE',
    type: DECISION_TYPES.SUPPLIER_PAYMENT_OVERDUE,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Supplier Payment Overdue',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.MEDIUM, // ADDED
    minConfidence: 70,
    defaultTitle: 'Supplier Payment Overdue',
    defaultSummary: 'Supplier payments are overdue.',
    defaultRecommendation: 'Review payment schedule and prioritize overdue payments.',
    requiredFields: Object.freeze(['overdueAmount', 'daysOverdue', 'supplierName']),

    async evaluate(data) {
      try { // ADDED
        data = safeData(data);
        const overdueAmount = toNumber(data.overdueAmount);
        const daysOverdue = toNumber(data.daysOverdue);
        const totalPayables = toNumber(data.totalPayables);
        const supplierName = data.supplierName || 'Supplier';
        const supplierId = data.supplierId || 'unknown';

        if (overdueAmount <= 0 || daysOverdue < 45) {
          return Object.freeze({ triggered: false });
        }

        const concentration = totalPayables > 0 ? overdueAmount / totalPayables : 0;
        const isUrgent = daysOverdue >= 60;

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.INFO,
          evidence: Object.freeze({
            overdueAmount,
            daysOverdue,
            supplierName,
            supplierId,
            concentration: pct(concentration), // CHANGED: use pct()
            isUrgent,
          }),
          impact: Object.freeze({
            financialImpact: overdueAmount,
            description: `${NGN.format(overdueAmount)} overdue to ${supplierName} for ${daysOverdue} days`,
          }),
          urgency: isUrgent ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ overdueAmount, daysOverdue }),
          expectedImpact: 'Maintained supplier relationship and credit',
          risks: Object.freeze(['Supplier relationship strain', 'Credit holds', 'Late payment penalties']),
          relatedEntity: DECISION_ENTITY.SUPPLIER,
          relatedEntityId: supplierId,
        });
      } catch { // ADDED
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const supplier = evidence.supplierName || 'Supplier';
      const urgency = evidence.isUrgent ? '⚠️ URGENT: ' : '';
      return `${urgency}${supplier} is owed ${NGN.format(evidence.overdueAmount)} which is ${evidence.daysOverdue} days overdue (${evidence.concentration}% of total payables). Review cash position and prioritize payment to maintain relationship.`;
    },
  }),

  // ============================================================
  // SUPPLIER_PAYMENT_URGENCY
  // ============================================================
  Object.freeze({
    id: 'SUPPLIER_PAYMENT_URGENCY',
    type: DECISION_TYPES.SUPPLIER_PAYMENT_URGENCY,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Supplier Payment Urgency',
    severity: DECISION_SEVERITY.WARNING,
    priority: DECISION_PRIORITY.HIGH, // ADDED
    minConfidence: 75,
    defaultTitle: 'Urgent Supplier Payment Required',
    defaultSummary: 'Critical supplier payment is overdue.',
    defaultRecommendation: 'Prioritize payment to avoid supply disruption.',
    requiredFields: Object.freeze(['supplierName', 'overdueAmount', 'daysOverdue', 'isCriticalSupplier']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const supplierName = data.supplierName || 'Critical Supplier';
        const overdueAmount = toNumber(data.overdueAmount);
        const daysOverdue = toNumber(data.daysOverdue);
        const isCriticalSupplier = Boolean(data.isCriticalSupplier);
        const supplierId = data.supplierId || 'unknown';

        if (overdueAmount <= 0 || daysOverdue < 45 || !isCriticalSupplier) {
          return Object.freeze({ triggered: false });
        }

        const isCritical = daysOverdue >= 60;
        const severity = isCritical ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

        return Object.freeze({
          triggered: true,
          severity,
          evidence: Object.freeze({ supplierName, overdueAmount, daysOverdue, isCriticalSupplier: true, severity }),
          impact: Object.freeze({
            financialImpact: overdueAmount,
            description: `Critical supplier ${supplierName} is overdue by ${NGN.format(overdueAmount)} (${daysOverdue} days)`,
          }),
          urgency: isCritical ? DECISION_TIMEFRAME.IMMEDIATE : DECISION_TIMEFRAME.SHORT_TERM,
          currentState: Object.freeze({ overdueAmount, daysOverdue }),
          expectedImpact: 'Maintained supply chain',
          risks: Object.freeze(['Supply disruption', 'Production halt', 'Relationship damage']),
          relatedEntity: DECISION_ENTITY.SUPPLIER,
          relatedEntityId: supplierId,
        });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const urgency = toNumber(evidence.daysOverdue) >= 60 ? '🚨 CRITICAL: ' : '⚠️ ';
      const supplier = evidence.supplierName || 'critical supplier';
      return `${urgency}${supplier} is a critical supplier with ${NGN.format(evidence.overdueAmount)} overdue (${evidence.daysOverdue} days). Prioritize payment immediately to avoid supply disruption.`;
    },
  }),

  // ============================================================
  // PAYABLE_NEGOTIATION_OPPORTUNITY
  // ============================================================
  Object.freeze({
    id: 'PAYABLE_NEGOTIATION_OPPORTUNITY',
    type: DECISION_TYPES.PAYABLE_NEGOTIATION_OPPORTUNITY,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Payable Negotiation Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    priority: DECISION_PRIORITY.LOW, // ADDED
    minConfidence: 60,
    defaultTitle: 'Payable Negotiation Opportunity',
    defaultSummary: 'Strong cash position presents opportunity to negotiate payment terms.',
    defaultRecommendation: 'Consider negotiating discounts or extended terms.',
    requiredFields: Object.freeze(['cashPosition', 'totalPayables', 'supplierRelationship']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const cashPosition = toNumber(data.cashPosition);
        const totalPayables = toNumber(data.totalPayables);
        const suppliers = safeSlice(data.suppliers, 10);

        if (cashPosition <= 0 || totalPayables <= 0 || cashPosition <= totalPayables) {
          return Object.freeze({ triggered: false });
        }

        const ratio = cashPosition / totalPayables;
        if (ratio <= 1.5 || suppliers.length === 0) {
          return Object.freeze({ triggered: false });
        }

        const topSuppliers = suppliers.map((s) => s?.name).filter(Boolean).slice(0, 3);
        const estimatedSavings = totalPayables * 0.02;

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.OPPORTUNITY,
          evidence: Object.freeze({
            cashPosition,
            totalPayables,
            ratio: ratio.toFixed(1),
            topSuppliers: topSuppliers.join(', '),
            supplierCount: suppliers.length,
          }),
          impact: Object.freeze({
            financialImpact: estimatedSavings,
            description: `Strong cash position (${ratio.toFixed(1)}x payables) for negotiation`,
          }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ cashPosition, totalPayables }),
          expectedImpact: 'Improved payment terms or discounts',
          risks: Object.freeze(['May strain relationships if too aggressive']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `Cash position is ${NGN.format(evidence.cashPosition)} (${evidence.ratio}x total payables of ${NGN.format(evidence.totalPayables)}). `;
      if (evidence.topSuppliers) recommendation += `Key suppliers: ${evidence.topSuppliers}. `;
      recommendation += 'Consider negotiating early payment discounts or extended payment terms to improve working capital.';
      return recommendation;
    },
  }),

  // ============================================================
  // SUPPLIER_CONCENTRATION_RISK
  // ============================================================
  Object.freeze({
    id: 'SUPPLIER_CONCENTRATION_RISK',
    type: DECISION_TYPES.SUPPLIER_CONCENTRATION_RISK,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Supplier Concentration Risk',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.MEDIUM, // ADDED
    minConfidence: 65,
    defaultTitle: 'Supplier Concentration Risk',
    defaultSummary: 'Significant portion of purchases from a single supplier.',
    defaultRecommendation: 'Consider diversifying supplier base.',
    requiredFields: Object.freeze(['topSupplierPurchases', 'totalPurchases', 'topSupplierName']),

    async evaluate(data) {
      try {
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
        if (concentration <= threshold) {
          return Object.freeze({ triggered: false });
        }

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.INFO,
          evidence: Object.freeze({
            topSupplierName,
            topSupplierPurchases,
            totalPurchases,
            concentration: pct(concentration),
            threshold: pct(threshold),
          }),
          impact: Object.freeze({
            financialImpact: topSupplierPurchases,
            description: `${pct(concentration)}% of purchases from ${topSupplierName}`,
          }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ concentration, topSupplierPurchases }),
          expectedImpact: 'Reduced supplier dependency risk',
          risks: Object.freeze(['Supply disruption', 'Price leverage', 'Quality dependency']),
          relatedEntity: DECISION_ENTITY.SUPPLIER,
          relatedEntityId: supplierId,
        });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.concentration}% of your purchases (${NGN.format(evidence.topSupplierPurchases)}) are from ${evidence.topSupplierName}. Consider diversifying your supplier base to reduce dependency risk.`;
    },
  }),

  // ============================================================
  // PAYABLE_OPTIMIZATION
  // ============================================================
  Object.freeze({
    id: 'PAYABLE_OPTIMIZATION',
    type: DECISION_TYPES.PAYABLE_OPTIMIZATION,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Payable Optimization',
    severity: DECISION_SEVERITY.INFO,
    priority: DECISION_PRIORITY.LOW, // ADDED
    minConfidence: 60,
    defaultTitle: 'Payable Optimization Opportunity',
    defaultSummary: 'Payable balance is high relative to monthly purchases.',
    defaultRecommendation: 'Review payment terms and cash flow management.',
    requiredFields: Object.freeze(['payableBalance', 'monthlyPurchases']),

    async evaluate(data) {
      try {
        data = safeData(data);
        const payableBalance = toNumber(data.payableBalance);
        const monthlyPurchases = toNumber(data.monthlyPurchases);

        if (payableBalance <= 0 || monthlyPurchases <= 0) {
          return Object.freeze({ triggered: false });
        }

        const monthsOfPurchases = payableBalance / monthlyPurchases;
        if (monthsOfPurchases <= 3) {
          return Object.freeze({ triggered: false });
        }

        const targetPayables = monthlyPurchases * 2;
        const excessPayables = Math.max(0, payableBalance - targetPayables);

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.INFO,
          evidence: Object.freeze({
            payableBalance,
            monthlyPurchases,
            monthsOfPurchases: monthsOfPurchases.toFixed(1),
            excessPayables,
          }),
          impact: Object.freeze({
            financialImpact: excessPayables,
            description: `${monthsOfPurchases.toFixed(1)} months of purchases in payables`,
          }),
          urgency: monthsOfPurchases > 5 ? DECISION_TIMEFRAME.SHORT_TERM : DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ payableBalance, monthsOfPurchases }),
          expectedImpact: 'Optimized working capital',
          risks: Object.freeze(['Supplier relationships if not managed well']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      } catch {
        return Object.freeze({ triggered: false });
      }
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const target = toNumber(evidence.monthlyPurchases) * 2;
      return `Payable balance is ${NGN.format(evidence.payableBalance)} (${evidence.monthsOfPurchases} months of purchases). Review payment terms and consider optimizing to free up working capital. Target 2 months of purchases (${NGN.format(target)}).`;
    },
  }),
]);

module.exports = payableRules;