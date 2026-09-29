'use strict';

const pricingRules = require('../../../../src/application/services/decision/rules/pricingRules');

describe('Pricing Rules', () => {
  // ─── Happy-path tests ───────────────────────────────────────

  describe('MARGIN_COMPRESSION', () => {
    const rule = pricingRules.find((r) => r.id === 'MARGIN_COMPRESSION');

    it('should trigger when margin declines > 20%', async () => {
      const result = await rule.evaluate({
        currentMargin: 0.25,
        previousMargin: 0.40,
        revenue: 10_000_000,
        costOfGoodsSold: 7_500_000,
        productName: 'Widget A',
        productId: 'prod_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.declinePercentage).toBe('37.5');
      expect(result.severity).toBe('WARNING');
      expect(result.urgency).toBe('SHORT_TERM');
      expect(result.relatedEntity).toBe('PRODUCT');
    });

    it('should escalate to CRITICAL when decline > 40%', async () => {
      const result = await rule.evaluate({
        currentMargin: 0.20,
        previousMargin: 0.40,
        revenue: 5_000_000,
        costOfGoodsSold: 4_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should not trigger on small declines', async () => {
      const result = await rule.evaluate({
        currentMargin: 0.38,
        previousMargin: 0.40,
        revenue: 1_000_000,
        costOfGoodsSold: 620_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('BELOW_TARGET_MARGIN', () => {
    const rule = pricingRules.find((r) => r.id === 'BELOW_TARGET_MARGIN');

    it('should trigger when margin is significantly below target', async () => {
      const result = await rule.evaluate({
        currentMargin: 0.20,
        targetMargin: 0.30,
        productName: 'Widget B',
        productId: 'prod_2',
        revenue: 2_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.gapPercent).toBe('33.3');
      expect(result.urgency).toBe('SHORT_TERM');
    });

    it('should not trigger when gap is small', async () => {
      const result = await rule.evaluate({
        currentMargin: 0.29,
        targetMargin: 0.30,
        productName: 'Widget C',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('PRICE_BELOW_COST', () => {
    const rule = pricingRules.find((r) => r.id === 'PRICE_BELOW_COST');

    it('should trigger CRITICAL when selling below cost', async () => {
      const result = await rule.evaluate({
        sellingPrice: 800,
        averageCost: 1000,
        quantitySold: 50,
        productName: 'Loss Leader',
        productId: 'prod_3',
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('CRITICAL');
      expect(result.urgency).toBe('IMMEDIATE');
      expect(result.evidence.lossPerUnit).toBe(200);
      expect(result.evidence.totalLoss).toBe(10_000);
      expect(result.evidence.lossPercent).toBe('20.0');
    });

    it('should not trigger when price is above cost', async () => {
      const result = await rule.evaluate({
        sellingPrice: 1200,
        averageCost: 1000,
        productName: 'Healthy',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('PRICE_INCREASE_OPPORTUNITY', () => {
    const rule = pricingRules.find((r) => r.id === 'PRICE_INCREASE_OPPORTUNITY');

    it('should trigger when demand is strong and price increase is modest', async () => {
      const result = await rule.evaluate({
        currentMargin: 0.25,
        targetMargin: 0.30,
        demandTrend: 0.10,
        productName: 'Hot Item',
        productId: 'prod_4',
        revenue: 5_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('OPPORTUNITY');
      expect(result.evidence.requiredPriceIncrease).toBeDefined();
    });

    it('should not trigger when demand is weak', async () => {
      const result = await rule.evaluate({
        currentMargin: 0.25,
        targetMargin: 0.30,
        demandTrend: 0.01,
        productName: 'Slow Item',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('DISCOUNT_EFFECTIVENESS', () => {
    const rule = pricingRules.find((r) => r.id === 'DISCOUNT_EFFECTIVENESS');

    it('should trigger when discount produces weak volume response', async () => {
      const result = await rule.evaluate({
        discountRate: 0.10,
        volumeChange: 0.08,
        marginImpact: -0.04,
        productName: 'Discounted Item',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.effectiveness).toBe('poor');
    });

    it('should not trigger when volume response is strong', async () => {
      const result = await rule.evaluate({
        discountRate: 0.10,
        volumeChange: 0.25,
        marginImpact: -0.03,
        productName: 'Effective Discount',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('PRICE_SENSITIVITY_ALERT', () => {
    const rule = pricingRules.find((r) => r.id === 'PRICE_SENSITIVITY_ALERT');

    it('should trigger when elasticity is high', async () => {
      const result = await rule.evaluate({
        priceIncrease: 0.10,
        volumeDecline: -0.25,
        productName: 'Sensitive Item',
        productId: 'prod_5',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.elasticity).toBe('2.50');
      expect(result.severity).toBe('WARNING');
    });

    it('should escalate to CRITICAL for very high elasticity', async () => {
      const result = await rule.evaluate({
        priceIncrease: 0.05,
        volumeDecline: -0.20,
        productName: 'Very Sensitive',
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should not trigger for mild sensitivity', async () => {
      const result = await rule.evaluate({
        priceIncrease: 0.10,
        volumeDecline: -0.10,
        productName: 'Normal',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge-case / invalid input coverage ─────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = pricingRules;

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

    it('MARGIN_COMPRESSION does not trigger when previousMargin is zero', async () => {
      const rule = pricingRules.find((r) => r.id === 'MARGIN_COMPRESSION');
      const result = await rule.evaluate({
        currentMargin: 0.10,
        previousMargin: 0,
        revenue: 1_000_000,
        costOfGoodsSold: 900_000,
      });
      expect(result.triggered).toBe(false);
    });

    it('PRICE_BELOW_COST does not trigger when prices are zero or negative', async () => {
      const rule = pricingRules.find((r) => r.id === 'PRICE_BELOW_COST');
      expect(
        (await rule.evaluate({ sellingPrice: 0, averageCost: 100, productName: 'X' }))
          .triggered
      ).toBe(false);
      expect(
        (await rule.evaluate({
          sellingPrice: 100,
          averageCost: 0,
          productName: 'X',
        })).triggered
      ).toBe(false);
    });

    it('PRICE_INCREASE_OPPORTUNITY does not trigger when required increase would be huge', async () => {
      const rule = pricingRules.find(
        (r) => r.id === 'PRICE_INCREASE_OPPORTUNITY'
      );
      const result = await rule.evaluate({
        currentMargin: 0.10,
        targetMargin: 0.50,
        demandTrend: 0.20,
        productName: 'Big Gap',
      });
      // required increase would be large → should not trigger
      expect(result.triggered).toBe(false);
    });

    it('DISCOUNT_EFFECTIVENESS does not trigger on tiny discounts', async () => {
      const rule = pricingRules.find((r) => r.id === 'DISCOUNT_EFFECTIVENESS');
      const result = await rule.evaluate({
        discountRate: 0.02,
        volumeChange: 0.01,
        marginImpact: -0.01,
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