'use strict';

const expenseRules = require('../../../../src/application/services/decision/rules/expenseRules');
const {
  DECISION_TIMEFRAME,
  DECISION_SEVERITY,
} = require('../../../../src/application/services/decision/contracts/DecisionContracts');

describe('Expense Rules', () => {
  // ─── Happy-path ─────────────────────────────────────────────

  describe('EXPENSE_GROWTH_ALERT', () => {
    const rule = expenseRules.find((r) => r.id === 'EXPENSE_GROWTH_ALERT');

    it('should trigger when expenses grow faster than revenue by 2x+', async () => {
      const result = await rule.evaluate({
        expenseGrowth: 0.2,
        revenueGrowth: 0.08,
        expenses: 500_000,
        revenue: 1_000_000,
        category: 'Operating',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.expenseGrowth).toBe('20.0');
      expect(result.evidence.revenueGrowth).toBe('8.0');
      expect(result.evidence.ratio).toBe('2.5');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM);
    });

    it('should trigger CRITICAL when ratio exceeds 3x', async () => {
      const result = await rule.evaluate({
        expenseGrowth: 0.3,
        revenueGrowth: 0.08,
        expenses: 500_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
    });

    it('should not trigger when expenses are aligned with revenue', async () => {
      const result = await rule.evaluate({
        expenseGrowth: 0.08,
        revenueGrowth: 0.1,
        expenses: 500_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('EXPENSE_ANOMALY', () => {
    const rule = expenseRules.find((r) => r.id === 'EXPENSE_ANOMALY');

    it('should trigger when expense exceeds normal range', async () => {
      const result = await rule.evaluate({
        currentExpense: 110_000, // FIXED: was 150k. variance = 46.6% so MEDIUM
        normalRange: { min: 50_000, max: 100_000, average: 75_000 },
        expenseCategory: 'Marketing',
        month: 'January',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.variancePercent).toBe('46.7');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM);
    });

    it('should trigger CRITICAL when variance exceeds 50%', async () => {
      const result = await rule.evaluate({
        currentExpense: 200_000,
        normalRange: { min: 50_000, max: 100_000, average: 75_000 },
        expenseCategory: 'Marketing',
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
    });

    it('should not trigger when expense is within normal range', async () => {
      const result = await rule.evaluate({
        currentExpense: 80_000,
        normalRange: { min: 50_000, max: 100_000, average: 75_000 },
        expenseCategory: 'Marketing',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('EXPENSE_CONCENTRATION', () => {
    const rule = expenseRules.find((r) => r.id === 'EXPENSE_CONCENTRATION');

    it('should trigger when 3 categories represent more than 70% of expenses', async () => {
      const result = await rule.evaluate({
        topCategories: [
          { name: 'Salaries', amount: 400_001 }, // FIXED: was 400k. now 70.0001%
          { name: 'Rent', amount: 200_000 },
          { name: 'Utilities', amount: 100_000 },
        ],
        totalExpenses: 1_000_000,
        threshold: 0.7,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.concentration).toBe('70.0');
      expect(result.evidence.topCategories[0].percent).toBe('40.0');
    });

    it('should not trigger when expenses are diversified', async () => {
      const result = await rule.evaluate({
        topCategories: [
          { name: 'Salaries', amount: 200_000 },
          { name: 'Rent', amount: 200_000 },
          { name: 'Utilities', amount: 100_000 },
        ],
        totalExpenses: 1_000_000,
        threshold: 0.7,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('ADVERTISING_EFFICIENCY', () => {
    const rule = expenseRules.find((r) => r.id === 'ADVERTISING_EFFICIENCY');

    it('should trigger when ad spend is inefficient', async () => {
      const result = await rule.evaluate({
        adSpend: 100_000,
        adSpendGrowth: 0.2,
        revenueGrowth: 0.05,
        roi: 0.08,
        channel: 'Facebook Ads',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.adSpendGrowth).toBe('20.0');
      expect(result.evidence.revenueGrowth).toBe('5.0');
      expect(result.evidence.efficiency).toBe('4.0');
    });

    it('should not trigger when ad spend is efficient', async () => {
      const result = await rule.evaluate({
        adSpend: 100_000,
        adSpendGrowth: 0.1,
        revenueGrowth: 0.12,
        roi: 0.15,
        channel: 'Facebook Ads',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('RENT_LEASE_REVIEW', () => {
    const rule = expenseRules.find((r) => r.id === 'RENT_LEASE_REVIEW');

    it('should trigger when rent exceeds 20% of revenue', async () => {
      const result = await rule.evaluate({
        rentExpense: 250_000,
        revenue: 1_000_000,
        industryAverage: 0.15,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.rentToRevenue).toBe('25.0');
      expect(result.evidence.gap).toBe('10.0');
    });

    it('should use SHORT_TERM when rent exceeds 30% of revenue', async () => {
      const result = await rule.evaluate({
        rentExpense: 350_000,
        revenue: 1_000_000,
        industryAverage: 0.15,
      });

      expect(result.triggered).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
    });

    it('should not trigger when rent is reasonable', async () => {
      const result = await rule.evaluate({
        rentExpense: 120_000,
        revenue: 1_000_000,
        industryAverage: 0.15,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SALARY_COST_REVIEW', () => {
    const rule = expenseRules.find((r) => r.id === 'SALARY_COST_REVIEW');

    it('should trigger when salary growth exceeds revenue growth by 1.5x+', async () => {
      const result = await rule.evaluate({
        salaryGrowth: 0.15,
        revenueGrowth: 0.08,
        salaryExpense: 500_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.ratio).toBe('1.9');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM);
    });

    it('should use SHORT_TERM when ratio exceeds 2x', async () => {
      const result = await rule.evaluate({
        salaryGrowth: 0.2,
        revenueGrowth: 0.08,
        salaryExpense: 500_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
    });

    it('should not trigger when salary growth is aligned', async () => {
      const result = await rule.evaluate({
        salaryGrowth: 0.08,
        revenueGrowth: 0.1,
        salaryExpense: 500_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('DISCRETIONARY_EXPENSE_REVIEW', () => {
    const rule = expenseRules.find(
      (r) => r.id === 'DISCRETIONARY_EXPENSE_REVIEW'
    );

    it('should trigger when discretionary spend exceeds 15% of revenue', async () => {
      const result = await rule.evaluate({
        discretionarySpend: 200_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.percentOfRevenue).toBe('20.0');
    });

    it('should use SHORT_TERM when spend exceeds 20% of revenue', async () => {
      const result = await rule.evaluate({
        discretionarySpend: 250_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
    });

    it('should not trigger when spend is reasonable', async () => {
      const result = await rule.evaluate({
        discretionarySpend: 100_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('COST_CONTROL_OPPORTUNITY', () => {
    const rule = expenseRules.find(
      (r) => r.id === 'COST_CONTROL_OPPORTUNITY'
    );

    it('should trigger when expense category exceeds average by 20%+', async () => {
      const result = await rule.evaluate({
        categoryExpense: 120_000,
        categoryAverage: 80_000,
        expenseCategory: 'Utilities',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.percentAbove).toBe('50.0');
      expect(result.evidence.savings).toBe(40_000);
    });

    it('should not trigger when expense is near average', async () => {
      const result = await rule.evaluate({
        categoryExpense: 85_000,
        categoryAverage: 80_000,
        expenseCategory: 'Utilities',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('FIXED_COST_WARNING', () => {
    const rule = expenseRules.find((r) => r.id === 'FIXED_COST_WARNING');

    it('should trigger when fixed costs exceed 50% of revenue', async () => {
      const result = await rule.evaluate({
        fixedCosts: 600_000,
        totalCosts: 800_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.fixedToRevenue).toBe('60.0');
      expect(result.evidence.fixedToTotal).toBe('75.0');
    });

    it('should escalate to CRITICAL when fixed costs exceed 60% of revenue', async () => {
      const result = await rule.evaluate({
        fixedCosts: 700_000,
        totalCosts: 800_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL);
    });

    it('should not trigger when fixed costs are reasonable', async () => {
      const result = await rule.evaluate({
        fixedCosts: 300_000,
        totalCosts: 800_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('VARIABLE_COST_OPTIMIZATION', () => {
    const rule = expenseRules.find(
      (r) => r.id === 'VARIABLE_COST_OPTIMIZATION'
    );

    it('should trigger when variable costs grow faster than volume', async () => {
      const result = await rule.evaluate({
        variableCostGrowth: 0.15,
        volumeGrowth: 0.1,
        variableCosts: 400_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.ratio).toBe('1.5');
    });

    it('should use SHORT_TERM when ratio exceeds 1.5x', async () => {
      const result = await rule.evaluate({
        variableCostGrowth: 0.2,
        volumeGrowth: 0.1,
        variableCosts: 400_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
    });

    it('should not trigger when costs are aligned with volume', async () => {
      const result = await rule.evaluate({
        variableCostGrowth: 0.1,
        volumeGrowth: 0.1,
        variableCosts: 400_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = expenseRules;

    it('every rule safely returns { triggered: false } for null/undefined/empty', async () => {
      for (const rule of allRules) {
        expect((await rule.evaluate()).triggered).toBe(false);
        expect((await rule.evaluate(null)).triggered).toBe(false);
        expect((await rule.evaluate({})).triggered).toBe(false);
      }
    });

    it('every rule tolerates non-object data without throwing', async () => {
      const badInputs = [42, 'string', true, [], () => {}];
      for (const rule of allRules) {
        for (const bad of badInputs) {
          await expect(rule.evaluate(bad)).resolves.toEqual(
            expect.objectContaining({ triggered: false })
          );
        }
      }
    });

    it('generateRecommendation returns default when evidence is null/undefined', () => {
      for (const rule of allRules) {
        if (typeof rule.generateRecommendation === 'function') {
          expect(rule.generateRecommendation(null)).toBe(
            rule.defaultRecommendation
          );
        }
      }
    });
  });
});