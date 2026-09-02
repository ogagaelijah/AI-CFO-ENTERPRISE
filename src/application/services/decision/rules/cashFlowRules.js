'use strict';

/**
 * Cash Flow Decision Rules
 * Path: src/application/services/decision/rules/cashFlowRules.js
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

const DEFAULT_MIN_CASH_THRESHOLD = 500_000;
const DEFAULT_TARGET_COLLECTION_DAYS = 30;
const DEFAULT_CASH_BUFFER = 500_000;
const DEFAULT_CONCENTRATION_THRESHOLD = 0.6;

// ─── pure helpers ────────────────────────────────────────────
const isValidNumber = (val) =>
  typeof val === 'number' && Number.isFinite(val);

const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const sortByDateAsc = (arr) =>
  [...arr].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

const pct = (ratio) => (ratio * 100).toFixed(1);

// ─── rules ───────────────────────────────────────────────────
const cashFlowRules = Object.freeze([
  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'CASH_FLOW_WARNING',
    type: DECISION_TYPES.CASH_FLOW_WARNING,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Cash Flow Warning',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Projected Cash Pressure Detected',
    defaultSummary: 'Cash position is declining and may reach critical levels.',
    defaultRecommendation:
      'Review discretionary expenses and prioritize collection of outstanding receivables.',
    requiredFields: Object.freeze(['currentCash', 'projectedCash']),

    async evaluate(data = {}) {
      const currentCash = toNumber(data.currentCash);
      const projectedCash = toNumber(data.projectedCash);
      const minimumCashThreshold = toNumber(
        data.minimumCashThreshold,
        DEFAULT_MIN_CASH_THRESHOLD
      );
      const cashTrend = toNumber(data.cashTrend, 0);

      if (!isValidNumber(currentCash) || !isValidNumber(projectedCash)) {
        return Object.freeze({ triggered: false, reason: 'Invalid numeric inputs' });
      }

      // Primary path: projected cash below threshold
      if (projectedCash < minimumCashThreshold) {
        const shortfall = Math.max(0, minimumCashThreshold - projectedCash);
        const severity =
          projectedCash < minimumCashThreshold * 0.5
            ? DECISION_SEVERITY.CRITICAL
            : DECISION_SEVERITY.WARNING;
        const urgency =
          projectedCash < minimumCashThreshold * 0.3
            ? DECISION_TIMEFRAME.IMMEDIATE
            : DECISION_TIMEFRAME.SHORT_TERM;

        return Object.freeze({
          triggered: true,
          severity,
          evidence: Object.freeze({
            currentCash,
            projectedCash,
            minimumCashThreshold,
            cashTrend,
            shortfall,
          }),
          impact: Object.freeze({
            financialImpact: shortfall,
            description: `Cash projected to fall below minimum threshold of ${NGN.format(
              minimumCashThreshold
            )}`,
          }),
          urgency,
          currentState: Object.freeze({ currentCash, projectedCash }),
          expectedImpact: 'Improved liquidity and reduced financial stress',
          risks: Object.freeze([
            'Potential inability to meet obligations',
            'Lost business opportunities',
          ]),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      // Secondary path: rapid decline even if still above threshold
      if (cashTrend < -0.15) {
        return Object.freeze({
          triggered: true,
          severity: DECISION_SEVERITY.WARNING,
          evidence: Object.freeze({
            currentCash,
            cashTrend: pct(cashTrend),
            projectedCash,
            minimumCashThreshold,
          }),
          impact: Object.freeze({
            financialImpact: Math.abs(cashTrend * currentCash),
            description: `Cash declining at ${pct(cashTrend)}% rate`,
          }),
          urgency: DECISION_TIMEFRAME.SHORT_TERM,
          currentState: Object.freeze({ currentCash, cashTrend }),
          expectedImpact: 'Stabilized cash position',
          risks: Object.freeze(['Continued cash depletion', 'Potential cash crisis']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      if (evidence.shortfall && evidence.shortfall > 0) {
        return `Prioritize collection of outstanding receivables and review discretionary expenses. Consider bridge financing of ${NGN.format(
          evidence.shortfall
        )} if necessary.`;
      }
      return 'Review cash flow management and accelerate receivable collection.';
    },

    alternatives: Object.freeze([
      'Consider short-term financing options',
      'Delay non-critical capital expenditures',
      'Negotiate extended payment terms with suppliers',
    ]),
    assumptions: Object.freeze([
      `Minimum cash threshold defaults to ${NGN.format(DEFAULT_MIN_CASH_THRESHOLD)}`,
      'Current spending patterns will continue',
    ]),
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'CASH_TREND_DECLINE',
    type: DECISION_TYPES.CASH_TREND_DECLINE,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Cash Trend Decline',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 60,
    defaultTitle: 'Cash Position Declining',
    defaultSummary: 'Cash has been declining over recent periods.',
    defaultRecommendation: 'Review cash flow drivers and identify areas for improvement.',
    requiredFields: Object.freeze(['cashHistory', 'currentCash']),

    async evaluate(data = {}) {
      const cashHistory = Array.isArray(data.cashHistory) ? data.cashHistory : [];
      const currentCash = toNumber(data.currentCash);
      const period = toNumber(data.period, 30);

      if (cashHistory.length < 3) {
        return Object.freeze({ triggered: false, reason: 'Insufficient history' });
      }

      const sorted = sortByDateAsc(
        cashHistory.filter((h) => h && isValidNumber(h.value) && h.date)
      );
      if (sorted.length < 3) return Object.freeze({ triggered: false });

      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const firstVal = toNumber(first.value);
      if (firstVal <= 0) return Object.freeze({ triggered: false });

      const decline = (toNumber(last.value) - firstVal) / firstVal;

      if (decline < -0.2) {
        return Object.freeze({
          triggered: true,
          evidence: Object.freeze({
            initialCash: firstVal,
            currentCash: toNumber(last.value),
            declinePercentage: pct(decline),
            period,
            dataPoints: sorted.length,
          }),
          impact: Object.freeze({
            financialImpact: Math.abs(toNumber(last.value) - firstVal),
            description: `Cash declined ${pct(decline)}% over ${period} days`,
          }),
          urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
          currentState: Object.freeze({ currentCash, decline }),
          expectedImpact: 'Stabilized or improved cash position',
          risks: Object.freeze(['Continued decline could lead to cash crisis']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Cash declined ${evidence.declinePercentage}% over ${evidence.period} days. Review major cash outflows and identify areas to reduce spending or accelerate inflows.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'CASH_SHORTAGE_PROJECTION',
    type: DECISION_TYPES.CASH_SHORTAGE_PROJECTION,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Cash Shortage Projection',
    severity: DECISION_SEVERITY.CRITICAL,
    minConfidence: 75,
    defaultTitle: '⚠️ CRITICAL: Cash Shortage Projected',
    defaultSummary: 'Cash is projected to run out within the forecast period.',
    defaultRecommendation: 'Immediate action required to secure additional liquidity.',
    requiredFields: Object.freeze(['currentCash']),

    async evaluate(data = {}) {
      const currentCash = toNumber(data.currentCash);
      const projectedCash =
        data.projectedCash !== undefined ? toNumber(data.projectedCash) : undefined;
      const dailyBurnRate = toNumber(data.dailyBurnRate, 0);
      const daysToZero =
        data.daysToZero !== undefined ? toNumber(data.daysToZero) : undefined;

      if (projectedCash !== undefined && projectedCash <= 0) {
        const days =
          daysToZero > 0
            ? daysToZero
            : Math.ceil(currentCash / (dailyBurnRate || 1));

        return Object.freeze({
          triggered: true,
          evidence: Object.freeze({
            currentCash,
            projectedCash,
            dailyBurnRate,
            daysToZero: days,
            shortfall: Math.abs(projectedCash),
          }),
          impact: Object.freeze({
            financialImpact: Math.abs(projectedCash),
            description: `Cash will run out in approximately ${days} days`,
          }),
          urgency: DECISION_TIMEFRAME.IMMEDIATE,
          currentState: Object.freeze({ currentCash, projectedCash }),
          expectedImpact: 'Averted cash crisis',
          risks: Object.freeze([
            'Inability to pay employees',
            'Inability to pay suppliers',
            'Business disruption',
          ]),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      if (daysToZero !== undefined && daysToZero < 30 && daysToZero > 0) {
        return Object.freeze({
          triggered: true,
          evidence: Object.freeze({
            currentCash,
            daysToZero,
            dailyBurnRate,
          }),
          impact: Object.freeze({
            financialImpact: currentCash,
            description: `Cash will run out in ${daysToZero} days`,
          }),
          urgency: DECISION_TIMEFRAME.IMMEDIATE,
          currentState: Object.freeze({ currentCash, daysToZero }),
          expectedImpact: 'Extended cash runway',
          risks: Object.freeze(['Business disruption']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `🚨 CRITICAL: Cash will run out in ${evidence.daysToZero} days. Immediate actions: (1) Accelerate all receivable collections, (2) Freeze non-essential spending, (3) Consider emergency financing.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'NEGATIVE_CASH_FLOW',
    type: DECISION_TYPES.NEGATIVE_CASH_FLOW,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Negative Cash Flow',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Negative Cash Flow Detected',
    defaultSummary: 'Operating cash flow has been negative for multiple periods.',
    defaultRecommendation: 'Review cash flow drivers and identify leakage points.',
    requiredFields: Object.freeze(['cashFlowHistory']),

    async evaluate(data = {}) {
      const cashFlowHistory = Array.isArray(data.cashFlowHistory)
        ? data.cashFlowHistory
        : [];
      const periods = Math.max(2, toNumber(data.periods, 2));

      if (cashFlowHistory.length < periods) {
        return Object.freeze({ triggered: false });
      }

      const lastN = cashFlowHistory
        .slice(-periods)
        .filter((i) => i && isValidNumber(i.value));

      if (lastN.length < periods) return Object.freeze({ triggered: false });

      const allNegative = lastN.every((item) => toNumber(item.value) < 0);
      if (!allNegative) return Object.freeze({ triggered: false });

      const totalNegative = lastN.reduce((sum, item) => sum + toNumber(item.value), 0);
      const averageNegative = totalNegative / periods;

      return Object.freeze({
        triggered: true,
        evidence: Object.freeze({
          periods,
          totalNegative: Math.abs(totalNegative),
          averageNegative: Math.abs(averageNegative),
          periodLength: lastN[0]?.period || 'month',
        }),
        impact: Object.freeze({
          financialImpact: Math.abs(totalNegative),
          description: `Negative cash flow for ${periods} consecutive periods`,
        }),
        urgency: DECISION_TIMEFRAME.SHORT_TERM,
        currentState: Object.freeze({ totalNegative, periods }),
        expectedImpact: 'Positive cash flow restoration',
        risks: Object.freeze(['Cash depletion', 'Increased borrowing']),
        relatedEntity: DECISION_ENTITY.BUSINESS,
        relatedEntityId: 'global',
      });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `You've had negative cash flow for ${evidence.periods} consecutive ${
        evidence.periodLength
      }s totaling ${NGN.format(
        evidence.totalNegative
      )}. Review expenses, accelerate collections, and delay non-essential payments.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'DISCRETIONARY_SPENDING_REVIEW',
    type: DECISION_TYPES.DISCRETIONARY_SPENDING_REVIEW,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Discretionary Spending Review',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Discretionary Spending Review Recommended',
    defaultSummary: 'Cash declining while discretionary expenses are rising.',
    defaultRecommendation: 'Review discretionary spending categories for potential savings.',
    requiredFields: Object.freeze([
      'cashTrend',
      'expenseTrend',
      'discretionarySpending',
    ]),

    async evaluate(data = {}) {
      const cashTrend = toNumber(data.cashTrend);
      const expenseTrend = toNumber(data.expenseTrend);
      const discretionarySpending = toNumber(data.discretionarySpending);
      const totalExpenses = toNumber(data.totalExpenses, 1);

      if (
        cashTrend < -0.05 &&
        expenseTrend > 0.05 &&
        discretionarySpending > 0 &&
        totalExpenses > 0
      ) {
        const discretionaryPercent = discretionarySpending / totalExpenses;
        if (discretionaryPercent > 0.15) {
          return Object.freeze({
            triggered: true,
            evidence: Object.freeze({
              cashTrend: pct(cashTrend),
              expenseTrend: pct(expenseTrend),
              discretionarySpending,
              discretionaryPercent: pct(discretionaryPercent),
              revenueTrend: data.revenueTrend
                ? pct(toNumber(data.revenueTrend))
                : 'unknown',
            }),
            impact: Object.freeze({
              financialImpact: discretionarySpending * 0.2,
              description: `${pct(discretionaryPercent)}% of expenses are discretionary`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ cashTrend, expenseTrend }),
            expectedImpact: 'Reduced cash burn and improved liquidity',
            risks: Object.freeze(['May impact employee morale if cuts are deep']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Cash declining ${evidence.cashTrend}% while expenses rising ${evidence.expenseTrend}%. Discretionary spending is ${evidence.discretionaryPercent}% of total. Review these categories for savings.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'COLLECTION_ACCELERATION',
    type: DECISION_TYPES.COLLECTION_ACCELERATION,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Collection Acceleration',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 70,
    defaultTitle: 'Accelerate Receivable Collections',
    defaultSummary: 'Cash position is low while receivables remain outstanding.',
    defaultRecommendation: 'Prioritize collection of outstanding receivables.',
    requiredFields: Object.freeze([
      'currentCash',
      'outstandingReceivables',
      'averageCollectionDays',
    ]),

    async evaluate(data = {}) {
      const currentCash = toNumber(data.currentCash);
      const outstandingReceivables = toNumber(data.outstandingReceivables);
      const averageCollectionDays = toNumber(data.averageCollectionDays);
      const targetCollectionDays = toNumber(
        data.targetCollectionDays,
        DEFAULT_TARGET_COLLECTION_DAYS
      );

      if (
        outstandingReceivables > currentCash * 3 &&
        averageCollectionDays > targetCollectionDays
      ) {
        const daysOverdue = averageCollectionDays - targetCollectionDays;
        return Object.freeze({
          triggered: true,
          evidence: Object.freeze({
            currentCash,
            outstandingReceivables,
            averageCollectionDays,
            targetCollectionDays,
            daysOverdue,
            cashToReceivablesRatio: currentCash / outstandingReceivables,
          }),
          impact: Object.freeze({
            financialImpact: outstandingReceivables * 0.3,
            description: `Average collection is ${daysOverdue} days over target`,
          }),
          urgency: DECISION_TIMEFRAME.SHORT_TERM,
          currentState: Object.freeze({
            currentCash,
            outstandingReceivables,
            averageCollectionDays,
          }),
          expectedImpact: 'Improved cash position',
          risks: Object.freeze(['Customer relationships may be strained']),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Cash is low (${NGN.format(evidence.currentCash)}) while ${NGN.format(
        evidence.outstandingReceivables
      )} is outstanding. Collection is ${
        evidence.daysOverdue
      } days overdue. Prioritize follow-ups on largest overdue accounts.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'SUPPLIER_PAYMENT_REVIEW',
    type: DECISION_TYPES.SUPPLIER_PAYMENT_REVIEW,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Supplier Payment Review',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Review Supplier Payment Schedule',
    defaultSummary: 'Cash is low but supplier payments are coming due.',
    defaultRecommendation:
      'Review payment schedule and negotiate extended terms if possible.',
    requiredFields: Object.freeze(['currentCash', 'upcomingPayments']),

    async evaluate(data = {}) {
      const currentCash = toNumber(data.currentCash);
      const upcomingPayments = Array.isArray(data.upcomingPayments)
        ? data.upcomingPayments
        : [];
      const cashBuffer = toNumber(data.cashBuffer, DEFAULT_CASH_BUFFER);

      if (upcomingPayments.length === 0) {
        return Object.freeze({ triggered: false });
      }

      const totalUpcoming = upcomingPayments.reduce(
        (sum, p) => sum + toNumber(p?.amount),
        0
      );
      const cashAfterPayments = currentCash - totalUpcoming;

      if (cashAfterPayments < cashBuffer) {
        const shortfall = Math.max(0, cashBuffer - cashAfterPayments);
        return Object.freeze({
          triggered: true,
          evidence: Object.freeze({
            currentCash,
            totalUpcoming,
            cashAfterPayments,
            cashBuffer,
            paymentCount: upcomingPayments.length,
            shortfall,
          }),
          impact: Object.freeze({
            financialImpact: shortfall,
            description: `Cash after payments will be below buffer by ${NGN.format(
              shortfall
            )}`,
          }),
          urgency: DECISION_TIMEFRAME.SHORT_TERM,
          currentState: Object.freeze({ currentCash, totalUpcoming }),
          expectedImpact: 'Maintained cash buffer',
          risks: Object.freeze([
            'Supplier relationship strain',
            'Late payment penalties',
          ]),
          relatedEntity: DECISION_ENTITY.BUSINESS,
          relatedEntityId: 'global',
        });
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.paymentCount} supplier payments totaling ${NGN.format(
        evidence.totalUpcoming
      )} are due. Cash after payments (${NGN.format(
        evidence.cashAfterPayments
      )}) is below buffer (${NGN.format(
        evidence.cashBuffer
      )}). Negotiate extended terms with key suppliers.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'CASH_CONCENTRATION_RISK',
    type: DECISION_TYPES.CASH_CONCENTRATION_RISK,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Cash Concentration Risk',
    severity: DECISION_SEVERITY.INFO,
    minConfidence: 60,
    defaultTitle: 'Cash Concentration Risk Detected',
    defaultSummary: 'A significant portion of cash inflows comes from a single source.',
    defaultRecommendation: 'Consider diversifying revenue or funding sources.',
    requiredFields: Object.freeze(['topInflowAmount', 'totalInflows']),

    async evaluate(data = {}) {
      const topInflowAmount = toNumber(data.topInflowAmount);
      const totalInflows = toNumber(data.totalInflows);
      const threshold = toNumber(data.threshold, DEFAULT_CONCENTRATION_THRESHOLD);

      if (topInflowAmount > 0 && totalInflows > 0) {
        const concentration = topInflowAmount / totalInflows;
        if (concentration > threshold) {
          return Object.freeze({
            triggered: true,
            evidence: Object.freeze({
              topInflowSource: data.topInflowSource || 'Unknown',
              topInflowAmount,
              totalInflows,
              concentration: pct(concentration),
              threshold: pct(threshold),
            }),
            impact: Object.freeze({
              financialImpact: topInflowAmount,
              description: `${pct(concentration)}% of inflows from ${
                data.topInflowSource || 'single source'
              }`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ concentration, topInflowAmount }),
            expectedImpact: 'Reduced revenue dependency risk',
            risks: Object.freeze(['Revenue instability if source is lost']),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `${evidence.concentration}% of cash inflows come from ${evidence.topInflowSource}. Diversify revenue or funding sources to reduce dependency.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'CASH_BUFFER_EROSION',
    type: DECISION_TYPES.CASH_BUFFER_EROSION,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Cash Buffer Erosion',
    severity: DECISION_SEVERITY.WARNING,
    minConfidence: 65,
    defaultTitle: 'Cash Buffer Erosion Detected',
    defaultSummary: 'Cash buffer has been declining for 3 or more periods.',
    defaultRecommendation:
      'Investigate causes and reverse trend before buffer is depleted.',
    requiredFields: Object.freeze(['bufferHistory']),

    async evaluate(data = {}) {
      const bufferHistory = Array.isArray(data.bufferHistory)
        ? data.bufferHistory
        : [];
      const periods = Math.max(3, toNumber(data.periods, 3));

      if (bufferHistory.length < periods) {
        return Object.freeze({ triggered: false });
      }

      const lastN = bufferHistory
        .slice(-periods)
        .filter((h) => h && isValidNumber(h.value));

      if (lastN.length < periods) return Object.freeze({ triggered: false });

      let isDeclining = true;
      for (let i = 1; i < lastN.length; i++) {
        if (toNumber(lastN[i].value) >= toNumber(lastN[i - 1].value)) {
          isDeclining = false;
          break;
        }
      }

      if (!isDeclining) return Object.freeze({ triggered: false });

      const firstValue = toNumber(lastN[0].value);
      const lastValue = toNumber(lastN[lastN.length - 1].value);
      const totalDecline = firstValue - lastValue;
      const declinePercent = firstValue > 0 ? (totalDecline / firstValue) * 100 : 0;

      return Object.freeze({
        triggered: true,
        evidence: Object.freeze({
          periods,
          firstBuffer: firstValue,
          currentBuffer: lastValue,
          totalDecline,
          declinePercent: declinePercent.toFixed(1),
        }),
        impact: Object.freeze({
          financialImpact: totalDecline,
          description: `Buffer declined ${declinePercent.toFixed(1)}% over ${periods} periods`,
        }),
        urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
        currentState: Object.freeze({ currentBuffer: lastValue, declinePercent }),
        expectedImpact: 'Stabilized cash buffer',
        risks: Object.freeze(['Complete buffer depletion', 'Cash crisis']),
        relatedEntity: DECISION_ENTITY.BUSINESS,
        relatedEntityId: 'global',
      });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      return `Your cash buffer declined ${evidence.declinePercent}% over ${evidence.periods} periods. Review cash flow drivers and reverse this trend before buffer is depleted.`;
    },
  }),

  // ──────────────────────────────────────────────────────────
  Object.freeze({
    id: 'INVESTMENT_OPPORTUNITY',
    type: DECISION_TYPES.INVESTMENT_OPPORTUNITY,
    category: DECISION_CATEGORIES.CASH_FLOW,
    name: 'Investment Opportunity',
    severity: DECISION_SEVERITY.OPPORTUNITY,
    minConfidence: 60,
    defaultTitle: 'Investment Opportunity Available',
    defaultSummary: 'Excess cash balance presents investment or growth opportunity.',
    defaultRecommendation:
      'Consider investing excess cash to generate returns or fund growth.',
    requiredFields: Object.freeze(['currentCash', 'monthlyExpenses']),

    async evaluate(data = {}) {
      const currentCash = toNumber(data.currentCash);
      const monthlyExpenses = toNumber(data.monthlyExpenses);
      const investmentOptions = Array.isArray(data.investmentOptions)
        ? data.investmentOptions
        : [];

      if (monthlyExpenses > 0) {
        const monthsOfExpenses = currentCash / monthlyExpenses;
        if (monthsOfExpenses > 6) {
          const excessCash = currentCash - monthlyExpenses * 6;
          return Object.freeze({
            triggered: true,
            evidence: Object.freeze({
              currentCash,
              monthlyExpenses,
              monthsOfExpenses: monthsOfExpenses.toFixed(1),
              excessCash,
              investmentOptions: investmentOptions.length,
            }),
            impact: Object.freeze({
              financialImpact: excessCash,
              description: `${monthsOfExpenses.toFixed(
                1
              )} months of expenses in cash reserves`,
            }),
            urgency: DECISION_TIMEFRAME.MEDIUM_TERM,
            currentState: Object.freeze({ currentCash, monthsOfExpenses }),
            expectedImpact: 'Return on investment or business growth',
            risks: Object.freeze([
              'Investment risk',
              'Reduced liquidity if invested',
            ]),
            relatedEntity: DECISION_ENTITY.BUSINESS,
            relatedEntityId: 'global',
          });
        }
      }

      return Object.freeze({ triggered: false });
    },

    generateRecommendation(evidence) {
      if (!evidence) return this.defaultRecommendation;
      let recommendation = `You have ${NGN.format(
        evidence.excessCash
      )} in excess cash (${evidence.monthsOfExpenses} months of expenses). `;
      recommendation +=
        evidence.investmentOptions > 0
          ? 'Consider investing in high-return opportunities or funding growth initiatives.'
          : 'Consider short-term investments or reinvesting in the business for growth.';
      return recommendation;
    },
  }),
]);

module.exports = cashFlowRules;