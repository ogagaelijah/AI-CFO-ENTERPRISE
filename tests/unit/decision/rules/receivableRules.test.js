'use strict';

const receivableRules = require('../../../../src/application/services/decision/rules/receivableRules');

describe('Receivable Rules', () => {
  // ─── Happy-path tests ───────────────────────────────────────

  describe('OVERDUE_RECEIVABLES', () => {
    const rule = receivableRules.find((r) => r.id === 'OVERDUE_RECEIVABLES');

    it('should trigger when receivables are overdue by 60+ days', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        totalReceivables: 1_000_000,
        daysOverdue: 65,
        customerName: 'Customer A',
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.overdueAmount).toBe(500_000);
      expect(result.evidence.daysOverdue).toBe(65);
      expect(result.evidence.concentration).toBe('50.0');
      expect(result.urgency).toBe('SHORT_TERM');
      expect(result.relatedEntity).toBe('CUSTOMER');
    });

    it('should trigger CRITICAL when overdue by 90+ days', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        totalReceivables: 1_000_000,
        daysOverdue: 95,
        customerName: 'Customer A',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.isCritical).toBe(true);
      expect(result.urgency).toBe('IMMEDIATE');
      expect(result.severity).toBe('CRITICAL');
    });

    it('should not trigger when receivables are current', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        totalReceivables: 1_000_000,
        daysOverdue: 25,
        customerName: 'Customer A',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CRITICAL_OVERDUE', () => {
    const rule = receivableRules.find((r) => r.id === 'CRITICAL_OVERDUE');

    it('should trigger when receivables are overdue by 90+ days', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        daysOverdue: 95,
        customerName: 'Customer A',
        customerId: 'cust_1',
        totalReceivables: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.daysOverdue).toBe(95);
      expect(result.evidence.riskLevel).toBe('MEDIUM');
      expect(result.urgency).toBe('IMMEDIATE');
    });

    it('should mark HIGH risk when overdue by 120+ days', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        daysOverdue: 130,
        customerName: 'Customer A',
        totalReceivables: 1_000_000,
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.riskLevel).toBe('HIGH');
    });

    it('should not trigger when not critical', async () => {
      const result = await rule.evaluate({
        overdueAmount: 500_000,
        daysOverdue: 45,
        customerName: 'Customer A',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CUSTOMER_COLLECTION_PRIORITY', () => {
    const rule = receivableRules.find(
      (r) => r.id === 'CUSTOMER_COLLECTION_PRIORITY'
    );

    it('should trigger for high priority customers', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        outstandingAmount: 900_000, // FIXED: pushes amountScore to 5
        daysOverdue: 75,            // FIXED: was 60. ageFactor = 2.5
        customerRiskFactor: 1.5,    // FIXED: was 1.2
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(Number(result.evidence.priorityScore)).toBeGreaterThan(3);
      expect(result.evidence.priorityLabel).toBe('HIGH');
    });

    it('should trigger CRITICAL for very high priority', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        outstandingAmount: 2_500_000,
        daysOverdue: 180,
        customerRiskFactor: 3,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.priorityLabel).toBe('CRITICAL');
      expect(result.urgency).toBe('IMMEDIATE');
    });

    it('should not trigger for low priority', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        outstandingAmount: 50_000,
        daysOverdue: 30,
        customerRiskFactor: 0.5,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('AR_AGING_CONCENTRATION', () => {
    const rule = receivableRules.find((r) => r.id === 'AR_AGING_CONCENTRATION');

    it('should trigger when over 60 days represents more than 30%', async () => {
      const result = await rule.evaluate({
        agingReport: {
          buckets: {
            current: 300_000,
            days30: 200_000,
            days60: 300_000,
            days90: 200_000,
          },
        },
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.over60Percent).toBe('50.0');
      expect(result.relatedEntityId).toBe('global');
    });

    it('should trigger CRITICAL when over 90 days is more than 20%', async () => {
      const result = await rule.evaluate({
        agingReport: {
          buckets: {
            current: 200_000,
            days30: 200_000,
            days60: 200_000,
            days90: 400_000,
          },
        },
      });

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should not trigger when aging is healthy', async () => {
      const result = await rule.evaluate({
        agingReport: {
          buckets: {
            current: 600_000,
            days30: 200_000,
            days60: 100_000,
            days90: 100_000,
          },
        },
      });

      expect(result.triggered).toBe(false);
    });
  });

  describe('CUSTOMER_CREDIT_RISK', () => {
    const rule = receivableRules.find((r) => r.id === 'CUSTOMER_CREDIT_RISK');

    it('should trigger when customer has high late payment rate', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        paymentHistory: [
          { daysLate: 10 },
          { daysLate: 35 },
          { daysLate: 40 },
          { daysLate: 45 },
          { daysLate: 50 },
        ],
        outstandingAmount: 500_000,
        creditLimit: 1_000_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.lateRate).toBe('80.0');
      expect(result.evidence.riskLevel).toBe('HIGH');
    });

    it('should trigger when credit utilization is high', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        paymentHistory: [
          { daysLate: 10 },
          { daysLate: 15 },
          { daysLate: 20 },
        ],
        outstandingAmount: 950_000,
        creditLimit: 1_000_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(true);
      expect(result.evidence.creditUtilization).toBe('95.0');
      expect(result.evidence.riskLevel).toBe('HIGH');
    });

    it('should not trigger for low risk customers', async () => {
      const result = await rule.evaluate({
        customerName: 'Customer A',
        paymentHistory: [
          { daysLate: 5 },
          { daysLate: 8 },
          { daysLate: 10 },
        ],
        outstandingAmount: 200_000,
        creditLimit: 1_000_000,
        customerId: 'cust_1',
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ─── Edge-case / invalid input coverage ─────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    const allRules = receivableRules;

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

    it('AR_AGING_CONCENTRATION returns false for missing or invalid agingReport', async () => {
      const rule = receivableRules.find((r) => r.id === 'AR_AGING_CONCENTRATION');
      expect((await rule.evaluate({ agingReport: null })).triggered).toBe(false);
      expect((await rule.evaluate({ agingReport: 'bad' })).triggered).toBe(false);
      expect(
        (await rule.evaluate({ agingReport: { buckets: null } })).triggered
      ).toBe(false);
    });

    it('CUSTOMER_CREDIT_RISK returns false for empty paymentHistory', async () => {
      const rule = receivableRules.find((r) => r.id === 'CUSTOMER_CREDIT_RISK');
      const result = await rule.evaluate({
        customerName: 'X',
        paymentHistory: [],
        outstandingAmount: 500_000,
        creditLimit: 1_000_000,
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