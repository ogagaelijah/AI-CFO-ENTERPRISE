'use strict';

const growthRules = require('../../../../src/application/services/decision/rules/growthRules');
const {
  DECISION_SEVERITY,
  DECISION_ENTITY,
} = require('../../../../src/application/services/decision/contracts/DecisionContracts');

describe('Growth Rules', () => {
  // ─── Happy-path ─────────────────────────────────────────────

  describe('REVENUE_GROWTH_OPPORTUNITY', () => {
    const rule = growthRules.find(
      (r) => r.id === 'REVENUE_GROWTH_OPPORTUNITY'
    );

    it('should trigger when revenue growth exceeds 15%', async () => {
      const result = await rule.evaluate({
        revenueGrowth: 0.2,
        revenue: 1_000_000,
        growthDrivers: ['New Customers', 'Product Expansion'],
        period: 'month',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.revenueGrowth).toBe('20.0');
      expect(result.evidence.growthDrivers).toHaveLength(2);
      expect(result.severity).toBe(DECISION_SEVERITY.OPPORTUNITY); // FIXED
      expect(result.relatedEntityId).toBe('global');
    });

    it('should not trigger when growth is below 15%', async () => {
      const result = await rule.evaluate({
        revenueGrowth: 0.1,
        revenue: 1_000_000,
        growthDrivers: ['New Customers'],
        period: 'month',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('PRODUCT_GROWTH_LEADER', () => {
    const rule = growthRules.find((r) => r.id === 'PRODUCT_GROWTH_LEADER');

    it('should trigger when product growth exceeds 25%', async () => {
      const result = await rule.evaluate({
        productName: 'Product A',
        productGrowth: 0.3,
        productRevenue: 500_000,
        productId: 'prod_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.productGrowth).toBe('30.0');
      expect(result.evidence.isStar).toBe(false);
      expect(result.relatedEntity).toBe(DECISION_ENTITY.PRODUCT); // FIXED
    });

    it('should mark STAR when growth exceeds 50%', async () => {
      const result = await rule.evaluate({
        productName: 'Product A',
        productGrowth: 0.6,
        productRevenue: 500_000,
        productId: 'prod_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.isStar).toBe(true);
    });

    it('should not trigger when growth is below 25%', async () => {
      const result = await rule.evaluate({
        productName: 'Product A',
        productGrowth: 0.15,
        productRevenue: 500_000,
        productId: 'prod_1',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('MARKET_EXPANSION_SIGNAL', () => {
    const rule = growthRules.find(
      (r) => r.id === 'MARKET_EXPANSION_SIGNAL'
    );

    it('should trigger when new customers and repeat purchases are healthy', async () => {
      const result = await rule.evaluate({
        newCustomers: 50,
        repeatPurchaseRate: 0.35,
        marketIndicators: ['Growing demand', 'Positive reviews'],
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.repeatPurchaseRate).toBe('35.0');
      expect(result.evidence.expansionReady).toBe(false);
    });

    it('should mark expansionReady when repeat purchase rate > 40%', async () => {
      const result = await rule.evaluate({
        newCustomers: 50,
        repeatPurchaseRate: 0.45,
        marketIndicators: ['Growing demand', 'Positive reviews'],
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.expansionReady).toBe(true);
    });

    it('should not trigger when repeat purchase rate is low', async () => {
      const result = await rule.evaluate({
        newCustomers: 50,
        repeatPurchaseRate: 0.2,
        marketIndicators: ['Growing demand'],
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = growthRules;

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

    it('PRODUCT_GROWTH_LEADER does not trigger on zero revenue', async () => {
      const rule = growthRules.find((r) => r.id === 'PRODUCT_GROWTH_LEADER');
      const result = await rule.evaluate({
        productName: 'X',
        productGrowth: 0.4,
        productRevenue: 0,
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