/**
 * AdvisorInsightGenerator – Production Test Suite
 * Matches v2.0.0 (SSOT, defensive, observable)
 *
 * Run with: npx jest tests/unit/advisor/AdvisorInsightGenerator.test.js --coverage
 */

'use strict';

const AdvisorInsightGenerator = require('../../../src/application/services/advisor/AdvisorInsightGenerator');
const {
  ADVISOR_CATEGORIES,
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

// ──────────────────────────────────────────────────────────────
// Minimal template stubs (SSOT lives in real insightTemplates)
// ──────────────────────────────────────────────────────────────
const MOCK_TEMPLATES = [
  {
    id: 'REVENUE_HIGH_GROWTH_OPPORTUNITY',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue grew {growth}% driven by {driver}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'REVENUE_GROWTH_POSITIVE',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue up {growth}% this {period} thanks to {driver}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'REVENUE_GROWTH_NEGATIVE',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue declined {decline}% this {period} due to {factors}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'REVENUE_STAGNANT',
    category: ADVISOR_CATEGORIES.REVENUE,
    template: 'Revenue is flat ({growth}%) for the {period}.',
    sentiment: ADVISOR_SENTIMENT.NEUTRAL,
    severity: ADVISOR_SEVERITY.MEDIUM
  },
  {
    id: 'PROFIT_MARGIN_IMPROVING',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Gross margin improved from {previousMargin}% to {currentMargin}% via {driver}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'PROFIT_MARGIN_DECLINING',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Gross margin fell from {previousMargin}% to {currentMargin}% because of {driver}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'PROFIT_DECLINE_REVENUE_GROWTH',
    category: ADVISOR_CATEGORIES.PROFITABILITY,
    template: 'Revenue grew {revenueGrowth}% but profit fell {profitDecline}%. Top expense: {topExpenseCategory}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'CASH_SHORTAGE_WARNING',
    category: ADVISOR_CATEGORIES.CASH,
    template: 'Projected cash {projectedCash} is below the {minimumThreshold} safety threshold.',
    sentiment: ADVISOR_SENTIMENT.URGENT,
    severity: ADVISOR_SEVERITY.CRITICAL
  },
  {
    id: 'CASH_POSITION_STRONG',
    category: ADVISOR_CATEGORIES.CASH,
    template: 'Strong cash position of {cashAmount} covering {months} months of expenses.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'CASH_POSITION_DECLINING',
    category: ADVISOR_CATEGORIES.CASH,
    template: 'Cash declined {decline}% over the {period}. Runway ≈ {runway} months. Top expense: {topExpense}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'CASH_FLOW_POSITIVE',
    category: ADVISOR_CATEGORIES.CASH,
    template: 'Positive cash flow of {cashFlowAmount} ({growth}).',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'CASH_FLOW_NEGATIVE',
    category: ADVISOR_CATEGORIES.CASH,
    template: 'Negative cash flow of {cashFlowAmount}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'LOW_STOCK_WARNING',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: '{itemName} is low ({stockLevel} units). ~{days} days of stock left.',
    sentiment: ADVISOR_SENTIMENT.URGENT,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'EXCESS_INVENTORY',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: '{itemName} has {weeksOfStock} weeks of stock (value {value}).',
    sentiment: ADVISOR_SENTIMENT.NEUTRAL,
    severity: ADVISOR_SEVERITY.MEDIUM
  },
  {
    id: 'INVENTORY_TURNOVER_IMPROVING',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: 'Inventory turnover improved from {previousTurnover} to {turnover}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'INVENTORY_TURNOVER_DECLINING',
    category: ADVISOR_CATEGORIES.INVENTORY,
    template: 'Inventory turnover declined from {previousTurnover} to {turnover}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.MEDIUM
  },
  {
    id: 'CUSTOMER_CONCENTRATION_RISK',
    category: ADVISOR_CATEGORIES.CUSTOMER,
    template: '{customerName} accounts for {concentration}% of revenue – concentration risk.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'CUSTOMER_ACQUISITION_GROWING',
    category: ADVISOR_CATEGORIES.CUSTOMER,
    template: 'New customer acquisition up {growth}% via {channel}.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'RISK_DETECTED',
    category: ADVISOR_CATEGORIES.RISK,
    template: '{riskLevel} risk detected: {riskDescription}. Action: {recommendedAction}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.CRITICAL
  },
  {
    id: 'MULTIPLE_RISKS_DETECTED',
    category: ADVISOR_CATEGORIES.RISK,
    template: 'Multiple high risks: {riskList}. Most critical: {criticalRisk}.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.CRITICAL
  },
  {
    id: 'EXPENSE_GROWTH_ALERT',
    category: ADVISOR_CATEGORIES.EXPENSE,
    template: '{categoryName} grew {growth}% while revenue grew only {revenueGrowth}%.',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.HIGH
  },
  {
    id: 'EXPENSE_ANOMALY',
    category: ADVISOR_CATEGORIES.EXPENSE,
    template: 'Anomaly in {categoryName}: {amount} (normal range ~{normalRange}).',
    sentiment: ADVISOR_SENTIMENT.NEGATIVE,
    severity: ADVISOR_SEVERITY.MEDIUM
  },
  {
    id: 'GROWTH_OPPORTUNITY_PRODUCT',
    category: ADVISOR_CATEGORIES.GROWTH,
    template: '{productName} is growing {growth}% – strong product opportunity.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  },
  {
    id: 'GROWTH_OPPORTUNITY_MARKET',
    category: ADVISOR_CATEGORIES.GROWTH,
    template: 'Market expansion signal: new customers {newCustomerGrowth}, repeat rate {repeatRate}%.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO
  }
];

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const fixedClock = () => new Date('2026-09-03T19:00:00.000Z');

function createGenerator(overrides = {}) {
  return new AdvisorInsightGenerator({
    templates: MOCK_TEMPLATES,
    clock: fixedClock,
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
    },
    ...overrides
  });
}

// ──────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────
describe('AdvisorInsightGenerator v2.0', () => {
  let generator;

  beforeEach(() => {
    generator = createGenerator();
  });

  // ── Constructor & Config ──────────────────────────────────
  describe('constructor & SSOT config', () => {
    it('uses default confidence threshold and freezes config', () => {
      expect(generator.confidenceThreshold).toBe(55);
      expect(Object.isFrozen(generator.config)).toBe(true);
      expect(generator.config.currencySymbol).toBe('₦');
    });

    it('merges partial config overrides without mutating defaults', () => {
      const g = createGenerator({
        config: {
          confidenceThreshold: 70,
          revenue: { highGrowth: 0.20 },
          currencySymbol: '$'
        }
      });

      expect(g.confidenceThreshold).toBe(70);
      expect(g.config.revenue.highGrowth).toBe(0.20);
      expect(g.config.revenue.moderateGrowth).toBe(0.05);
      expect(g.config.currencySymbol).toBe('$');
    });

    it('accepts custom templates, logger and metrics', () => {
      expect(generator.templates).toBe(MOCK_TEMPLATES);
      expect(generator.logger.info).toBeDefined();
      expect(generator.metrics.histogram).toBeDefined();
    });
  });

  // ── Core generate() behaviour ─────────────────────────────
  describe('generate()', () => {
    it('returns empty array and logs error on invalid data', () => {
      const result = generator.generate(null);

      expect(result).toEqual([]);
      expect(generator.logger.error).toHaveBeenCalled();
      expect(generator.metrics.increment).toHaveBeenCalledWith(
        'advisor.insight.generation.errors'
      );
    });

    it('attaches generation metadata (generationId + schemaVersion)', () => {
      const data = {
        revenue: 150000,
        revenueGrowth: 0.22,
        topProduct: 'WidgetX'
      };

      const insights = generator.generate(data);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].meta).toMatchObject({
        schemaVersion: '2.0.0',
        generatedAt: '2026-09-03T19:00:00.000Z'
      });
      expect(insights[0].meta.generationId).toMatch(/^ins_/);
    });

    it('respects maxInsights hard cap', () => {
      const g = createGenerator({ config: { maxInsights: 2 } });

      const data = {
        revenue: 200000,
        revenueGrowth: 0.22,
        topProduct: 'Enterprise',
        grossMargin: 0.40,
        previousGrossMargin: 0.30,
        currentCash: 500000,
        monthlyExpenses: 50000,
        cashFlow: 20000,
        inventoryItems: [
          { name: 'A', stock: 5, reorderLevel: 10, weeklySales: 20 },
          { name: 'B', stock: 5, reorderLevel: 10, weeklySales: 20 }
        ],
        topCustomers: [{ name: 'BigCo', revenue: 150000 }],
        totalRevenue: 200000,
        risks: [
          { severity: 'CRITICAL', type: 'R1', description: 'Risk 1' },
          { severity: 'HIGH', type: 'R2', description: 'Risk 2' }
        ]
      };

      const insights = g.generate(data);

      expect(insights.length).toBeLessThanOrEqual(2);
      expect(g.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'insight_cap_reached' })
      );
    });

    it('filters by category when provided', () => {
      const data = {
        revenue: 100000,
        revenueGrowth: 0.22,
        topProduct: 'Organic',
        grossMargin: 0.35,
        previousGrossMargin: 0.30
      };

      const insights = generator.generate(data, {}, {
        categories: [ADVISOR_CATEGORIES.REVENUE]
      });

      expect(insights.every(i => i.category === ADVISOR_CATEGORIES.REVENUE)).toBe(true);
    });

    it('filters by minConfidence', () => {
      const data = {
        revenue: 100000,
        revenueGrowth: 0.01
      };

      const results = generator.generate(data, {}, {
        minConfidence: 10,
        includeAll: true
      });

      results.forEach(i => expect(i.confidence).toBeGreaterThanOrEqual(0));
    });

    it('sorts by severity (CRITICAL first)', () => {
      const data = {
        revenue: 100000,
        revenueGrowth: -0.12,
        projectedCash: 40000,
        monthlyExpenses: 30000,
        currentCash: 40000
      };

      const insights = generator.generate(data);
      const severities = insights.map(i => i.severity);

      const critIdx = severities.indexOf(ADVISOR_SEVERITY.CRITICAL);
      const highIdx = severities.indexOf(ADVISOR_SEVERITY.HIGH);

      if (critIdx !== -1 && highIdx !== -1) {
        expect(critIdx).toBeLessThan(highIdx);
      }
    });

    it('never mutates the returned array after the fact', () => {
      const data = {
        revenue: 100000,
        revenueGrowth: 0.22,
        topProduct: 'WidgetX'
      };

      const insights = generator.generate(data);
      const copy = generator.getInsights();

      expect(copy).not.toBe(insights);
      expect(copy).toEqual(insights);
    });
  });

  // ── Individual generators ─────────────────────────────────
  describe('Revenue insights', () => {
    it('detects high growth opportunity', () => {
      const insights = generator.generateRevenueInsights(
        {
          revenue: 150000,
          revenueGrowth: 0.22,
          topProduct: 'WidgetX'
        },
        {}
      );

      expect(insights).toHaveLength(1);
      expect(insights[0].title).toContain('Revenue Growth Opportunity');
      expect(insights[0].content).toContain('22.0%');
      expect(insights[0].content).toContain('WidgetX');
    });

    it('detects moderate positive growth', () => {
      const insights = generator.generateRevenueInsights(
        {
          revenue: 120000,
          revenueGrowth: 0.08
        },
        {}
      );

      expect(insights[0].title).toContain('Revenue Growing');
    });

    it('detects negative growth', () => {
      const insights = generator.generateRevenueInsights(
        {
          revenue: 90000,
          revenueGrowth: -0.11
        },
        {}
      );

      expect(insights[0].severity).toBe(ADVISOR_SEVERITY.HIGH);
      expect(insights[0].content).toContain('11.0%');
    });

    it('detects stagnant revenue', () => {
      const insights = generator.generateRevenueInsights(
        {
          revenue: 100000,
          revenueGrowth: 0.01
        },
        {}
      );

      expect(insights[0].title).toContain('Revenue Flat');
    });

    it('returns empty when required fields missing', () => {
      expect(generator.generateRevenueInsights({}, {})).toEqual([]);
      expect(generator.generateRevenueInsights({ revenue: 100 }, {})).toEqual([]);
    });
  });

  describe('Profitability insights', () => {
    it('detects margin improvement', () => {
      const insights = generator.generateProfitabilityInsights(
        {
          grossMargin: 0.38,
          previousGrossMargin: 0.32
        },
        {}
      );

      expect(insights[0].content).toMatch(/32\.0%.*38\.0%/);
    });

    it('detects margin decline', () => {
      const insights = generator.generateProfitabilityInsights(
        {
          grossMargin: 0.25,
          previousGrossMargin: 0.33
        },
        {}
      );

      expect(insights[0].severity).toBe(ADVISOR_SEVERITY.HIGH);
    });

    it('detects profit decline despite revenue growth', () => {
      const insights = generator.generateProfitabilityInsights(
        {
          grossMargin: 0.30,
          previousGrossMargin: 0.30,
          revenueGrowth: 0.12,
          profitGrowth: -0.08,
          expenseCategories: [{ name: 'Logistics', amount: 45000 }]
        },
        {}
      );

      expect(insights.some(i => i.title.includes('Profit Decline'))).toBe(true);
    });
  });

  describe('Cash-flow insights', () => {
    it('emits cash shortage warning', () => {
      const insights = generator.generateCashFlowInsights(
        {
          currentCash: 80000,
          projectedCash: 70000,
          monthlyExpenses: 40000
        },
        {}
      );

      expect(insights.some(i => i.severity === ADVISOR_SEVERITY.CRITICAL)).toBe(true);
      expect(insights[0].content).toContain('₦');
    });

    it('detects strong cash position', () => {
      const insights = generator.generateCashFlowInsights(
        {
          currentCash: 500000,
          monthlyExpenses: 50000
        },
        {}
      );

      expect(insights[0].title).toContain('Strong Cash Position');
      expect(insights[0].content).toContain('10 months');
    });

    it('detects declining cash', () => {
      const insights = generator.generateCashFlowInsights(
        {
          currentCash: 180000,
          previousCash: 250000,
          monthlyExpenses: 40000
        },
        { period: 'quarter' }
      );

      expect(insights.some(i => i.title.includes('Cash Declining'))).toBe(true);
    });

    it('handles positive and negative cash flow', () => {
      const pos = generator.generateCashFlowInsights(
        { currentCash: 100000, cashFlow: 25000 },
        {}
      );

      const neg = generator.generateCashFlowInsights(
        { currentCash: 100000, cashFlow: -15000 },
        {}
      );

      expect(pos[0].sentiment).toBe(ADVISOR_SENTIMENT.POSITIVE);
      expect(neg[0].sentiment).toBe(ADVISOR_SENTIMENT.NEGATIVE);
    });
  });

  describe('Inventory insights', () => {
    it('flags low stock', () => {
      const insights = generator.generateInventoryInsights(
        {
          inventoryItems: [
            {
              name: 'SKU-42',
              stock: 8,
              reorderLevel: 15,
              weeklySales: 12
            }
          ]
        },
        {}
      );

      expect(insights[0].title).toContain('Low Stock');
      expect(insights[0].content).toContain('SKU-42');
    });

    it('flags excess inventory', () => {
      const insights = generator.generateInventoryInsights(
        {
          inventoryItems: [
            {
              name: 'SlowMover',
              stock: 500,
              weeklySales: 10,
              unitCost: 25
            }
          ]
        },
        {}
      );

      expect(insights[0].title).toContain('Excess Inventory');
      expect(insights[0].content).toContain('₦12,500');
    });

    it('detects turnover improvement / decline', () => {
      const up = generator.generateInventoryInsights(
        {
          inventoryItems: [{}],
          inventoryTurnover: 6.2,
          previousInventoryTurnover: 5.0
        },
        {}
      );

      const down = generator.generateInventoryInsights(
        {
          inventoryItems: [{}],
          inventoryTurnover: 4.1,
          previousInventoryTurnover: 5.5
        },
        {}
      );

      expect(up[0].title).toContain('Improving');
      expect(down[0].title).toContain('Declining');
    });
  });

  describe('Customer insights', () => {
    it('detects concentration risk', () => {
      const insights = generator.generateCustomerInsights(
        {
          topCustomers: [{ name: 'MegaCorp', revenue: 480000 }],
          totalRevenue: 1000000
        },
        {}
      );

      expect(insights[0].content).toContain('48.0%');
      expect(insights[0].severity).toBe(ADVISOR_SEVERITY.HIGH);
    });

    it('detects strong customer acquisition', () => {
      const insights = generator.generateCustomerInsights(
        {
          topCustomers: [{ name: 'A', revenue: 10000 }],
          totalRevenue: 100000,
          newCustomers: 45,
          newCustomerGrowth: 28
        },
        {}
      );

      expect(insights[0].title).toContain('Customer Acquisition Growing');
    });
  });

  describe('Risk insights', () => {
    it('handles single critical risk', () => {
      const insights = generator.generateRiskInsights(
        {
          risks: [
            {
              severity: 'CRITICAL',
              type: 'FX',
              description: 'Currency exposure',
              recommendation: 'Hedge'
            }
          ]
        },
        {}
      );

      expect(insights).toHaveLength(1);
      expect(insights[0].severity).toBe(ADVISOR_SEVERITY.CRITICAL);
    });

    it('handles multiple high risks', () => {
      const insights = generator.generateRiskInsights(
        {
          risks: [
            { severity: 'HIGH', type: 'Supplier' },
            { severity: 'CRITICAL', type: 'Liquidity' }
          ]
        },
        {}
      );

      expect(insights[0].title).toContain('Multiple Risks');
    });
  });

  describe('Expense insights', () => {
    it('alerts when expenses grow much faster than revenue', () => {
      const insights = generator.generateExpenseInsights(
        {
          expenseCategories: [{ name: 'Marketing', amount: 80000 }],
          expenseGrowth: 0.40,
          revenueGrowth: 0.08
        },
        {}
      );

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].title).toContain('Expense Growth Alert');
    });

    it('flags expense anomalies', () => {
      const insights = generator.generateExpenseInsights(
        {
          expenseCategories: [
            {
              name: 'Travel',
              amount: 45000,
              anomaly: true,
              normalRange: 12000
            }
          ]
        },
        {}
      );

      expect(insights[0].content).toContain('Travel');
    });
  });

  describe('Growth & Performance insights', () => {
    it('detects product growth opportunity', () => {
      const insights = generator.generateGrowthInsights(
        {
          productGrowth: 0.42,
          topProduct: 'Pro Plan'
        },
        {}
      );

      expect(insights[0].content).toContain('Pro Plan');
      expect(insights[0].content).toContain('42.0%');
    });

    it('emits performance summary based on score', () => {
      const strong = generator.generatePerformanceInsights(
        {
          revenueGrowth: 0.20,
          grossMargin: 0.40,
          currentCash: 600000,
          monthlyExpenses: 50000,
          netProfit: 80000,
          revenue: 400000
        },
        {}
      );

      const weak = generator.generatePerformanceInsights(
        {
          revenueGrowth: -0.05,
          grossMargin: 0.12,
          currentCash: 20000,
          monthlyExpenses: 40000
        },
        {}
      );

      expect(strong[0].sentiment).toBe(ADVISOR_SENTIMENT.POSITIVE);
      expect(weak[0].severity).toBe(ADVISOR_SEVERITY.HIGH);
    });
  });

  // ── Helpers & Utilities ───────────────────────────────────
  describe('helpers', () => {
    it('formatCurrency handles edge cases', () => {
      expect(generator.formatCurrency(1234567)).toBe('₦1,234,567');
      expect(generator.formatCurrency(null)).toBe('₦0');
      expect(generator.formatCurrency(undefined)).toBe('₦0');
      expect(generator.formatCurrency(NaN)).toBe('₦0');
    });

    it('calculateConfidence penalises sparse / old / forecast data', () => {
      const high = generator.calculateConfidence(
        {
          a: 1, b: 2, c: 3, d: 4, e: 5,
          lastUpdated: fixedClock().toISOString()
        },
        { source: 'ANALYTICS' }
      );

      const low = generator.calculateConfidence(
        { a: 1 },
        { source: 'FORECAST' }
      );

      expect(high).toBeGreaterThan(low);
      expect(low).toBeLessThan(60);
    });

    it('calculatePerformanceScore returns sensible range', () => {
      const score = generator.calculatePerformanceScore({
        revenueGrowth: 0.18,
        grossMargin: 0.32,
        currentCash: 400000,
        monthlyExpenses: 50000,
        netProfit: 60000,
        revenue: 350000
      });

      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('fillTemplate replaces all placeholders', () => {
      const result = generator.fillTemplate(
        'Hello {name}, you have {count} items.',
        { name: 'Ada', count: 7 }
      );

      expect(result).toBe('Hello Ada, you have 7 items.');
    });

    it('generateRecommendations returns template-specific advice', () => {
      const recs = generator.generateRecommendations(
        { id: 'CASH_SHORTAGE_WARNING' },
        {}
      );

      expect(recs.length).toBeGreaterThanOrEqual(2);
      expect(recs[0]).toMatch(/discretionary/i);
    });
  });

  // ── Resilience ────────────────────────────────────────────
  describe('resilience', () => {
    it('_safeGenerate swallows errors and continues', () => {
      const original = generator.generateRevenueInsights;

      generator.generateRevenueInsights = () => {
        throw new Error('boom');
      };

      const insights = generator.generate({
        revenue: 100000,
        revenueGrowth: 0.22,
        grossMargin: 0.38,
        previousGrossMargin: 0.30
      });

      expect(
        insights.some(i => i.category === ADVISOR_CATEGORIES.PROFITABILITY)
      ).toBe(true);

      expect(generator.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'generator_failed',
          generator: 'revenue'
        })
      );

      generator.generateRevenueInsights = original;
    });

    it('getInsights returns a defensive copy', () => {
      generator.generate({
        revenue: 100000,
        revenueGrowth: 0.22,
        topProduct: 'WidgetX'
      });

      const a = generator.getInsights();
      const b = generator.getInsights();

      expect(a).not.toBe(b);

      a.push({ fake: true });

      expect(generator.getInsights()).toHaveLength(b.length);
    });

    it('clear() empties internal state', () => {
      generator.generate({
        revenue: 150000,
        revenueGrowth: 0.25,
        topProduct: 'Pro Plan'
      });

      expect(generator.getInsights().length).toBeGreaterThan(0);

      generator.clear();

      expect(generator.getInsights()).toEqual([]);
    });
  });
});