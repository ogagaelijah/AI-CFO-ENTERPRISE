/**
 * Receivable Decision Rules
 * 
 * Detects receivable issues and collection opportunities
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
 * Receivable Rule Definitions
 */
const receivableRules = [
  // ============================================================
  // OVERDUE_RECEIVABLES
  // ============================================================
  {
    id: 'OVERDUE_RECEIVABLES',
    type: DECISION_TYPES.OVERDUE_RECEIVABLES,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Overdue Receivables',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Overdue Receivables Alert',
    defaultSummary: 'Accounts receivable are significantly overdue.',
    defaultRecommendation: 'Prioritize collection on overdue accounts.',
    requiredFields: ['overdueAmount', 'totalReceivables', 'daysOverdue'],

    async evaluate(data) {
      const { overdueAmount, totalReceivables, daysOverdue, customerName, customerId } = data;

      if (overdueAmount > 0 && daysOverdue >= 60) {
        const concentration = totalReceivables > 0 ? (overdueAmount / totalReceivables) * 100 : 0;
        const severity = daysOverdue >= 90 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

        return {
          triggered: true,
          evidence: {
            overdueAmount,
            totalReceivables,
            daysOverdue,
            concentration: concentration.toFixed(1),
            customerName: customerName || 'Customer',
            customerId,
            isCritical: daysOverdue >= 90
          },
          impact: {
            financialImpact: overdueAmount,
            description: `₦${overdueAmount.toLocaleString()} overdue for ${daysOverdue} days${customerName ? ` from ${customerName}` : ''}`
          },
          urgency: daysOverdue >= 90 ? 'IMMEDIATE' : 'SHORT_TERM',
          currentState: { overdueAmount, daysOverdue },
          expectedImpact: 'Improved cash flow and reduced bad debt risk',
          risks: ['Bad debt risk', 'Cash flow pressure'],
          relatedEntity: customerId ? 'CUSTOMER' : 'BUSINESS',
          relatedEntityId: customerId || '1'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const customer = evidence.customerName || 'customer';
      const urgency = evidence.isCritical ? '🚨 CRITICAL: ' : '';
      
      return `${urgency}${customer} owes ₦${evidence.overdueAmount.toLocaleString()} which is ${evidence.daysOverdue} days overdue (${evidence.concentration}% of total receivables). Prioritize collection follow-up immediately.`;
    },

    alternatives: [
      'Offer payment plan if customer is struggling',
      'Consider legal action if amount is significant'
    ]
  },

  // ============================================================
  // CRITICAL_OVERDUE
  // ============================================================
  {
    id: 'CRITICAL_OVERDUE',
    type: DECISION_TYPES.CRITICAL_OVERDUE,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Critical Overdue Receivables',
    severity: DECISION_SEVERITY.CRITICAL,
    minConfidence: 85,
    defaultTitle: '🚨 CRITICAL: Severely Overdue Receivables',
    defaultSummary: 'Receivables are over 90 days overdue.',
    defaultRecommendation: 'Immediate collection action required.',
    requiredFields: ['overdueAmount', 'daysOverdue', 'customerName'],

    async evaluate(data) {
      const { overdueAmount, daysOverdue, customerName, customerId, totalReceivables } = data;

      if (overdueAmount > 0 && daysOverdue >= 90) {
        const riskLevel = daysOverdue > 120 ? 'HIGH' : 'MEDIUM';

        return {
          triggered: true,
          evidence: {
            overdueAmount,
            daysOverdue,
            customerName: customerName || 'Customer',
            customerId,
            riskLevel,
            totalReceivables,
            concentration: totalReceivables > 0 ? (overdueAmount / totalReceivables) * 100 : 0
          },
          impact: {
            financialImpact: overdueAmount,
            description: `₦${overdueAmount.toLocaleString()} overdue for ${daysOverdue} days from ${customerName || 'customer'}`
          },
          urgency: 'IMMEDIATE',
          currentState: { overdueAmount, daysOverdue },
          expectedImpact: 'Recovered funds and reduced bad debt risk',
          risks: ['Write-off risk', 'Legal costs'],
          relatedEntity: 'CUSTOMER',
          relatedEntityId: customerId || 'unknown'
        };
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const customer = evidence.customerName || 'customer';
      const risk = evidence.riskLevel === 'HIGH' ? '🛑 HIGH RISK' : '⚠️ MEDIUM RISK';
      
      return `🚨 CRITICAL: ${customer} owes ₦${evidence.overdueAmount.toLocaleString()} which is ${evidence.daysOverdue} days overdue. ${risk} - Immediate collection action required. Consider legal options if no response within 7 days.`;
    }
  },

  // ============================================================
  // CUSTOMER_COLLECTION_PRIORITY
  // ============================================================
  {
    id: 'CUSTOMER_COLLECTION_PRIORITY',
    type: DECISION_TYPES.CUSTOMER_COLLECTION_PRIORITY,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Collection Priority',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Collection Priority Identified',
    defaultSummary: 'High priority customer for collection follow-up.',
    defaultRecommendation: 'Prioritize collection from this customer.',
    requiredFields: ['customerName', 'outstandingAmount', 'daysOverdue', 'customerRiskFactor'],

    async evaluate(data) {
      const { customerName, outstandingAmount, daysOverdue, customerRiskFactor = 1, customerId } = data;

      if (outstandingAmount > 0 && daysOverdue > 30) {
        // Calculate priority score
        const ageFactor = Math.min(daysOverdue / 30, 5);
        const amountScore = Math.min(outstandingAmount / 100000, 5);
        const priorityScore = (ageFactor * 0.4 + amountScore * 0.4 + customerRiskFactor * 0.2);

        if (priorityScore > 3) {
          const priorityLabel = priorityScore > 4.5 ? 'CRITICAL' : 'HIGH';

          return {
            triggered: true,
            evidence: {
              customerName: customerName || 'Customer',
              outstandingAmount,
              daysOverdue,
              customerRiskFactor,
              priorityScore: priorityScore.toFixed(1),
              priorityLabel,
              ageFactor: ageFactor.toFixed(1),
              amountScore: amountScore.toFixed(1)
            },
            impact: {
              financialImpact: outstandingAmount,
              description: `${customerName || 'Customer'} has ${priorityLabel} collection priority (score: ${priorityScore.toFixed(1)})`
            },
            urgency: priorityLabel === 'CRITICAL' ? 'IMMEDIATE' : 'SHORT_TERM',
            currentState: { outstandingAmount, daysOverdue },
            expectedImpact: 'Improved cash collection',
            risks: ['Bad debt risk if not collected'],
            relatedEntity: 'CUSTOMER',
            relatedEntityId: customerId || 'unknown'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `${evidence.customerName} has a ${evidence.priorityLabel} collection priority (score: ${evidence.priorityScore}). Outstanding amount: ₦${evidence.outstandingAmount.toLocaleString()}, ${evidence.daysOverdue} days overdue. Follow up immediately.`;
    }
  },

  // ============================================================
  // AR_AGING_CONCENTRATION
  // ============================================================
  {
    id: 'AR_AGING_CONCENTRATION',
    type: DECISION_TYPES.AR_AGING_CONCENTRATION,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'AR Aging Concentration',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'AR Aging Concentration Risk',
    defaultSummary: 'Significant portion of receivables is over 60 days overdue.',
    defaultRecommendation: 'Prioritize collection on aging accounts.',
    requiredFields: ['agingReport'],

    async evaluate(data) {
      const { agingReport } = data;

      if (!agingReport || !agingReport.buckets) {
        return { triggered: false };
      }

      const { current = 0, days30 = 0, days60 = 0, days90 = 0 } = agingReport.buckets;
      const total = current + days30 + days60 + days90;

      if (total > 0) {
        const over60Percent = ((days60 + days90) / total) * 100;
        const over90Percent = (days90 / total) * 100;

        if (over60Percent > 30) {
          const severity = over90Percent > 20 ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING;

          return {
            triggered: true,
            evidence: {
              totalReceivables: total,
              current,
              days30,
              days60,
              days90,
              over60Percent: over60Percent.toFixed(1),
              over90Percent: over90Percent.toFixed(1),
              concentration: 'significant'
            },
            impact: {
              financialImpact: days60 + days90,
              description: `${over60Percent.toFixed(1)}% of receivables over 60 days overdue`
            },
            urgency: over90Percent > 20 ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { total, days60, days90 },
            expectedImpact: 'Improved aging profile and cash flow',
            risks: ['Bad debt risk', 'Cash flow pressure'],
            relatedEntity: 'BUSINESS',
            relatedEntityId: '1'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      return `${evidence.over60Percent}% of your receivables (₦${evidence.days60.toLocaleString()} + ₦${evidence.days90.toLocaleString()}) are over 60 days overdue. Implement a structured collections process focusing on aging accounts. Consider offering payment plans or discounts for early payment.`;
    }
  },

  // ============================================================
  // CUSTOMER_CREDIT_RISK
  // ============================================================
  {
    id: 'CUSTOMER_CREDIT_RISK',
    type: DECISION_TYPES.CUSTOMER_CREDIT_RISK,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Customer Credit Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Customer Credit Risk Identified',
    defaultSummary: 'Customer shows signs of credit risk.',
    defaultRecommendation: 'Review credit terms and consider tighter controls.',
    requiredFields: ['customerName', 'paymentHistory', 'outstandingAmount', 'creditLimit'],

    async evaluate(data) {
      const { customerName, paymentHistory, outstandingAmount, creditLimit, customerId } = data;

      if (paymentHistory && paymentHistory.length > 0) {
        // Calculate late payment rate
        const latePayments = paymentHistory.filter(p => p.daysLate > 30).length;
        const lateRate = latePayments / paymentHistory.length;

        // Check if outstanding is close to credit limit
        const creditUtilization = creditLimit > 0 ? outstandingAmount / creditLimit : 0;

        if (lateRate > 0.3 || creditUtilization > 0.8) {
          const riskLevel = lateRate > 0.5 || creditUtilization > 0.9 ? 'HIGH' : 'MEDIUM';

          return {
            triggered: true,
            evidence: {
              customerName: customerName || 'Customer',
              lateRate: (lateRate * 100).toFixed(1),
              creditUtilization: (creditUtilization * 100).toFixed(1),
              outstandingAmount,
              creditLimit,
              riskLevel,
              latePayments
            },
            impact: {
              financialImpact: outstandingAmount,
              description: `${customerName || 'Customer'} has ${riskLevel} credit risk (${lateRate * 100}% late payments, ${creditUtilization * 100}% credit utilization)`
            },
            urgency: riskLevel === 'HIGH' ? 'SHORT_TERM' : 'MEDIUM_TERM',
            currentState: { lateRate, creditUtilization },
            expectedImpact: 'Reduced credit risk and bad debt',
            risks: ['Potential default', 'Bad debt'],
            relatedEntity: 'CUSTOMER',
            relatedEntityId: customerId || 'unknown'
          };
        }
      }

      return { triggered: false };
    },

    generateRecommendation(evidence) {
      const customer = evidence.customerName || 'Customer';
      let recommendation = `${customer} has ${evidence.riskLevel} credit risk: ${evidence.lateRate}% late payments`;
      
      if (evidence.creditLimit) {
        recommendation += `, using ${evidence.creditUtilization}% of credit limit (₦${evidence.outstandingAmount.toLocaleString()}/${evidence.creditLimit.toLocaleString()})`;
      }
      
      recommendation += '. Review credit terms and consider requiring advance payments or reducing credit limit.';
      return recommendation;
    }
  }
];

module.exports = receivableRules;