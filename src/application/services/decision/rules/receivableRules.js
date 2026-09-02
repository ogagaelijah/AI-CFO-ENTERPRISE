'use strict';

/**
 * Receivable Decision Rules
 * Path: src/application/services/decision/rules/receivableRules.js
 * SSOT: DecisionContracts
 * @version 2.1.0-prod
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
const receivableRules = Object.freeze([
  // ============================================================
  // OVERDUE_RECEIVABLES
  // ============================================================
  Object.freeze({
    id: 'OVERDUE_RECEIVABLES',
    type: DECISION_TYPES.OVERDUE_RECEIVABLES,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Overdue Receivables',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 75,
    defaultTitle: 'Overdue Receivables Alert',
    defaultSummary: 'Accounts receivable are significantly overdue.',
    defaultRecommendation: 'Prioritize collection on overdue accounts.',
    requiredFields: Object.freeze([
      'overdueAmount',
      'totalReceivables',
      'daysOverdue',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const overdueAmount = toNumber(data.overdueAmount);
      const totalReceivables = toNumber(data.totalReceivables);
      const daysOverdue = toNumber(data.daysOverdue);
      const customerName = data.customerName || 'Customer';
      const customerId = data.customerId || 'unknown';

      if (overdueAmount > 0 && daysOverdue >= 60) {
        const concentration =
          totalReceivables > 0
            ? (overdueAmount / totalReceivables) * 100
            : 0;
        const severity =
          daysOverdue >= 90
            ? DECISION_SEVERITY.CRITICAL
            : DECISION_SEVERITY.WARNING;
        const urgency =
          daysOverdue >= 90
            ? DECISION_TIMEFRAME.IMMEDIATE
            : DECISION_TIMEFRAME.SHORT_TERM;

        return Object.freeze({
          triggered: true,
          severity,
          evidence: Object.freeze({
            overdueAmount,
            totalReceivables,
            daysOverdue,
            concentration: concentration.toFixed(1),
            customerName,
            customerId,
            isCritical: daysOverdue >= 90,
          }),
          impact: Object.freeze({
            financialImpact: overdueAmount,
            description: `${NGN.format(
              overdueAmount
            )} overdue for ${daysOverdue} days${
              customerId !== 'unknown' ? ` from ${customerName}` : ''
            }`,
          }),
          urgency,
          currentState: Object.freeze({ overdueAmount, daysOverdue }),
          expectedImpact: 'Improved cash flow and reduced bad debt risk',
          risks: Object.freeze(['Bad debt risk', 'Cash flow pressure']),
          relatedEntity:
            customerId !== 'unknown'
              ? DECISION_ENTITY.CUSTOMER
              : DECISION_ENTITY.BUSINESS,
          relatedEntityId:
            customerId !== 'unknown' ? customerId : 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const customer = evidence.customerName || 'Customer';
      const urgency = evidence.isCritical ? '🚨 CRITICAL: ' : '';
      return `${urgency}${customer} owes ${NGN.format(
        evidence.overdueAmount
      )} which is ${evidence.daysOverdue} days overdue (${
        evidence.concentration
      }% of total receivables). Prioritize collection follow-up immediately.`;
    },
  }),

  // ============================================================
  // CRITICAL_OVERDUE
  // ============================================================
  Object.freeze({
    id: 'CRITICAL_OVERDUE',
    type: DECISION_TYPES.CRITICAL_OVERDUE,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Critical Overdue Receivables',
    severity: DECISION_SEVERITY.CRITICAL,
    minConfidence: 85,
    defaultTitle: '🚨 CRITICAL: Severely Overdue Receivables',
    defaultSummary: 'Receivables are over 90 days overdue.',
    defaultRecommendation: 'Immediate collection action required.',
    requiredFields: Object.freeze([
      'overdueAmount',
      'daysOverdue',
      'customerName',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const overdueAmount = toNumber(data.overdueAmount);
      const daysOverdue = toNumber(data.daysOverdue);
      const customerName = data.customerName || 'Customer';
      const customerId = data.customerId || 'unknown';
      const totalReceivables = toNumber(data.totalReceivables);

      if (overdueAmount > 0 && daysOverdue >= 90) {
        const riskLevel = daysOverdue > 120 ? 'HIGH' : 'MEDIUM';
        const concentration =
          totalReceivables > 0
            ? (overdueAmount / totalReceivables) * 100
            : 0;

        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.CRITICAL,
          evidence: Object.freeze({
            overdueAmount,
            daysOverdue,
            customerName,
            customerId,
            riskLevel,
            totalReceivables,
            concentration: concentration.toFixed(1),
          }),
          impact: Object.freeze({
            financialImpact: overdueAmount,
            description: `${NGN.format(
              overdueAmount
            )} overdue for ${daysOverdue} days from ${customerName}`,
          }),
          urgency: DECISION_TIMEFRAME.IMMEDIATE,
          currentState: Object.freeze({ overdueAmount, daysOverdue }),
          expectedImpact: 'Recovered funds and reduced bad debt risk',
          risks: Object.freeze(['Write-off risk', 'Legal costs']),
          relatedEntity: DECISION_ENTITY.CUSTOMER,
          relatedEntityId: customerId,
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const customer = evidence.customerName || 'Customer';
      const risk =
        evidence.riskLevel === 'HIGH' ? '🛑 HIGH RISK' : '⚠️ MEDIUM RISK';
      return `🚨 CRITICAL: ${customer} owes ${NGN.format(
        evidence.overdueAmount
      )} which is ${evidence.daysOverdue} days overdue. ${risk} - Immediate collection action required. Consider legal options if no response within 7 days.`;
    },
  }),

  // ============================================================
  // CUSTOMER_COLLECTION_PRIORITY
  // ============================================================
  Object.freeze({
    id: 'CUSTOMER_COLLECTION_PRIORITY',
    type: DECISION_TYPES.CUSTOMER_COLLECTION_PRIORITY,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Collection Priority',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Collection Priority Identified',
    defaultSummary: 'High priority customer for collection follow-up.',
    defaultRecommendation: 'Prioritize collection from this customer.',
    requiredFields: Object.freeze([
      'customerName',
      'outstandingAmount',
      'daysOverdue',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const customerName = data.customerName || 'Customer';
      const outstandingAmount = toNumber(data.outstandingAmount);
      const daysOverdue = toNumber(data.daysOverdue);
      const customerRiskFactor = toNumber(data.customerRiskFactor, 1);
      const customerId = data.customerId || 'unknown';

      if (outstandingAmount > 0 && daysOverdue > 30) {
        const ageFactor = Math.min(daysOverdue / 30, 5);
        const amountScore = Math.min(outstandingAmount / 100_000, 5);
        const priorityScore =
          ageFactor * 0.4 + amountScore * 0.4 + customerRiskFactor * 0.2;

        if (priorityScore > 3) {
          const priorityLabel =
            priorityScore > 4.5 ? 'CRITICAL' : 'HIGH';
          const urgency =
            priorityLabel === 'CRITICAL'
              ? DECISION_TIMEFRAME.IMMEDIATE
              : DECISION_TIMEFRAME.SHORT_TERM;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              customerName,
              outstandingAmount,
              daysOverdue,
              customerRiskFactor,
              priorityScore: priorityScore.toFixed(1),
              priorityLabel,
              ageFactor: ageFactor.toFixed(1),
              amountScore: amountScore.toFixed(1),
            }),
            impact: Object.freeze({
              financialImpact: outstandingAmount,
              description: `${customerName} has ${priorityLabel} collection priority (score: ${priorityScore.toFixed(
                1
              )})`,
            }),
            urgency,
            currentState: Object.freeze({
              outstandingAmount,
              daysOverdue,
            }),
            expectedImpact: 'Improved cash collection',
            risks: Object.freeze(['Bad debt risk if not collected']),
            relatedEntity: DECISION_ENTITY.CUSTOMER,
            relatedEntityId: customerId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.customerName} has a ${
        evidence.priorityLabel
      } collection priority (score: ${
        evidence.priorityScore
      }). Outstanding amount: ${NGN.format(
        evidence.outstandingAmount
      )}, ${evidence.daysOverdue} days overdue. Follow up immediately.`;
    },
  }),

  // ============================================================
  // AR_AGING_CONCENTRATION
  // ============================================================
  Object.freeze({
    id: 'AR_AGING_CONCENTRATION',
    type: DECISION_TYPES.AR_AGING_CONCENTRATION,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'AR Aging Concentration',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'AR Aging Concentration Risk',
    defaultSummary:
      'Significant portion of receivables is over 60 days overdue.',
    defaultRecommendation: 'Prioritize collection on aging accounts.',
    requiredFields: Object.freeze(['agingReport']),

    async evaluate(data) {
      data = safeData(data);
      const agingReport = data.agingReport;

      if (!agingReport || typeof agingReport !== 'object') {
        return Object.freeze({ triggered: false });
      }

      const buckets = safeData(agingReport.buckets);
      const current = toNumber(buckets.current);
      const days30 = toNumber(buckets.days30);
      const days60 = toNumber(buckets.days60);
      const days90 = toNumber(buckets.days90);
      const total = current + days30 + days60 + days90;

      if (total > 0) {
        const over60Percent = ((days60 + days90) / total) * 100;
        const over90Percent = (days90 / total) * 100;

        if (over60Percent > 30) {
          const severity =
            over90Percent > 20
              ? DECISION_SEVERITY.CRITICAL
              : DECISION_SEVERITY.WARNING;
          const urgency =
            over90Percent > 20
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM;

          return Object.freeze({
            triggered: true,
            severity,
            evidence: Object.freeze({
              totalReceivables: total,
              current,
              days30,
              days60,
              days90,
              over60Percent: over60Percent.toFixed(1),
              over90Percent: over90Percent.toFixed(1),
              concentration: 'significant',
            }),
            impact: Object.freeze({
              financialImpact: days60 + days90,
              description: `${over60Percent.toFixed(
                1
              )}% of receivables over 60 days overdue`,
            }),
            urgency,
            currentState: Object.freeze({ total, days60, days90 }),
            expectedImpact: 'Improved aging profile and cash flow',
            risks: Object.freeze(['Bad debt risk', 'Cash flow pressure']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.over60Percent}% of your receivables (${NGN.format(
        evidence.days60
      )} + ${NGN.format(
        evidence.days90
      )}) are over 60 days overdue. Implement a structured collections process focusing on aging accounts. Consider offering payment plans or discounts for early payment.`;
    },
  }),

  // ============================================================
  // CUSTOMER_CREDIT_RISK
  // ============================================================
  Object.freeze({
    id: 'CUSTOMER_CREDIT_RISK',
    type: DECISION_TYPES.CUSTOMER_CREDIT_RISK,
    category: DECISION_CATEGORIES.RECEIVABLES,
    name: 'Customer Credit Risk',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Customer Credit Risk Identified',
    defaultSummary: 'Customer shows signs of credit risk.',
    defaultRecommendation:
      'Review credit terms and consider tighter controls.',
    requiredFields: Object.freeze([
      'customerName',
      'paymentHistory',
      'outstandingAmount',
      'creditLimit',
    ]),

    async evaluate(data) {
      data = safeData(data);
      const customerName = data.customerName || 'Customer';
      const paymentHistory = Array.isArray(data.paymentHistory)
        ? data.paymentHistory
        : [];
      const outstandingAmount = toNumber(data.outstandingAmount);
      const creditLimit = toNumber(data.creditLimit);
      const customerId = data.customerId || 'unknown';

      if (paymentHistory.length > 0) {
        const latePayments = paymentHistory.filter(
          (p) => toNumber(p?.daysLate) > 30
        ).length;
        const lateRate = latePayments / paymentHistory.length;
        const creditUtilization =
          creditLimit > 0 ? outstandingAmount / creditLimit : 0;

        if (lateRate > 0.3 || creditUtilization > 0.8) {
          const riskLevel =
            lateRate > 0.5 || creditUtilization > 0.9 ? 'HIGH' : 'MEDIUM';
          const urgency =
            riskLevel === 'HIGH'
              ? DECISION_TIMEFRAME.SHORT_TERM
              : DECISION_TIMEFRAME.MEDIUM_TERM;

          return Object.freeze({
            triggered: true,
            severity: DECISION_SEVERITY.WARNING,
            evidence: Object.freeze({
              customerName,
              lateRate: (lateRate * 100).toFixed(1),
              creditUtilization: (creditUtilization * 100).toFixed(1),
              outstandingAmount,
              creditLimit,
              riskLevel,
              latePayments,
            }),
            impact: Object.freeze({
              financialImpact: outstandingAmount,
              description: `${customerName} has ${riskLevel} credit risk (${(
                lateRate * 100
              ).toFixed(1)}% late payments, ${(
                creditUtilization * 100
              ).toFixed(1)}% credit utilization)`,
            }),
            urgency,
            currentState: Object.freeze({ lateRate, creditUtilization }),
            expectedImpact: 'Reduced credit risk and bad debt',
            risks: Object.freeze(['Potential default', 'Bad debt']),
            relatedEntity: DECISION_ENTITY.CUSTOMER,
            relatedEntityId: customerId,
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      const customer = evidence.customerName || 'Customer';
      let recommendation = `${customer} has ${evidence.riskLevel} credit risk: ${evidence.lateRate}% late payments`;
      if (evidence.creditLimit > 0) {
        recommendation += `, using ${
          evidence.creditUtilization
        }% of credit limit (${NGN.format(
          evidence.outstandingAmount
        )}/${NGN.format(evidence.creditLimit)})`;
      }
      recommendation +=
        '. Review credit terms and consider requiring advance payments or reducing credit limit.';
      return recommendation;
    },
  }),
]);

module.exports = receivableRules;