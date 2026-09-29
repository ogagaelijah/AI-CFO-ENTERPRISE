'use strict';

const profitabilityRules = require('../../../../src/application/services/decision/rules/profitabilityRules');

describe('Profitability Rules', () => {
  // ─── Happy-path tests ───────────────────────────────────────

  describe('GROSS_MARGIN_DECLINE', () => {
    const rule = profitabilityRules.find((r) => r.id === 'GROSS_MARGIN_DECLINE');

    it('should trigger when gross margin drops by more than 5%', async () => {
      const result = await rule.evaluate({
        currentGrossMargin: 0.25,
        previousGrossMargin: 0.35,
        revenue: 1_000_000,
        cogs: 750_000,
        productName: 'Product A',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.currentGrossMargin).toBe('25.0');
      expect(result.evidence.previousGrossMargin).toBe('35.0');
      expect(result.evidence.declinePercent).toBe('28.6');
      expect(result.severity).toBe('WARNING');
    });

    it('should trigger CRITICAL when decline exceeds 10%', async () => {
      const result = await rule.evaluate({
        currentGrossMargin: 0.2,
        previousGrossMargin: 0.35,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should not trigger when margin is stable', async () => {
      const result = await rule.evaluate({
        currentGrossMargin: 0.33,
        previousGrossMargin: 0.35,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('NET_PROFIT_DECLINE', () => {
    const rule = profitabilityRules.find((r) => r.id === 'NET_PROFIT_DECLINE');

    it('should trigger when net profit declines by more than 20%', async () => {
      const result = await rule.evaluate({
        currentProfit: 80_000,
        previousProfit: 120_000,
        revenue: 1_000_000,
        expenses: 920_000,
        revenueGrowth: 0.05,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.profitDecline).toBe('33.3');
      expect(result.urgency).toBe('SHORT_TERM'); // <-- FIXED: was MEDIUM_TERM
      expect(result.relatedEntityId).toBe('global');
    });

    it('should trigger CRITICAL when decline exceeds 40%', async () => {
      const result = await rule.evaluate({
        currentProfit: 50_000,
        previousProfit: 120_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should not trigger when profit is growing', async () => {
      const result = await rule.evaluate({
        currentProfit: 150_000,
        previousProfit: 120_000,
        revenue: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('REVENUE_GROWTH_PROFIT_DECLINE', () => {
    const rule = profitabilityRules.find(
      (r) => r.id === 'REVENUE_GROWTH_PROFIT_DECLINE'
    );

    it('should trigger when revenue grows but profit declines', async () => {
      const result = await rule.evaluate({
        revenueGrowth: 0.1,
        profitGrowth: -0.08,
        revenue: 1_000_000,
        profit: 80_000,
        period: 'month',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.revenueGrowth).toBe('10.0');
      expect(result.evidence.profitGrowth).toBe('-8.0');
      expect(result.urgency).toBe('SHORT_TERM');
    });

    it('should not trigger when both revenue and profit are growing', async () => {
      const result = await rule.evaluate({
        revenueGrowth: 0.1,
        profitGrowth: 0.05,
        revenue: 1_000_000,
        profit: 80_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('PRODUCT_PROFITABILITY_ALERT', () => {
    const rule = profitabilityRules.find(
      (r) => r.id === 'PRODUCT_PROFITABILITY_ALERT'
    );

    it('should trigger when product margin is significantly below average', async () => {
      const result = await rule.evaluate({
        productMargin: 0.15,
        averageMargin: 0.3,
        productName: 'Product A',
        productRevenue: 500_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.productMargin).toBe('15.0');
      expect(result.evidence.averageMargin).toBe('30.0');
      expect(result.evidence.gapPercent).toBe('50.0');
    });

    it('should not trigger when product is close to average margin', async () => {
      const result = await rule.evaluate({
        productMargin: 0.28,
        averageMargin: 0.3,
        productName: 'Product A',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('MARGIN_IMPROVEMENT_OPPORTUNITY', () => {
    const rule = profitabilityRules.find(
      (r) => r.id === 'MARGIN_IMPROVEMENT_OPPORTUNITY'
    );

    it('should trigger when margins are trending upward', async () => {
      const result = await rule.evaluate({
        marginTrend: 0.03,
        currentMargin: 0.28,
        previousMargin: 0.25,
        period: 'month',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.marginTrend).toBe('3.0');
      expect(result.evidence.improvement).toBe('3.0');
      expect(result.severity).toBe('OPPORTUNITY');
    });

    it('should not trigger when margins are declining', async () => {
      const result = await rule.evaluate({
        marginTrend: -0.03,
        currentMargin: 0.22,
        previousMargin: 0.25,
        period: 'month',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge-case / invalid input coverage ─────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = profitabilityRules;

    it('every rule safely returns { triggered: false } for null/undefined/empty', async () => {
      for (const rule of allRules) {
        expect((await rule.evaluate()).triggered).toBe(false);
        expect((await rule.evaluate(null)).triggered).toBe(false);
        expect((await rule.evaluate(undefined)).triggered).toBe(false);
        expect((await rule.evaluate({})).triggered).toBe(false);
      }
    });

    it('every rule tolerates non-object data without throwing', async () => {
      const badInputs = [42, 'string', true, false, [], () => {}];
      for (const rule of allRules) {
        for (const bad of badInputs) {
          await expect(rule.evaluate(bad)).resolves.toEqual(
            expect.objectContaining({ triggered: false })
          );
        }
      }
    });

    it('GROSS_MARGIN_DECLINE does not trigger when previousGrossMargin is zero', async () => {
      const rule = profitabilityRules.find(
        (r) => r.id === 'GROSS_MARGIN_DECLINE'
      );
      const result = await rule.evaluate({
        currentGrossMargin: 0.2,
        previousGrossMargin: 0,
        revenue: 1_000_000,
      });
      expect(result.triggered).toBe(false);
    });

    it('NET_PROFIT_DECLINE does not trigger when previousProfit is zero or negative', async () => {
      const rule = profitabilityRules.find((r) => r.id === 'NET_PROFIT_DECLINE');
      expect(
        (
          await rule.evaluate({
            currentProfit: 10_000,
            previousProfit: 0,
            revenue: 100_000,
          })
        ).triggered
      ).toBe(false);
    });

    it('REVENUE_GROWTH_PROFIT_DECLINE requires both conditions', async () => {
      const rule = profitabilityRules.find(
        (r) => r.id === 'REVENUE_GROWTH_PROFIT_DECLINE'
      );
      // revenue growth too small
      expect(
        (
          await rule.evaluate({
            revenueGrowth: 0.02,
            profitGrowth: -0.1,
            revenue: 1_000_000,
            profit: 50_000,
          })
        ).triggered
      ).toBe(false);
    });

    it('PRODUCT_PROFITABILITY_ALERT does not trigger when averageMargin is zero', async () => {
      const rule = profitabilityRules.find(
        (r) => r.id === 'PRODUCT_PROFITABILITY_ALERT'
      );
      const result = await rule.evaluate({
        productMargin: 0.1,
        averageMargin: 0,
        productName: 'X',
        productRevenue: 100_000,
      });
      expect(result.triggered).toBe(false);
    });

    it('generateRecommendation returns default when evidence is null/undefined', () => {
      for (const rule of allRules) {
        if (typeof rule.generateRecommendation === 'function') {
          expect(rule.generateRecommendation(null)).toBe(
            rule.defaultRecommendation
          );
          expect(rule.generateRecommendation(undefined)).toBe(
            rule.defaultRecommendation
          );
        }
      }
    });
  });
});