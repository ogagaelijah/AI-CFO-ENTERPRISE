'use strict';

const payableRules = require('../../../../src/application/services/decision/rules/payableRules');
const {
  DECISION_TIMEFRAME,
  DECISION_SEVERITY,
  DECISION_ENTITY,
} = require('../../../../src/application/services/decision/contracts/DecisionContracts');

describe('Payable Rules', () => {
  // ─── Happy-path tests ───────────────────────────────────────

  describe('SUPPLIER_PAYMENT_OVERDUE', () => {
    const rule = payableRules.find((r) => r.id === 'SUPPLIER_PAYMENT_OVERDUE');

    it('should trigger when supplier payments are overdue by 45+ days', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        daysOverdue: 50,
        supplierName: 'Supplier A',
        supplierId: 'supp_1',
        totalPayables: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.overdueAmount).toBe(500_000);
      expect(result.evidence.daysOverdue).toBe(50);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM); // FIXED
      expect(result.relatedEntity).toBe(DECISION_ENTITY.SUPPLIER); // FIXED
    });

    it('should mark URGENT when overdue by 60+ days', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        daysOverdue: 65,
        supplierName: 'Supplier A',
        totalPayables: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.isUrgent).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
    });

    it('should not trigger when payments are current', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        daysOverdue: 20,
        supplierName: 'Supplier A',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SUPPLIER_PAYMENT_URGENCY', () => {
    const rule = payableRules.find((r) => r.id === 'SUPPLIER_PAYMENT_URGENCY');

    it('should trigger for critical supplier payments overdue by 45+ days', async () => {
      const result = await rule.evaluate({
        supplierName: 'Critical Supplier A',
        overdueAmount: 500_000,
        daysOverdue: 50,
        isCriticalSupplier: true,
        supplierId: 'supp_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.isCriticalSupplier).toBe(true);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM); // FIXED
    });

    it('should escalate to CRITICAL when overdue by 60+ days', async () => {
      const result = await rule.evaluate({
        supplierName: 'Critical Supplier A',
        overdueAmount: 500_000,
        daysOverdue: 65,
        isCriticalSupplier: true,
        supplierId: 'supp_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL); // FIXED
      expect(result.urgency).toBe(DECISION_TIMEFRAME.IMMEDIATE); // FIXED
    });

    it('should not trigger for non-critical suppliers', async () => {
      const result = await rule.evaluate({
        supplierName: 'Supplier A',
        overdueAmount: 500_000,
        daysOverdue: 50,
        isCriticalSupplier: false,
        supplierId: 'supp_1',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('PAYABLE_NEGOTIATION_OPPORTUNITY', () => {
    const rule = payableRules.find(
      (r) => r.id === 'PAYABLE_NEGOTIATION_OPPORTUNITY'
    );

    it('should trigger when cash position is strong', async () => {
      const result = await rule.evaluate({
        cashPosition: 3_000_000,
        totalPayables: 1_000_000,
        suppliers: [
          { name: 'Supplier A' },
          { name: 'Supplier B' },
          { name: 'Supplier C' },
        ],
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.ratio).toBe('3.0');
      expect(result.evidence.topSuppliers).toContain('Supplier A');
      expect(result.relatedEntityId).toBe('global');
    });

    it('should not trigger when cash is weak', async () => {
      const result = await rule.evaluate({
        cashPosition: 500_000,
        totalPayables: 1_000_000,
        suppliers: [{ name: 'Supplier A' }],
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('SUPPLIER_CONCENTRATION_RISK', () => {
    const rule = payableRules.find(
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

  describe('PAYABLE_OPTIMIZATION', () => {
    const rule = payableRules.find((r) => r.id === 'PAYABLE_OPTIMIZATION');

    it('should trigger when payables exceed 3 months of purchases', async () => {
      const result = await rule.evaluate({
        payableBalance: 4_000_000,
        monthlyPurchases: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.monthsOfPurchases).toBe('4.0');
      expect(result.evidence.excessPayables).toBe(2_000_000);
    });

    it('should not trigger when payables are reasonable', async () => {
      const result = await rule.evaluate({
        payableBalance: 1_500_000,
        monthlyPurchases: 1_000_000,
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge-case / invalid input coverage ─────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = payableRules;

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

    it('SUPPLIER_PAYMENT_OVERDUE does not trigger on zero amount', async () => {
      const rule = payableRules.find(
        (r) => r.id === 'SUPPLIER_PAYMENT_OVERDUE'
      );
      const result = await rule.evaluate({
        overdueAmount: 0,
        daysOverdue: 60,
        supplierName: 'X',
      });
      expect(result.triggered).toBe(false);
    });

    it('PAYABLE_NEGOTIATION_OPPORTUNITY requires suppliers list', async () => {
      const rule = payableRules.find(
        (r) => r.id === 'PAYABLE_NEGOTIATION_OPPORTUNITY'
      );
      const result = await rule.evaluate({
        cashPosition: 5_000_000,
        totalPayables: 1_000_000,
        suppliers: [],
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