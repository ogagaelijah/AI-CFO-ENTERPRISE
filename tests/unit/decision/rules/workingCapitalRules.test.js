'use strict';

const workingCapitalRules = require('../../../../src/application/services/decision/rules/workingCapitalRules');
const {
  DECISION_TIMEFRAME,
  DECISION_SEVERITY,
} = require('../../../../src/application/services/decision/contracts/DecisionContracts');

describe('Working Capital Rules', () => {
  // ─── Happy-path ─────────────────────────────────────────────

  describe('WORKING_CAPITAL_PRESSURE', () => {
    const rule = workingCapitalRules.find(
      (r) => r.id === 'WORKING_CAPITAL_PRESSURE'
    );

    it('should trigger when working capital is under pressure', async () => {
      const result = await rule.evaluate({
        receivables: 500_000,
        inventory: 300_000,
        cash: 100_000,
        trend: -0.1,
        period: 'month',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.pressure).toBe('88.9');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
      expect(result.relatedEntityId).toBe('global');
    });

    it('should not trigger when working capital is healthy', async () => {
      const result = await rule.evaluate({
        receivables: 200_000,
        inventory: 200_000,
        cash: 600_000,
        trend: 0.05,
        period: 'month',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('WORKING_CAPITAL_OPTIMIZATION', () => {
    const rule = workingCapitalRules.find(
      (r) => r.id === 'WORKING_CAPITAL_OPTIMIZATION'
    );

    it('should trigger when receivables exceed payables by 2x+', async () => {
      const result = await rule.evaluate({
        receivables: 800_000,
        payables: 300_000,
        inventory: 400_000,
        cash: 200_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.ratio).toBe('2.7');
    });

    it('should not trigger when receivables and payables are balanced', async () => {
      const result = await rule.evaluate({
        receivables: 400_000,
        payables: 400_000,
        inventory: 400_000,
        cash: 200_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CASH_CONVERSION_CYCLE_LENGTHENING', () => {
    const rule = workingCapitalRules.find(
      (r) => r.id === 'CASH_CONVERSION_CYCLE_LENGTHENING'
    );

    it('should trigger when CCC increases by more than 10 days', async () => {
      const result = await rule.evaluate({
        cccHistory: [{ value: 30 }, { value: 35 }, { value: 45 }],
        currentCCC: 45,
        periods: 3,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.increase).toBe('15.0');
    });

    it('should use SHORT_TERM when increase exceeds 15 days', async () => {
      const result = await rule.evaluate({
        cccHistory: [{ value: 30 }, { value: 38 }, { value: 50 }],
        currentCCC: 50,
        periods: 3,
      });

      expect(result.triggered).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
    });

    it('should not trigger when CCC is stable', async () => {
      const result = await rule.evaluate({
        cccHistory: [{ value: 30 }, { value: 30 }, { value: 30 }],
        currentCCC: 30,
        periods: 3,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('LIQUIDITY_RISK', () => {
    const rule = workingCapitalRules.find((r) => r.id === 'LIQUIDITY_RISK');

    it('should trigger when current ratio is below 1.2', async () => {
      const result = await rule.evaluate({
        currentAssets: 1_000_000,
        currentLiabilities: 900_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.currentRatio).toBe('1.11');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
    });

    it('should escalate to CRITICAL when current ratio is below 1.0', async () => {
      const result = await rule.evaluate({
        currentAssets: 800_000,
        currentLiabilities: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL); // FIXED
      expect(result.urgency).toBe(DECISION_TIMEFRAME.IMMEDIATE); // FIXED
    });

    it('should not trigger when current ratio is healthy', async () => {
      const result = await rule.evaluate({
        currentAssets: 1_500_000,
        currentLiabilities: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('QUICK_RATIO_WARNING', () => {
    const rule = workingCapitalRules.find(
      (r) => r.id === 'QUICK_RATIO_WARNING'
    );

    it('should trigger when quick ratio is below 0.8', async () => {
      const result = await rule.evaluate({
        cash: 300_000,
        receivables: 200_000,
        currentLiabilities: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.quickRatio).toBe('0.50');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.IMMEDIATE); // FIXED
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL); // FIXED
    });

    it('should not trigger when quick ratio is healthy', async () => {
      const result = await rule.evaluate({
        cash: 600_000,
        receivables: 400_000,
        currentLiabilities: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('OPERATING_LEVERAGE_RISK', () => {
    const rule = workingCapitalRules.find(
      (r) => r.id === 'OPERATING_LEVERAGE_RISK'
    );

    it('should trigger when fixed costs exceed 60% of total costs', async () => {
      const result = await rule.evaluate({
        fixedCosts: 700_000,
        totalCosts: 1_000_000,
        revenue: 1_500_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.fixedPercentage).toBe('70.0');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM); // FIXED
    });

    it('should use SHORT_TERM when fixed costs exceed 75%', async () => {
      const result = await rule.evaluate({
        fixedCosts: 800_000,
        totalCosts: 1_000_000,
        revenue: 1_500_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
    });

    it('should not trigger when fixed costs are reasonable', async () => {
      const result = await rule.evaluate({
        fixedCosts: 400_000,
        totalCosts: 1_000_000,
        revenue: 1_500_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = workingCapitalRules;

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

    it('CASH_CONVERSION_CYCLE_LENGTHENING returns false for short history', async () => {
      const rule = workingCapitalRules.find(
        (r) => r.id === 'CASH_CONVERSION_CYCLE_LENGTHENING'
      );
      const result = await rule.evaluate({
        cccHistory: [{ value: 30 }],
        periods: 3,
      });
      expect(result.triggered).toBe(false);
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