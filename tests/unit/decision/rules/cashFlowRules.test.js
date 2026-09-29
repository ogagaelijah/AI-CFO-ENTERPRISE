'use strict';

const cashFlowRules = require('../../../../src/application/services/decision/rules/cashFlowRules');

describe('Cash Flow Rules', () => {
  describe('CASH_FLOW_WARNING', () => {
    const rule = cashFlowRules.find((r) => r.id === 'CASH_FLOW_WARNING');

    it('should trigger when projected cash is below minimum threshold', async () => {
      const result = await rule.evaluate({
        currentCash: 300000,
        projectedCash: 200000,
        minimumCashThreshold: 500000,
        cashTrend: -0.1,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.shortfall).toBe(300000);
      expect(result.urgency).toBe('SHORT_TERM');
      expect(result.severity).toBe('CRITICAL'); // 200k is 40% of 500k, so CRITICAL per rule logic
    });

    it('should trigger CRITICAL + IMMEDIATE when projected cash is well below threshold', async () => {
      const result = await rule.evaluate({
        currentCash: 150000,
        projectedCash: 100000,
        minimumCashThreshold: 500000,
        cashTrend: -0.2,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.shortfall).toBe(400000);
      expect(result.urgency).toBe('IMMEDIATE');
      expect(result.severity).toBe('CRITICAL');
    });

    it('should trigger when cash trend is declining rapidly (even above threshold)', async () => {
      const result = await rule.evaluate({
        currentCash: 500000,
        projectedCash: 400000,
        minimumCashThreshold: 300000,
        cashTrend: -0.2,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.cashTrend).toBe('-20.0');
    });

    it('should not trigger when cash position is healthy', async () => {
      const result = await rule.evaluate({
        currentCash: 1000000,
        projectedCash: 800000,
        minimumCashThreshold: 500000,
        cashTrend: 0.05,
      });

      expect(result.triggered).toBe(false);
    });

    it('should generate recommendation with shortfall', () => {
      const recommendation = rule.generateRecommendation({ shortfall: 300000 });
      expect(recommendation).toContain('₦300,000');
      expect(recommendation).toContain('bridge financing');
    });

    it('should generate general recommendation when no shortfall', () => {
      const recommendation = rule.generateRecommendation({});
      expect(recommendation).toContain('Review cash flow management');
    });
  });

  describe('CASH_TREND_DECLINE', () => {
    const rule = cashFlowRules.find((r) => r.id === 'CASH_TREND_DECLINE');

    it('should trigger when cash is declining significantly', async () => {
      const result = await rule.evaluate({
        cashHistory: [
          { date: '2026-01-01', value: 1000000 },
          { date: '2026-01-15', value: 800000 },
          { date: '2026-02-01', value: 600000 },
        ],
        currentCash: 600000,
        period: 30,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.declinePercentage).toBe('-40.0');
    });

    it('should not trigger with insufficient data', async () => {
      const result = await rule.evaluate({
        cashHistory: [
          { date: '2026-01-01', value: 1000000 },
          { date: '2026-01-15', value: 800000 },
        ],
        currentCash: 800000,
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger when cash is stable', async () => {
      const result = await rule.evaluate({
        cashHistory: [
          { date: '2026-01-01', value: 1000000 },
          { date: '2026-01-15', value: 1000000 },
          { date: '2026-02-01', value: 1000000 },
        ],
        currentCash: 1000000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CASH_SHORTAGE_PROJECTION', () => {
    const rule = cashFlowRules.find((r) => r.id === 'CASH_SHORTAGE_PROJECTION');

    it('should trigger when projected cash is negative', async () => {
      const result = await rule.evaluate({
        currentCash: 500000,
        projectedCash: -100000,
        dailyBurnRate: 50000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.shortfall).toBe(100000);
      expect(result.urgency).toBe('IMMEDIATE');
    });

    it('should trigger when days to zero is less than 30', async () => {
      const result = await rule.evaluate({
        currentCash: 500000,
        daysToZero: 10,
        dailyBurnRate: 50000,
      });

      expect(result.triggered).toBe(true);
      expect(result.urgency).toBe('IMMEDIATE');
    });

    it('should not trigger when cash is sufficient', async () => {
      const result = await rule.evaluate({
        currentCash: 5000000,
        projectedCash: 4000000,
        dailyBurnRate: 50000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('NEGATIVE_CASH_FLOW', () => {
    const rule = cashFlowRules.find((r) => r.id === 'NEGATIVE_CASH_FLOW');

    it('should trigger when cash flow is negative for multiple periods', async () => {
      const result = await rule.evaluate({
        cashFlowHistory: [
          { period: 'Jan', value: -100000 },
          { period: 'Feb', value: -150000 },
          { period: 'Mar', value: -200000 },
        ],
        periods: 3,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.totalNegative).toBe(450000);
    });

    it('should not trigger when cash flow is positive', async () => {
      const result = await rule.evaluate({
        cashFlowHistory: [
          { period: 'Jan', value: 100000 },
          { period: 'Feb', value: 150000 },
          { period: 'Mar', value: 200000 },
        ],
        periods: 3,
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger with insufficient data', async () => {
      const result = await rule.evaluate({
        cashFlowHistory: [{ period: 'Jan', value: -100000 }],
        periods: 3,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('DISCRETIONARY_SPENDING_REVIEW', () => {
    const rule = cashFlowRules.find((r) => r.id === 'DISCRETIONARY_SPENDING_REVIEW');

    it('should trigger when cash declining and discretionary spending high', async () => {
      const result = await rule.evaluate({
        cashTrend: -0.1,
        expenseTrend: 0.1,
        discretionarySpending: 200000,
        totalExpenses: 1000000,
        revenueTrend: 0.05,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.discretionaryPercent).toBe('20.0');
    });

    it('should not trigger when discretionary spending is low', async () => {
      const result = await rule.evaluate({
        cashTrend: -0.1,
        expenseTrend: 0.1,
        discretionarySpending: 50000,
        totalExpenses: 1000000,
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger when cash is not declining', async () => {
      const result = await rule.evaluate({
        cashTrend: 0.05,
        expenseTrend: 0.1,
        discretionarySpending: 200000,
        totalExpenses: 1000000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('COLLECTION_ACCELERATION', () => {
    const rule = cashFlowRules.find((r) => r.id === 'COLLECTION_ACCELERATION');

    it('should trigger when receivables are high and cash is low', async () => {
      const result = await rule.evaluate({
        currentCash: 200000,
        outstandingReceivables: 1000000,
        averageCollectionDays: 45,
        targetCollectionDays: 30,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.daysOverdue).toBe(15);
    });

    it('should not trigger when collection days are on target', async () => {
      const result = await rule.evaluate({
        currentCash: 200000,
        outstandingReceivables: 1000000,
        averageCollectionDays: 25,
        targetCollectionDays: 30,
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger when cash is sufficient', async () => {
      const result = await rule.evaluate({
        currentCash: 5000000,
        outstandingReceivables: 1000000,
        averageCollectionDays: 45,
        targetCollectionDays: 30,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SUPPLIER_PAYMENT_REVIEW', () => {
    const rule = cashFlowRules.find((r) => r.id === 'SUPPLIER_PAYMENT_REVIEW');

    it('should trigger when upcoming payments will deplete cash buffer', async () => {
      const result = await rule.evaluate({
        currentCash: 500000,
        upcomingPayments: [
          { amount: 200000 },
          { amount: 150000 },
          { amount: 100000 },
        ],
        cashBuffer: 500000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.cashAfterPayments).toBe(50000);
      expect(result.evidence.shortfall).toBe(450000);
    });

    it('should not trigger when cash is sufficient', async () => {
      const result = await rule.evaluate({
        currentCash: 2000000,
        upcomingPayments: [
          { amount: 200000 },
          { amount: 150000 },
          { amount: 100000 },
        ],
        cashBuffer: 500000,
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger with no upcoming payments', async () => {
      const result = await rule.evaluate({
        currentCash: 500000,
        upcomingPayments: [],
        cashBuffer: 500000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CASH_CONCENTRATION_RISK', () => {
    const rule = cashFlowRules.find((r) => r.id === 'CASH_CONCENTRATION_RISK');

    it('should trigger when single source exceeds threshold', async () => {
      const result = await rule.evaluate({
        topInflowSource: 'Customer A',
        topInflowAmount: 700000,
        totalInflows: 1000000,
        threshold: 0.6,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.concentration).toBe('70.0');
    });

    it('should not trigger when concentration is below threshold', async () => {
      const result = await rule.evaluate({
        topInflowSource: 'Customer A',
        topInflowAmount: 400000,
        totalInflows: 1000000,
        threshold: 0.6,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CASH_BUFFER_EROSION', () => {
    const rule = cashFlowRules.find((r) => r.id === 'CASH_BUFFER_EROSION');

    it('should trigger when buffer is declining for 3+ periods', async () => {
      const result = await rule.evaluate({
        bufferHistory: [
          { value: 1000000 },
          { value: 800000 },
          { value: 600000 },
        ],
        currentBuffer: 600000,
        periods: 3,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.declinePercent).toBe('40.0');
    });

    it('should not trigger when buffer is stable', async () => {
      const result = await rule.evaluate({
        bufferHistory: [
          { value: 1000000 },
          { value: 1000000 },
          { value: 1000000 },
        ],
        currentBuffer: 1000000,
        periods: 3,
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger with insufficient data', async () => {
      const result = await rule.evaluate({
        bufferHistory: [{ value: 1000000 }, { value: 800000 }],
        currentBuffer: 800000,
        periods: 3,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('INVESTMENT_OPPORTUNITY', () => {
    const rule = cashFlowRules.find((r) => r.id === 'INVESTMENT_OPPORTUNITY');

    it('should trigger when cash exceeds 6 months of expenses', async () => {
      const result = await rule.evaluate({
        currentCash: 10000000,
        monthlyExpenses: 1000000,
        investmentOptions: [{ name: 'Investment A' }],
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.monthsOfExpenses).toBe('10.0');
      expect(result.evidence.excessCash).toBe(4000000);
    });

    it('should not trigger when cash is not excessive', async () => {
      const result = await rule.evaluate({
        currentCash: 3000000,
        monthlyExpenses: 1000000,
      });

      expect(result.triggered).toBe(false);
    });

    it('should include investment options in recommendation', () => {
      const recommendation = rule.generateRecommendation({
        excessCash: 4000000,
        monthsOfExpenses: '10.0',
        investmentOptions: 3,
      });
      expect(recommendation).toContain('investing in high-return opportunities');
    });
  });
});