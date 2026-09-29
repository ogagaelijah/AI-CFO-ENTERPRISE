'use strict';

const RiskOrchestrator = require('../../../src/application/services/risk/RiskOrchestrator');

const mockData = {
  cash: {
    current: 500000,
    history: [
      { value: 600000, inflow: 200000, outflow: 150000 },
      { value: 550000, inflow: 180000, outflow: 160000 },
      { value: 500000, inflow: 150000, outflow: 180000 },
    ],
  },
  revenue: {
    growth: 5,
    history: [
      { value: 1000000, date: '2026-07-01' },
      { value: 1100000, date: '2026-07-15' },
      { value: 1200000, date: '2026-08-01' },
      { value: 1150000, date: '2026-08-15' },
      { value: 1250000, date: '2026-09-01' },
    ],
  },
  profitability: {
    type: 'gross',
    history: [
      { value: 45, date: '2026-07-01' },
      { value: 44, date: '2026-07-15' },
      { value: 43, date: '2026-08-01' },
      { value: 42, date: '2026-08-15' },
      { value: 40, date: '2026-09-01' },
    ],
  },
  expenses: {
    history: [
      { value: 100000, revenue: 500000, date: '2026-07-01' },
      { value: 120000, revenue: 520000, date: '2026-07-15' },
      { value: 150000, revenue: 540000, date: '2026-08-01' },
      { value: 180000, revenue: 560000, date: '2026-08-15' },
      { value: 200000, revenue: 580000, date: '2026-09-01' },
    ],
    categories: {
      salaries: 150000,
      rent: 50000,
      marketing: 30000,
      utilities: 10000,
    },
  },
  receivables: {
    history: [
      { value: 200000 },
      { value: 250000 },
      { value: 300000 },
      { value: 350000 },
      { value: 400000 },
    ],
    aging: {
      current: 150000,
      days1to30: 100000,
      days31to60: 80000,
      days61to90: 50000,
      daysOver90: 20000,
    },
  },
  payables: {
    history: [
      { value: 100000 },
      { value: 120000 },
      { value: 150000 },
      { value: 180000 },
      { value: 200000 },
    ],
    aging: {
      current: 80000,
      days1to30: 50000,
      days31to60: 40000,
      days61to90: 20000,
      daysOver90: 10000,
    },
  },
  inventory: {
    lowStockItems: 3,
    history: [
      { value: 100000, revenue: 500000 },
      { value: 120000, revenue: 520000 },
      { value: 150000, revenue: 540000 },
      { value: 180000, revenue: 560000 },
      { value: 200000, revenue: 580000 },
    ],
    details: [
      { value: 80000 },
      { value: 40000 },
      { value: 30000 },
      { value: 25000 },
      { value: 25000 },
    ],
  },
  sales: {
    history: [
      { value: 100, date: '2026-07-01' },
      { value: 110, date: '2026-07-15' },
      { value: 120, date: '2026-08-01' },
      { value: 115, date: '2026-08-15' },
      { value: 125, date: '2026-09-01' },
    ],
  },
  forecast: { impact: 10 },
};

