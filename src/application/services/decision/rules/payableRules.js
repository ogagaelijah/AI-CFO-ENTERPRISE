/**
 * Payable Decision Rules
 * 
 * Detects payable issues and payment opportunities
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
 * Payable Rule Definitions
 */
const payableRules = [
  // ============================================================
  // SUPPLIER_PAYMENT_OVERDUE
  // ============================================================
  {
    id: 'SUPPLIER_PAYMENT_OVERDUE',
    type: DECISION_TYPES.SUPPLIER_PAYMENT_OVERDUE,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Supplier Payment Overdue',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 70,
    defaultTitle: 'Supplier Payment Overdue',
    defaultSummary: 'Supplier payments are overdue.',
    defaultRecommendation: 'Review payment schedule and prioritize overdue payments.',
    requiredFields: ['overdueAmount', 'daysOverdue', 'supplierName'],

    async evaluate(data) {
      const { overdueAmount, daysOverdue, supplierName, supplierId, totalPayables } = data;

      if (overdueAmount > 0 && daysOverdue >= 45) {
        const concentration = totalPayables > 0 ? (overdueAmount / totalPayables) * 100 : 0;

        return {
          triggered: true,
          evidence: {
            overdueAmount,
            daysOverdue,
            supplierName: supplierName || 'Supplier',
            supplierId,
            concentration: concentration.toFixed(1),
            isUrgent: daysOverdue >= 60
          },
          impact: {
            financialImpact: overdueAmount,
            description: `₦${overdueAmount.toLocaleString()} overdue to ${supplierName || 'supplier'} for ${daysOverdue} days`
          },
          urgency: daysOverdue >= 60 ? 'SHORT_TERM' : 'MEDIUM_TERM',
          currentState: { overdueAmount, daysOverdue },
          expectedImpact: 'Maintained supplier relationship and credit',
          risks: ['Supplier relationship strain', 'Credit holds', 'Late payment penalties'],
          relatedEntity: 'SUPPLIER',
          relatedEntityId: supplierId || 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const supplier = evidence.supplierName || 'Supplier';
      const urgency = evidence.isUrgent ? '⚠️ URGENT: ' : '';
      
      return `${urgency}${supplier} is owed ₦${evidence.overdueAmount.toLocaleString()} which is ${evidence.daysOverdue} days overdue (${evidence.concentration}% of total payables). Review cash position and prioritize payment to maintain relationship.`;
    }
  },

  // ============================================================
  // SUPPLIER_PAYMENT_URGENCY
  // ============================================================
  {
    id: 'SUPPLIER_PAYMENT_URGENCY',
    type: DECISION_TYPES.SUPPLIER_PAYMENT_URGENCY,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Supplier Payment Urgency',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Urgent Supplier Payment Required',
    defaultSummary: 'Critical supplier payment is overdue.',
    defaultRecommendation: 'Prioritize payment to avoid supply disruption.',
    requiredFields: ['supplierName', 'overdueAmount', 'daysOverdue', 'isCriticalSupplier'],

    async evaluate(data) {
      const { supplierName, overdueAmount, daysOverdue, isCriticalSupplier, supplierId } = data;

      if (overdueAmount > 0 && daysOverdue >= 45 && isCriticalSupplier) {
        const severity = daysOverdue >= 60 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

        return {
          triggered: true,
          evidence: {
            supplierName: supplierName || 'Critical Supplier',
            overdueAmount,
            daysOverdue,
            isCriticalSupplier: true,
            severity: severity
          },
          impact: {
            financialImpact: overdueAmount,
            description: `Critical supplier ${supplierName || ''} is overdue by ₦${overdueAmount.toLocaleString()} (${daysOverdue} days)`
          },
          urgency: daysOverdue >= 60 ? 'IMMEDIATE' : 'SHORT_TERM',
          currentState: { overdueAmount, daysOverdue },
          expectedImpact: 'Maintained supply chain',
          risks: ['Supply disruption', 'Production halt', 'Relationship damage'],
          relatedEntity: 'SUPPLIER',
          relatedEntityId: supplierId || 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const urgency = evidence.daysOverdue >= 60 ? '🚨 CRITICAL: ' : '⚠️ ';
      const supplier = evidence.supplierName || 'critical supplier';
      
      return `${urgency}${supplier} is a critical supplier with ₦${evidence.overdueAmount.toLocaleString()} overdue (${evidence.daysOverdue} days). Prioritize payment immediately to avoid supply disruption.`;
    }
  },

  // ============================================================
  // PAYABLE_NEGOTIATION_OPPORTUNITY
  // ============================================================
  {
    id: 'PAYABLE_NEGOTIATION_OPPORTUNITY',
    type: DECISION_TYPES.PAYABLE_NEGOTIATION_OPPORTUNITY,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Payable Negotiation Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Payable Negotiation Opportunity',
    defaultSummary: 'Strong cash position presents opportunity to negotiate payment terms.',
    defaultRecommendation: 'Consider negotiating discounts or extended terms.',
    requiredFields: ['cashPosition', 'totalPayables', 'supplierRelationship'],

    async evaluate(data) {
      const { cashPosition, totalPayables, supplierRelationship, suppliers = [] } = data;

      if (cashPosition && totalPayables && cashPosition > totalPayables) {
        const ratio = cashPosition / totalPayables;

        if (ratio > 1.5 && suppliers.length > 0) {
          const topSuppliers = suppliers.slice(0, 3);

          return {
            triggered: true,
            evidence: {
              cashPosition,
              totalPayables,
              ratio: ratio.toFixed(1),
              topSuppliers: topSuppliers.map(s => s.name).join(', '),
              supplierCount: suppliers.length
            },
            impact: {
              financialImpact: totalPayables * 0.02, // Estimated 2% savings
              description: `Strong cash position (${ratio.toFixed(1)}x payables) for negotiation`
            },
            urgency: 'MEDIUM_TERM',
            currentState: { cashPosition, totalPayables },
            expectedImpact: 'Improved payment terms or discounts',
            risks: ['May strain relationships if too aggressive'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      let recommendation = `Cash position is ₦${evidence.cashPosition.toLocaleString()} (${evidence.ratio}x total payables of ₦${evidence.totalPayables.toLocaleString()}). `;
      
      if (evidence.topSuppliers) {
        recommendation += `Key suppliers: ${evidence.topSuppliers}. `;
      }
      
      recommendation += 'Consider negotiating early payment discounts or extended payment terms to improve working capital.';
      return recommendation;
    }
  },

  // ============================================================
  // SUPPLIER_CONCENTRATION_RISK
  // ============================================================
  {
    id: 'SUPPLIER_CONCENTRATION_RISK',
    type: DECISION_TYPES.SUPPLIER_CONCENTRATION_RISK,
    category: DECISION_CATEGORIES.PAYABLES,
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
            urgency: 'MEDIUM_TERM',
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
      return `${evidence.concentration}% of your purchases (₦${evidence.topSupplierPurchases.toLocaleString()}) are from ${evidence.topSupplierName}. Consider diversifying your supplier base to reduce dependency risk.`;
    }
  },

  // ============================================================
  // PAYABLE_OPTIMIZATION
  // ============================================================
  {
    id: 'PAYABLE_OPTIMIZATION',
    type: DECISION_TYPES.PAYABLE_OPTIMIZATION,
    category: DECISION_CATEGORIES.PAYABLES,
    name: 'Payable Optimization',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Payable Optimization Opportunity',
    defaultSummary: 'Payable balance is high relative to monthly purchases.',
    defaultRecommendation: 'Review payment terms and cash flow management.',
    requiredFields: ['payableBalance', 'monthlyPurchases'],

    async evaluate(data) {
      const { payableBalance, monthlyPurchases } = data;

      if (payableBalance && monthlyPurchases && monthlyPurchases > 0) {
        const monthsOfPurchases = payableBalance / monthlyPurchases;

        if (monthsOfPurchases > 3) {
          return {
            triggered: true,
            evidence: {
              payableBalance,
              monthlyPurchases,
              monthsOfPurchases: monthsOfPurchases.toFixed(1),
              excessPayables: payableBalance - (monthlyPurchases * 2)
            },
            impact: {
              financialImpact: payableBalance - (monthlyPurchases * 2),
              description: `${monthsOfPurchases.toFixed(1)} months of purchases in payables`
            },
            urgency: monthsOfPurchases > 5 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { payableBalance, monthsOfPurchases },
            expectedImpact: 'Optimized working capital',
            risks: ['Supplier relationships if not managed well'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `Payable balance is ₦${evidence.payableBalance.toLocaleString()} (${evidence.monthsOfPurchases} months of purchases). Review payment terms and consider optimizing to free up working capital. Target 2 months of purchases (₦${(evidence.monthlyPurchases * 2).toLocaleString()}).`;
    }
  }
];

module.exports = payableRules;