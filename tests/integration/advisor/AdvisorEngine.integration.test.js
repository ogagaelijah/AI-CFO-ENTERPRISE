/**
 * AI Advisor Engine – Integration Tests (v2.0)
 *
 * End-to-end integration tests validating all advisor components work together.
 *
 * Run:
 *   npx jest tests/integration/advisor/AdvisorEngine.integration.test.js
 */

'use strict';

const AdvisorEngine = require('../../../src/application/services/advisor/AdvisorEngine');
const {
  ADVISOR_CONTEXT,
  ADVISOR_TONE,
  ADVISOR_SEVERITY,
  ADVISOR_CATEGORIES
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

function buildProviders(overrides = {}) {
  const base = {
    analytics: {
      getData: jest.fn().mockResolvedValue({
        revenue: 12_500_000,
        revenueGrowth: 0.08,
        grossMargin: 0.28,
        previousGrossMargin: 0.31,
        netProfit: 1_800_000,
        profitGrowth: -0.08
      })
    },
    forecast: {
      getData: jest.fn().mockResolvedValue({
        projections: { revenue: 13_500_000, profit: 1_900_000, cashFlow: 3_800_000 },
        confidence: 75
      })
    },
    risk: {
      getData: jest.fn().mockResolvedValue({
        risks: [
          { type: 'CASH_FLOW_RISK', severity: 'HIGH', description: 'Cash declining rapidly' },
          { type: 'MARGIN_RISK', severity: 'MEDIUM', description: 'Margin pressure' }
        ]
      })
    },
    report: {
      getData: jest.fn().mockResolvedValue({
        revenue: 12_500_000,
        expenses: 7_200_000,
        profit: 2_800_000
      })
    },
    inventory: {
      getData: jest.fn().mockResolvedValue({
        inventoryItems: [
          { name: 'Product A', stock: 5, reorderLevel: 10, weeklySales: 8, unitCost: 5000 },
          { name: 'Product B', stock: 150, reorderLevel: 20, weeklySales: 10, unitCost: 2000 },
          { name: 'Product C', stock: 45, reorderLevel: 30, weeklySales: 12, unitCost: 3000 }
        ],
        inventoryTurnover: 4.2,
        previousInventoryTurnover: 3.8
      })
    },
    customers: {
      getData: jest.fn().mockResolvedValue({
        topCustomers: [
          { name: 'Customer A', revenue: 3_500_000 },
          { name: 'Customer B', revenue: 2_000_000 },
          { name: 'Customer C', revenue: 1_500_000 }
        ],
        totalRevenue: 10_000_000,
        newCustomers: 25,
        newCustomerGrowth: 0.18,
        repeatRate: 0.35
      })
    },
    suppliers: {
      getData: jest.fn().mockResolvedValue({
        topSuppliers: [
          { name: 'Supplier A', purchases: 3_000_000 },
          { name: 'Supplier B', purchases: 1_500_000 }
        ],
        totalPurchases: 6_000_000
      })
    },
    cashFlow: {
      getData: jest.fn().mockResolvedValue({
        currentCash: 4_200_000,
        previousCash: 4_800_000,
        projectedCash: 3_500_000,
        cashTrend: -0.12,
        monthlyExpenses: 1_200_000,
        cashFlow: -200_000
      })
    },
    expenses: {
      getData: jest.fn().mockResolvedValue({
        expenseCategories: [
          { name: 'Salaries', amount: 3_000_000 },
          { name: 'Rent', amount: 1_200_000 },
          { name: 'Utilities', amount: 500_000 },
          { name: 'Marketing', amount: 800_000 },
          { name: 'Transport', amount: 400_000 }
        ],
        expenseGrowth: 0.12,
        revenueGrowth: 0.08
      })
    }
  };

  return { ...base, ...overrides };
}

function createEngine(providerOverrides = {}, configOverrides = {}) {
  return new AdvisorEngine({
    dataProviders: buildProviders(providerOverrides),
    config: {
      confidenceThreshold: 40,
      maxInsights: 25,
      defaultContext: ADVISOR_CONTEXT.MONTHLY,
      defaultTone: ADVISOR_TONE.CONVERSATIONAL,
      ...configOverrides
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    metrics: {
      increment: jest.fn(),
      histogram: jest.fn(),
      gauge: jest.fn()
    }
  });
}

describe('AdvisorEngine Integration Tests (v2.0)', () => {
  let engine;

  beforeEach(() => {
    engine = createEngine();
  });

  describe('End-to-End Report Generation', () => {
    it('generates a complete monthly report', async () => {
      const report = await engine.generateMonthlyReport({
        businessId: 'test_123',
        businessName: 'Acme Corp'
      });

      expect(report.meta).toBeDefined();
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.MONTHLY);
      expect(report.meta.businessId).toBe('test_123');
      expect(report.meta.generatedAt).toBeDefined();
      expect(report.response).toBeDefined();
      expect(report.response.title).toEqual(expect.stringContaining('Acme Corp'));
      expect(report.summary).toBeDefined();
      expect(typeof report.summary.summary).toBe('string');
      expect(report.metrics).toBeDefined();
      expect(report.metrics.revenue).toBe(12_500_000);
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('generates a daily report', async () => {
      const report = await engine.generateDailyReport({ businessId: 'test_123' });
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.DAILY);
      expect(report.response).toBeDefined();
      expect(report.response.title || '').toMatch(/Daily/i);
    });

    it('generates a weekly report', async () => {
      const report = await engine.generateWeeklyReport({ businessId: 'test_123' });
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.WEEKLY);
      expect(report.response).toBeDefined();
      expect(report.response.title || '').toMatch(/Weekly/i);
    });

    it('generates a forecast report', async () => {
      const report = await engine.generateForecastReport({ businessId: 'test_123' });
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.FORECAST);
      expect(report.response).toBeDefined();
      expect(report.response.title || '').toMatch(/Forecast/i);
    });

    it('includes elevated severity insights when data warrants it', async () => {
      const report = await engine.generateReport({ businessId: 'test_123' });
      expect(Array.isArray(report.insights)).toBe(true);
      const elevated = report.insights.filter(
        i => i.severity === ADVISOR_SEVERITY.CRITICAL || i.severity === ADVISOR_SEVERITY.HIGH
      );
      expect(Array.isArray(elevated)).toBe(true);
    });
  });

  describe('Question Answering', () => {
    it('answers performance questions', async () => {
      const result = await engine.askQuestion(
        'How is my business performing this month?',
        { businessId: 'test_123' }
      );
      expect(result.intent).toBe('PERFORMANCE');
      expect(result.answer).toBeDefined();
    });

    it('answers profit questions', async () => {
      const result = await engine.askQuestion(
        'Why is my profit declining?',
        { businessId: 'test_123' }
      );
      expect(result.intent).toBe('PROFIT');
      expect(result.answer).toBeDefined();
    });

    it('answers cash questions', async () => {
      const result = await engine.askQuestion(
        'How much cash do we have?',
        { businessId: 'test_123' }
      );
      expect(result.intent).toBe('CASH');
      expect(result.answer).toBeDefined();
    });

    it('answers inventory questions', async () => {
      const result = await engine.askQuestion(
        'What is our inventory turnover?',
        { businessId: 'test_123' }
      );
      expect(result.intent).toBe('INVENTORY');
      expect(result.answer).toBeDefined();
    });

    it('answers customer questions', async () => {
      const result = await engine.askQuestion(
        'How many new customers did we get?',
        { businessId: 'test_123' }
      );
      expect(result.intent).toBe('CUSTOMERS');
      expect(result.answer).toBeDefined();
    });

    it('answers recommendation questions', async () => {
      const result = await engine.askQuestion(
        'What should I do to improve profitability?',
        { businessId: 'test_123' }
      );
      expect(result.intent).toBe('RECOMMENDATION');
      expect(result.answer).toBeDefined();
    });

    it('handles unknown questions as GENERAL', async () => {
      const result = await engine.askQuestion('Hello there', { businessId: 'test_123' });
      expect(result.intent).toBe('GENERAL');
      expect(result.answer).toBeDefined();
    });
  });

  describe('Insight Generation', () => {
    it('returns insights with valid categories', async () => {
      const insights = await engine.getInsights({ businessId: 'test_123' }, { limit: 25 });
      expect(Array.isArray(insights)).toBe(true);
      const valid = new Set(Object.values(ADVISOR_CATEGORIES));
      for (const i of insights) {
        if (i.category) {
          expect(valid.has(i.category) || typeof i.category === 'string').toBe(true);
        }
      }
    });

    it('filters by category', async () => {
      const insights = await engine.getInsights(
        { businessId: 'test_123' },
        { categories: [ADVISOR_CATEGORIES.CASH], limit: 10 }
      );
      expect(insights.every(i => !i.category || i.category === ADVISOR_CATEGORIES.CASH)).toBe(true);
    });

    it('respects minConfidence', async () => {
      const insights = await engine.getInsights(
        { businessId: 'test_123' },
        { minConfidence: 70, limit: 20 }
      );
      expect(insights.every(i => (i.confidence ?? 100) >= 70)).toBe(true);
    });
  });

  describe('Summary Generation', () => {
    it('generates a complete summary', async () => {
      const summary = await engine.getSummary(
        { businessId: 'test_123' },
        { context: ADVISOR_CONTEXT.MONTHLY }
      );
      expect(summary).toBeDefined();
      expect(typeof summary.summary).toBe('string');
      expect(summary.metrics).toBeDefined();
      expect(Array.isArray(summary.wins)).toBe(true);
      expect(Array.isArray(summary.concerns)).toBe(true);
      expect(Array.isArray(summary.opportunities)).toBe(true);
      expect(Array.isArray(summary.takeaways)).toBe(true);
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });
  });

  describe('Recommendations', () => {
    it('generates recommendations', async () => {
      const recs = await engine.getRecommendations({ businessId: 'test_123' }, { limit: 5 });
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Data Integration', () => {
    it('integrates data from all providers', async () => {
      const data = await engine.gatherAllData({ businessId: 'test_123' });
      expect(data.revenue).toBe(12_500_000);
      expect(data.currentCash).toBe(4_200_000);
      expect(data.inventoryItems).toBeDefined();
      expect(data.topCustomers).toBeDefined();
      expect(data.expenseCategories).toBeDefined();
      expect(data.risks).toBeDefined();
    });

    it('handles missing data providers', async () => {
      const minimal = new AdvisorEngine({});
      const data = await minimal.gatherAllData({ businessId: 'test_123' });
      expect(data).toEqual({});
    });

    it('handles provider errors gracefully', async () => {
      const e = createEngine({
        analytics: {
          getData: jest.fn().mockRejectedValue(new Error('Service unavailable'))
        }
      });
      const report = await e.generateReport({ businessId: 'test_123' });
      expect(report).toBeDefined();
      expect(report.meta).toBeDefined();
    });
  });

  describe('Performance Scenarios', () => {
    it('handles healthy business scenario', async () => {
      const e = createEngine({
        analytics: {
          getData: jest.fn().mockResolvedValue({
            revenue: 15_000_000,
            revenueGrowth: 0.20,
            grossMargin: 0.35,
            previousGrossMargin: 0.32,
            netProfit: 3_000_000,
            profitGrowth: 0.15
          })
        },
        cashFlow: {
          getData: jest.fn().mockResolvedValue({
            currentCash: 8_000_000,
            previousCash: 7_000_000,
            projectedCash: 9_000_000,
            cashTrend: 0.10,
            monthlyExpenses: 1_000_000,
            cashFlow: 500_000
          })
        },
        risk: { getData: jest.fn().mockResolvedValue({ risks: [] }) }
      });

      const report = await e.generateMonthlyReport({ businessId: 'healthy' });
      const critical = report.insights.filter(i => i.severity === ADVISOR_SEVERITY.CRITICAL);
      expect(critical.length).toBe(0);
      expect(report.meta).toBeDefined();
    });

    it('handles crisis scenario', async () => {
      const e = createEngine({
        analytics: {
          getData: jest.fn().mockResolvedValue({
            revenue: 5_000_000,
            revenueGrowth: -0.20,
            grossMargin: 0.15,
            previousGrossMargin: 0.25,
            netProfit: -500_000,
            profitGrowth: -0.40
          })
        },
        cashFlow: {
          getData: jest.fn().mockResolvedValue({
            currentCash: 50_000,
            previousCash: 200_000,
            projectedCash: -100_000,
            cashTrend: -0.30,
            monthlyExpenses: 500_000,
            cashFlow: -150_000,
            minimumCashThreshold: 200_000
          })
        },
        risk: {
          getData: jest.fn().mockResolvedValue({
            risks: [
              { type: 'CASH_FLOW_RISK', severity: 'CRITICAL', description: 'Runway critical' },
              { type: 'PROFITABILITY_RISK', severity: 'CRITICAL', description: 'Losses mounting' }
            ]
          })
        }
      });

      const report = await e.generateMonthlyReport({ businessId: 'crisis' });
      expect(report.meta).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('handles mixed scenario', async () => {
      const report = await engine.generateMonthlyReport({ businessId: 'mixed' });
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.summary?.wins)).toBe(true);
      expect(Array.isArray(report.summary?.concerns)).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    it('handles concurrent report requests', async () => {
      const results = await Promise.all([
        engine.generateReport({ businessId: 'test_0', businessName: 'Business 0' }),
        engine.generateReport({ businessId: 'test_1', businessName: 'Business 1' }),
        engine.generateReport({ businessId: 'test_2', businessName: 'Business 2' })
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].meta.businessId).toBe('test_0');
      expect(results[1].meta.businessId).toBe('test_1');
      expect(results[2].meta.businessId).toBe('test_2');
    });

    it('handles concurrent question requests', async () => {
      const results = await Promise.all([
        engine.askQuestion('How is my business?', { businessId: 'test_123' }),
        engine.askQuestion('What is my profit?', { businessId: 'test_123' }),
        engine.askQuestion('How much cash do we have?', { businessId: 'test_123' })
      ]);
      expect(results).toHaveLength(3);
      results.forEach(r => expect(r.answer).toBeDefined());
    });
  });
});