describe('RiskOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new RiskOrchestrator();
  });

  describe('assess()', () => {
    test('should generate a complete risk assessment', async () => {
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: mockData,
      });

      expect(result).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.risks)).toBe(true);
      expect(Object.isFrozen(result.risks.all)).toBe(true);

      expect(result.risks.cash).toBeDefined();
      expect(result.risks.revenue).toBeDefined();
      expect(result.risks.profitability).toBeDefined();
      expect(result.risks.expenses).toBeDefined();
      expect(result.risks.receivables).toBeDefined();
      expect(result.risks.payables).toBeDefined();
      expect(result.risks.inventory).toBeDefined();
      expect(result.risks.all.length).toBe(7);

      expect(result.scoring).toBeDefined();
      expect(result.scoring.overallScore).toBeDefined();
      expect(result.scoring.severity).toBeDefined();

      expect(result.executiveSummary).toBeDefined();
      expect(result.executiveSummary.overallRisk).toBeDefined();
      expect(result.executiveSummary.riskDistribution).toBeDefined();
      expect(result.executiveSummary.topRisk).toBeDefined();
      expect(result.executiveSummary.summary).toBeDefined();

      expect(result.summary).toBeDefined();
      expect(result.summary.overallScore).toBeDefined();
      expect(result.summary.overallSeverity).toBeDefined();
      expect(result.summary.riskCount).toBe(7);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.userId).toBe(1);
      expect(result.metadata.businessId).toBe(1);
      expect(result.metadata.version).toBe('1.3.0');
      expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('should handle previous risks for trend analysis', async () => {
      const previousRisks = { cash: { score: 40 }, revenue: { score: 30 } };
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: mockData,
        previousRisks,
      });
      expect(result.trends).toBeDefined();
      expect(result.trends.results).toBeDefined();
      expect(Object.isFrozen(result.trends)).toBe(true);
    });

    test('should handle minimal data', async () => {
      const minimalData = {
        cash: { current: 100000, history: [] },
        revenue: { growth: 0, history: [] },
        profitability: { type: 'gross', history: [] },
        expenses: { history: [] },
        receivables: { history: [] },
        payables: { history: [] },
        inventory: { lowStockItems: 0, history: [] },
      };
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: minimalData,
      });
      expect(result).toBeDefined();
      expect(result.risks.all.length).toBe(7);
      expect(result.summary.riskCount).toBe(7);
    });

    test('should detect critical risks', async () => {
      const criticalData = {
       ...mockData,
        cash: {
          current: 0,
          history: [
            { value: 0, inflow: 0, outflow: 100000 },
            { value: 0, inflow: 0, outflow: 100000 },
            { value: 0, inflow: 0, outflow: 100000 },
          ],
        },
        receivables: {
          history: [
            { value: 500000 },
            { value: 600000 },
            { value: 700000 },
          ],
          aging: {
            current: 50000,
            days1to30: 50000,
            days31to60: 50000,
            days61to90: 50000,
            daysOver90: 400000, // 80% over 90 days = CRITICAL
          },
        },
        revenue: {
          growth: -50,
          history: [{ value: 1000000 }, { value: 600000 }, { value: 500000 }],
        },
      };
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: criticalData,
      });
      expect(result.summary.criticalRisks).toBeGreaterThan(0);
      expect(result.executiveSummary.riskDistribution.critical).toBeGreaterThan(
        0
      );
      expect(result.executiveSummary.topRisk.severity).toBe('CRITICAL');
      expect(result.recommendations[0].priority).toBe('CRITICAL');
    });

    test('should handle anomaly detection', async () => {
      const anomalyData = {
       ...mockData,
        sales: {
          history: [
            { value: 100, date: '2026-07-01' },
            { value: 105, date: '2026-07-05' },
            { value: 98, date: '2026-07-10' },
            { value: 102, date: '2026-07-15' },
            { value: 101, date: '2026-07-20' },
            { value: 99, date: '2026-07-25' },
            { value: 103, date: '2026-08-01' },
            { value: 100, date: '2026-08-05' },
            { value: 104, date: '2026-08-10' },
            { value: 500, date: '2026-09-01' }, // 5x spike = anomaly
          ],
        },
      };
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: anomalyData,
      });
      expect(result.anomalies).toBeDefined();
      expect(result.anomalies.sales).toBeDefined();
      expect(result.anomalies.sales.hasAnomalies).toBe(true);
      expect(result.anomalies.sales.anomalies.length).toBeGreaterThan(0);
      expect(result.executiveSummary.anomalies.total).toBeGreaterThan(0);
    });

    test('should generate recommendations for high risks', async () => {
      const highRiskData = {
       ...mockData,
        cash: {
          current: 50000,
          history: [
            { value: 100000, inflow: 50000, outflow: 120000 },
            { value: 70000, inflow: 40000, outflow: 110000 },
            { value: 50000, inflow: 30000, outflow: 100000 },
          ],
        },
        receivables: {
          history: [
            { value: 200000 },
            { value: 300000 },
            { value: 500000 },
          ],
          aging: {
            current: 100000,
            days1to30: 150000,
            days31to60: 100000,
            days61to90: 80000,
            daysOver90: 70000,
          },
        },
      };
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: highRiskData,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].priority).toBe('CRITICAL');
      expect(result.recommendations[0].riskType).toBeDefined();
      expect(result.recommendations[0].recommendation).toBeDefined();
    });
  });

  describe('quickAssess()', () => {
    test('should return a quick risk summary', async () => {
      const result = await orchestrator.quickAssess({
        userId: 1,
        businessId: 1,
        data: mockData,
      });
      expect(result.overallScore).toBeDefined();
      expect(result.overallSeverity).toBeDefined();
      expect(result.criticalCount).toBeDefined();
      expect(result.highCount).toBeDefined();
      expect(result.topRisks).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    test('should handle empty data', async () => {
      const result = await orchestrator.quickAssess({
        userId: 1,
        businessId: 1,
        data: {},
      });
      expect(result.overallScore).toBeDefined();
      expect(typeof result.summary).toBe('string');
    });
  });

  describe('getRiskHistory()', () => {
    test('should return history for a specific risk type', () => {
      const historicalSnapshots = [
        {
          riskType: 'CASH_FLOW',
          score: 40,
          timestamp: '2026-07-01',
          status: 'ACTIVE',
        },
        {
          riskType: 'CASH_FLOW',
          score: 50,
          timestamp: '2026-07-15',
          status: 'ACTIVE',
        },
        {
          riskType: 'REVENUE',
          score: 30,
          timestamp: '2026-07-01',
          status: 'ACTIVE',
        },
        {
          riskType: 'CASH_FLOW',
          score: 60,
          timestamp: '2026-08-01',
          status: 'ACTIVE',
        },
      ];
      const result = orchestrator.getRiskHistory(
        'CASH_FLOW',
        historicalSnapshots
      );
      expect(result.length).toBe(3);
      expect(result[0].score).toBe(40);
      expect(result[1].score).toBe(50);
      expect(result[2].score).toBe(60);
    });

    test('should return empty array for no history', () => {
      const result = orchestrator.getRiskHistory('CASH_FLOW', null);
      expect(result).toEqual([]);
    });

    test('should return empty array for no matching type', () => {
      const historicalSnapshots = [
        {
          riskType: 'REVENUE',
          score: 30,
          timestamp: '2026-07-01',
          status: 'ACTIVE',
        },
      ];
      const result = orchestrator.getRiskHistory(
        'CASH_FLOW',
        historicalSnapshots
      );
      expect(result).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle partially missing data', async () => {
      const partialData = {
        cash: { current: 500000, history: [] },
        revenue: { growth: 5, history: mockData.revenue.history },
        profitability: { type: 'gross', history: [] },
        expenses: { history: [] },
        receivables: { history: [] },
        payables: { history: [] },
        inventory: { lowStockItems: 0, history: [] },
      };
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: partialData,
      });
      expect(result).toBeDefined();
      expect(result.risks.all.length).toBe(7);
    });

    test('should handle invalid data gracefully', async () => {
      const invalidData = {
        cash: null,
        revenue: undefined,
        profitability: { type: 'gross', history: 'not-an-array' },
        expenses: { history: [null, undefined, 'string'] },
        receivables: { history: [] },
        payables: { history: [] },
        inventory: { lowStockItems: 'not-a-number', history: [] },
      };
      const result = await orchestrator.assess({
        userId: 1,
        businessId: 1,
        data: invalidData,
      });
      expect(result).toBeDefined();
      expect(result.risks.all.length).toBe(7);
      expect(result.error).not.toBe(true);
    });

    test('should handle concurrent requests', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          orchestrator.assess({
            userId: i + 1,
            businessId: i + 1,
            data: mockData,
          })
        );
      }
      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result.generatedAt).toBeDefined();
        expect(result.risks).toBeDefined();
      });
    });
  });
});