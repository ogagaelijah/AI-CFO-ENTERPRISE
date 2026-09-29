'use strict';

const supplierRules = require('../../../../src/application/services/decision/rules/supplierRules');
const {
  DECISION_TIMEFRAME,
  DECISION_SEVERITY,
  DECISION_ENTITY,
} = require('../../../../src/application/services/decision/contracts/DecisionContracts');

describe('Supplier Rules', () => {
  // ─── Happy-path ─────────────────────────────────────────────

  describe('SUPPLIER_CONCENTRATION_RISK', () => {
    const rule = supplierRules.find(
      (r) => r.id === 'SUPPLIER_CONCENTRATION_RISK'
    );

    it('should trigger when single supplier exceeds 60% of purchases', async () => {
      const result = await rule.evaluate({
        topSupplierPurchases: 700_000,
        totalPurchases: 1_000_000,
        topSupplierName: 'Supplier A',
        supplierId: 'supp_1',
        threshold: 0.6,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.concentration).toBe('70.0');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM); // FIXED
      expect(result.relatedEntity).toBe(DECISION_ENTITY.SUPPLIER); // FIXED
    });

    it('should trigger CRITICAL when concentration exceeds 75%', async () => {
      const result = await rule.evaluate({
        topSupplierPurchases: 800_000,
        totalPurchases: 1_000_000,
        topSupplierName: 'Supplier A',
        threshold: 0.6,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL); // FIXED
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
    });

    it('should not trigger when concentration is below threshold', async () => {
      const result = await rule.evaluate({
        topSupplierPurchases: 400_000,
        totalPurchases: 1_000_000,
        topSupplierName: 'Supplier A',
        threshold: 0.6,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SUPPLIER_COST_INCREASE', () => {
    const rule = supplierRules.find((r) => r.id === 'SUPPLIER_COST_INCREASE');

    it('should trigger when supplier cost increases by more than 10%', async () => {
      const result = await rule.evaluate({
        supplierName: 'Supplier A',
        costIncrease: 0.15,
        category: 'Raw Materials',
        purchaseVolume: 1_000_000,
        supplierId: 'supp_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.costIncrease).toBe('15.0');
      expect(result.evidence.impact).toBe(150_000);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM); // FIXED
      expect(result.relatedEntityId).toBe('supp_1');
    });

    it('should trigger CRITICAL when increase exceeds 20%', async () => {
      const result = await rule.evaluate({
        supplierName: 'Supplier A',
        costIncrease: 0.25,
        category: 'Raw Materials',
        purchaseVolume: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL); // FIXED
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
    });

    it('should not trigger when increase is minimal', async () => {
      const result = await rule.evaluate({
        supplierName: 'Supplier A',
        costIncrease: 0.05,
        category: 'Raw Materials',
        purchaseVolume: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SUPPLIER_PAYMENT_NEGOTIATION', () => {
    const rule = supplierRules.find(
      (r) => r.id === 'SUPPLIER_PAYMENT_NEGOTIATION'
    );

    it('should trigger when high volume with strong relationship', async () => {
      const result = await rule.evaluate({
        supplierName: 'Supplier A',
        purchaseVolume: 2_000_000,
        relationshipStrength: 0.8,
        supplierId: 'supp_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.relationshipStrength).toBe('80.0');
      expect(result.evidence.purchaseVolume).toBe(2_000_000);
      expect(result.severity).toBe(DECISION_SEVERITY.OPPORTUNITY); // FIXED
    });

    it('should not trigger when volume is low', async () => {
      const result = await rule.evaluate({
        supplierName: 'Supplier A',
        purchaseVolume: 500_000,
        relationshipStrength: 0.8,
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger when relationship is weak', async () => {
      const result = await rule.evaluate({
        supplierName: 'Supplier A',
        purchaseVolume: 2_000_000,
        relationshipStrength: 0.5,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SUPPLIER_DIVERSIFICATION', () => {
    const rule = supplierRules.find(
      (r) => r.id === 'SUPPLIER_DIVERSIFICATION'
    );

    it('should trigger when high concentration in volatile industry', async () => {
      const result = await rule.evaluate({
        topSupplierConcentration: 0.6,
        industryVolatility: 0.6,
        supplierNames: 'Supplier A, Supplier B',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.concentration).toBe('60.0');
      expect(result.evidence.industryVolatility).toBe('60.0');
      expect(result.evidence.riskLevel).toBe('HIGH');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
      expect(result.relatedEntityId).toBe('global');
    });

    it('should not trigger when concentration is low', async () => {
      const result = await rule.evaluate({
        topSupplierConcentration: 0.4,
        industryVolatility: 0.6,
        supplierNames: 'Supplier A, Supplier B',
      });

      expect(result.triggered).toBe(false);
    });

    it('should not trigger when industry is stable', async () => {
      const result = await rule.evaluate({
        topSupplierConcentration: 0.6,
        industryVolatility: 0.3,
        supplierNames: 'Supplier A, Supplier B',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = supplierRules;

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

    it('SUPPLIER_CONCENTRATION_RISK does not trigger on zero totals', async () => {
      const rule = supplierRules.find(
        (r) => r.id === 'SUPPLIER_CONCENTRATION_RISK'
      );
      expect(
        (
          await rule.evaluate({
            topSupplierPurchases: 0,
            totalPurchases: 1_000_000,
            topSupplierName: 'X',
          })
        ).triggered
      ).toBe(false);
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