/**
 * AI Advisor Engine – Acceptance Tests (v2.0)
 *
 * Business scenario acceptance tests for real-world intelligence flows.
 *
 * Run:
 *   npx jest tests/acceptance/advisor/AdvisorEngine.acceptance.test.js
 */

'use strict';

const AdvisorEngine = require('../../../src/application/services/advisor/AdvisorEngine');
const {
  ADVISOR_CONTEXT,
  ADVISOR_TONE,
  ADVISOR_SEVERITY
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

function createEngine(providerOverrides = {}) {
  const base = {
    analytics: {
      getData: jest.fn().mockResolvedValue({
        revenue: 10_000_000,
        revenueGrowth: 0.10,
        grossMargin: 0.30,
        previousGrossMargin: 0.32,
        netProfit: 1_500_000,
        profitGrowth: -0.05
      })
    },
    forecast: {
      getData: jest.fn().mockResolvedValue({
        projections: { revenue: 10_800_000, profit: 1_600_000 },
        confidence: 70
      })
    },
    risk: {
      getData: jest.fn().mockResolvedValue({
        risks: [{ type: 'CUSTOMER_CONCENTRATION', severity: 'HIGH', description: 'Top client risk' }]
      })
    },
    report: {
      getData: jest.fn().mockResolvedValue({ revenue: 10_000_000 })
    },
    inventory: {
      getData: jest.fn().mockResolvedValue({
        inventoryItems: [
          { name: 'Product A', stock: 5, reorderLevel: 10, weeklySales: 8, unitCost: 5000 },
          { name: 'Product B', stock: 150, reorderLevel: 20, weeklySales: 10, unitCost: 2000 }
        ],
        inventoryTurnover: 4.0,
        previousInventoryTurnover: 3.5
      })
    },
    customers: {
      getData: jest.fn().mockResolvedValue({
        topCustomers: [
          { name: 'Customer A', revenue: 4_000_000 },
          { name: 'Customer B', revenue: 1_500_000 }
        ],
        totalRevenue: 10_000_000,
        newCustomers: 20,
        newCustomerGrowth: 0.12,
        repeatRate: 0.30
      })
    },
    suppliers: {
      getData: jest.fn().mockResolvedValue({
        topSuppliers: [{ name: 'Supplier A', purchases: 3_000_000 }],
        totalPurchases: 5_000_000
      })
    },
    cashFlow: {
      getData: jest.fn().mockResolvedValue({
        currentCash: 3_500_000,
        previousCash: 3_800_000,
        projectedCash: 3_000_000,
        cashTrend: -0.05,
        monthlyExpenses: 1_000_000,
        cashFlow: -100_000
      })
    },
    expenses: {
      getData: jest.fn().mockResolvedValue({
        expenseCategories: [
          { name: 'Salaries', amount: 3_500_000 },
          { name: 'Rent', amount: 1_000_000 }
        ],
        expenseGrowth: 0.10,
        revenueGrowth: 0.10
      })
    }
  };

  return new AdvisorEngine({
    dataProviders: { ...base, ...providerOverrides },
    config: {
      confidenceThreshold: 40,
      maxInsights: 25,
      defaultContext: ADVISOR_CONTEXT.MONTHLY,
      defaultTone: ADVISOR_TONE.CONVERSATIONAL
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

describe('Advisor Engine – Acceptance Tests (v2.0)', () => {
  describe('Scenario: New Business Owner Onboarding', () => {
    let engine;

    beforeEach(() => {
      engine = createEngine({
        analytics: {
          getData: jest.fn().mockResolvedValue({
            revenue: 500_000,
            revenueGrowth: 0.05,
            grossMargin: 0.20,
            previousGrossMargin: 0.18,
            netProfit: 50_000
          })
        },
        cashFlow: {
          getData: jest.fn().mockResolvedValue({
            currentCash: 1_000_000,
            previousCash: 900_000,
            monthlyExpenses: 300_000,
            cashTrend: 0.02,
            cashFlow: 50_000
          })
        },
        risk: { getData: jest.fn().mockResolvedValue({ risks: [] }) }
      });
    });

    it('provides a helpful onboarding summary', async () => {
      const report = await engine.generateDailyReport({
        businessId: 'new_business',
        businessName: 'My New Business'
      });
      expect(report.response).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('answers basic business questions', async () => {
      const result = await engine.askQuestion('How is my business doing?', {
        businessId: 'new_business'
      });
      expect(result.answer).toBeDefined();
      expect(result.answer.content || result.answer.summary).toBeDefined();
    });
  });

  describe('Scenario: Growing Business', () => {
    let engine;

    beforeEach(() => {
      engine = createEngine({
        analytics: {
          getData: jest.fn().mockResolvedValue({
            revenue: 10_000_000,
            revenueGrowth: 0.25,
            grossMargin: 0.32,
            previousGrossMargin: 0.28,
            netProfit: 1_800_000,
            profitGrowth: 0.18
          })
        },
        cashFlow: {
          getData: jest.fn().mockResolvedValue({
            currentCash: 5_000_000,
            previousCash: 4_000_000,
            monthlyExpenses: 800_000,
            cashTrend: 0.08,
            cashFlow: 400_000
          })
        },
        risk: { getData: jest.fn().mockResolvedValue({ risks: [] }) }
      });
    });

    it('identifies growth opportunities', async () => {
      const report = await engine.generateMonthlyReport({
        businessId: 'growing_business',
        businessName: 'Growth Co'
      });
      expect(report.meta).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.summary?.wins)).toBe(true);
      expect(Array.isArray(report.summary?.opportunities)).toBe(true);
    });

    it('provides expansion recommendations', async () => {
      const recommendations = await engine.getRecommendations(
        { businessId: 'growing_business' },
        { limit: 5 }
      );
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Scenario: Troubled Business', () => {
    let engine;

    beforeEach(() => {
      engine = createEngine({
        analytics: {
          getData: jest.fn().mockResolvedValue({
            revenue: 3_000_000,
            revenueGrowth: -0.15,
            grossMargin: 0.12,
            previousGrossMargin: 0.22,
            netProfit: -200_000,
            profitGrowth: -0.35
          })
        },
        cashFlow: {
          getData: jest.fn().mockResolvedValue({
            currentCash: 200_000,
            previousCash: 500_000,
            projectedCash: 50_000,
            cashTrend: -0.25,
            monthlyExpenses: 400_000,
            cashFlow: -150_000,
            minimumCashThreshold: 300_000
          })
        },
        risk: {
          getData: jest.fn().mockResolvedValue({
            risks: [
              { type: 'CASH_FLOW_RISK', severity: 'CRITICAL', description: 'Cash critical' },
              { type: 'PROFITABILITY_RISK', severity: 'CRITICAL', description: 'Sustained losses' },
              { type: 'LIQUIDITY_RISK', severity: 'HIGH', description: 'Liquidity stress' }
            ]
          })
        }
      });
    });

    it('identifies critical issues', async () => {
      const report = await engine.generateMonthlyReport({
        businessId: 'troubled_business',
        businessName: 'Troubled Co'
      });
      expect(report.meta).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('provides crisis recommendations', async () => {
      const recommendations = await engine.getRecommendations(
        { businessId: 'troubled_business' },
        { limit: 5 }
      );
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Scenario: Seasonal Business', () => {
    let engine;

    beforeEach(() => {
      engine = createEngine({
        analytics: {
          getData: jest.fn().mockResolvedValue({
            revenue: 8_000_000,
            revenueGrowth: 0.30,
            grossMargin: 0.28,
            previousGrossMargin: 0.25,
            netProfit: 1_000_000,
            profitGrowth: 0.25
          })
        },
        inventory: {
          getData: jest.fn().mockResolvedValue({
            inventoryItems: [
              { name: 'Seasonal Product', stock: 500, reorderLevel: 200, weeklySales: 100, unitCost: 2000 },
              { name: 'Regular Product', stock: 50, reorderLevel: 30, weeklySales: 10, unitCost: 1500 }
            ],
            inventoryTurnover: 8.0,
            previousInventoryTurnover: 5.0
          })
        },
        risk: { getData: jest.fn().mockResolvedValue({ risks: [] }) }
      });
    });

    it('identifies seasonal inventory and revenue signals', async () => {
      const report = await engine.generateReport({ businessId: 'seasonal_business' });
      expect(report.meta).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);
    });
  });

  describe('Scenario: Complete User Journey', () => {
    let engine;

    beforeEach(() => {
      engine = createEngine();
    });

    it('handles a complete business intelligence flow', async () => {
      const questionResult = await engine.askQuestion(
        'How is my business performing this month?',
        { businessId: 'user_123' }
      );
      expect(questionResult.answer).toBeDefined();

      const report = await engine.generateMonthlyReport({
        businessId: 'user_123',
        businessName: 'My Business'
      });
      expect(report.meta).toBeDefined();
      expect(report.response).toBeDefined();
      expect(report.summary).toBeDefined();

      const followUp = await engine.askQuestion(
        'What should I do about my profit decline?',
        { businessId: 'user_123' }
      );
      expect(followUp.answer).toBeDefined();

      const warnings = await engine.getWarnings({ businessId: 'user_123' });
      expect(Array.isArray(warnings)).toBe(true);

      const recommendations = await engine.getRecommendations(
        { businessId: 'user_123' },
        { limit: 3 }
      );
      expect(recommendations.length).toBeLessThanOrEqual(3);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});