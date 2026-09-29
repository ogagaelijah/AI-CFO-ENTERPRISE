'use strict';

const customerRules = require('../../../../src/application/services/decision/rules/customerRules');
const {
  DECISION_TIMEFRAME,
  DECISION_SEVERITY,
  DECISION_ENTITY,
} = require('../../../../src/application/services/decision/contracts/DecisionContracts');

describe('Customer Rules', () => {
  // ─── Happy-path ─────────────────────────────────────────────

  describe('CUSTOMER_CONCENTRATION_RISK', () => {
    const rule = customerRules.find(
      (r) => r.id === 'CUSTOMER_CONCENTRATION_RISK'
    );

    it('should trigger when single customer exceeds 40% of revenue', async () => {
      const result = await rule.evaluate({
        topCustomerRevenue: 500_000,
        totalRevenue: 1_000_000,
        topCustomerName: 'Customer A',
        customerId: 'cust_1',
        threshold: 0.4,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.concentration).toBe('50.0');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.MEDIUM_TERM);
      expect(result.relatedEntity).toBe(DECISION_ENTITY.CUSTOMER);
    });

    it('should trigger CRITICAL when concentration exceeds 50%', async () => {
      const result = await rule.evaluate({
        topCustomerRevenue: 600_000,
        totalRevenue: 1_000_000,
        topCustomerName: 'Customer A',
        threshold: 0.4,
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL);
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
    });

    it('should not trigger when concentration is below threshold', async () => {
      const result = await rule.evaluate({
        topCustomerRevenue: 300_000,
        totalRevenue: 1_000_000,
        topCustomerName: 'Customer A',
        threshold: 0.4,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('TOP_5_CONCENTRATION', () => {
    const rule = customerRules.find((r) => r.id === 'TOP_5_CONCENTRATION');

    it('should trigger when top 5 customers exceed 60% of revenue', async () => {
      const result = await rule.evaluate({
        top5Revenue: 700_000,
        totalRevenue: 1_000_000,
        top5Names:
          'Customer A, Customer B, Customer C, Customer D, Customer E',
        threshold: 0.6,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.concentration).toBe('70.0');
      expect(result.relatedEntityId).toBe('global'); // FIXED: was '1'
    });

    it('should not trigger when concentration is below threshold', async () => {
      const result = await rule.evaluate({
        top5Revenue: 500_000,
        totalRevenue: 1_000_000,
        top5Names:
          'Customer A, Customer B, Customer C, Customer D, Customer E',
        threshold: 0.6,
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CUSTOMER_REVENUE_DECLINE', () => {
    const rule = customerRules.find(
      (r) => r.id === 'CUSTOMER_REVENUE_DECLINE'
    );

    it('should trigger when customer revenue declines by more than 30%', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        previousRevenue: 100_000,
        currentRevenue: 60_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.decline).toBe('40.0');
      expect(result.evidence.revenueLost).toBe(40_000);
    });

    it('should trigger CRITICAL when decline exceeds 50%', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        previousRevenue: 100_000,
        currentRevenue: 40_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL);
    });

    it('should not trigger when revenue is stable', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        previousRevenue: 100_000,
        currentRevenue: 90_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('HIGH_VALUE_CUSTOMER_RETENTION', () => {
    const rule = customerRules.find(
      (r) => r.id === 'HIGH_VALUE_CUSTOMER_RETENTION'
    );

    it('should trigger when high-value customer is growing', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        revenueGrowth: 0.2,
        customerRevenue: 1_500_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.revenueGrowth).toBe('20.0');
      expect(result.evidence.isHighValue).toBe(true);
      expect(result.severity).toBe(DECISION_SEVERITY.OPPORTUNITY);
    });

    it('should not trigger when customer is not growing enough', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        revenueGrowth: 0.05,
        customerRevenue: 500_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CUSTOMER_CHURN_RISK', () => {
    const rule = customerRules.find((r) => r.id === 'CUSTOMER_CHURN_RISK');

    it('should trigger when customer has not purchased for 60+ days', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        daysSinceLastPurchase: 70,
        customerValue: 100_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.daysSinceLastPurchase).toBe(70);
      expect(result.evidence.riskLevel).toBe('MEDIUM');
    });

    it('should escalate to HIGH risk when inactive for 90+ days', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        daysSinceLastPurchase: 100,
        customerValue: 100_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.riskLevel).toBe('HIGH');
      expect(result.urgency).toBe(DECISION_TIMEFRAME.SHORT_TERM);
      expect(result.severity).toBe(DECISION_SEVERITY.CRITICAL);
    });

    it('should not trigger when customer is active', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        daysSinceLastPurchase: 30,
        customerValue: 100_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CUSTOMER_ACQUISITION_OPPORTUNITY', () => {
    const rule = customerRules.find(
      (r) => r.id === 'CUSTOMER_ACQUISITION_OPPORTUNITY'
    );

    it('should trigger when acquisition is growing', async () => {
      const result = await rule.evaluate({
        newCustomerCount: 25,
        acquisitionGrowth: 0.15,
        acquisitionChannel: 'Social Media',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.acquisitionGrowth).toBe('15.0');
      expect(result.relatedEntityId).toBe('global'); // FIXED: was '1'
    });

    it('should not trigger when acquisition is not growing enough', async () => {
      const result = await rule.evaluate({
        newCustomerCount: 25,
        acquisitionGrowth: 0.05,
        acquisitionChannel: 'Social Media',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = customerRules;

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

    it('CUSTOMER_CONCENTRATION_RISK does not trigger on zero totals', async () => {
      const rule = customerRules.find(
        (r) => r.id === 'CUSTOMER_CONCENTRATION_RISK'
      );
      expect(
        (
          await rule.evaluate({
            topCustomerRevenue: 0,
            totalRevenue: 1_000_000,
            topCustomerName: 'X',
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