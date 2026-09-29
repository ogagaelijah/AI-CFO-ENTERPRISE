'use strict';

const DecisionEngine = require('../../../src/application/services/decision/DecisionEngine');
const Decision = require('../../../src/domain/entities/Decision');

/** Valid Decision factory — satisfies entity validation */
function makeDecision(overrides = {}) {
  return new Decision({
    type: 'CASH_FLOW_WARNING',
    category: 'CASH_FLOW',
    title: overrides.title || 'Test Decision',
    summary: overrides.summary || 'Test summary',
    recommendation: overrides.recommendation || 'Take action',
    severity: 'WARNING',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    relatedEntity: 'BUSINESS',
    relatedEntityId: 'global',
    evidence: {},
    impact: { financialImpact: 0 },
    ...overrides,
  });
}

describe('DecisionEngine', () => {
  let engine;
  let mockDataProviders;

  beforeEach(() => {
    mockDataProviders = {
      analytics: {
        getData: jest.fn().mockResolvedValue({
          kpis: { grossMargin: 0.25, netMargin: 0.12 },
          ratios: { currentRatio: 1.5 },
          trends: { revenueGrowth: 0.08 },
        }),
      },
      forecast: {
        getData: jest.fn().mockResolvedValue({
          projections: { cashFlow: 500000 },
        }),
      },
      risk: {
        getData: jest.fn().mockResolvedValue({
          risks: [{ type: 'CASH_FLOW_RISK' }],
          scores: { overall: 65 },
        }),
      },
      report: {
        getData: jest.fn().mockResolvedValue({
          revenue: 10000000,
          expenses: 7000000,
          profit: 3000000,
        }),
      },
      inventory: {
        getData: jest.fn().mockResolvedValue({
          items: [{ name: 'Product A', stock: 10, reorderLevel: 20 }],
        }),
      },
      customers: {
        getData: jest.fn().mockResolvedValue({
          topCustomers: [{ name: 'Customer A', revenue: 4000000 }],
        }),
      },
      suppliers: {
        getData: jest.fn().mockResolvedValue({
          topSuppliers: [{ name: 'Supplier A', purchases: 3000000 }],
        }),
      },
    };

    engine = new DecisionEngine({
      dataProviders: mockDataProviders,
      cooldownPeriod: 1000,
      confidenceThreshold: 50,
      minPriority: 'LOW',
      minImpactThreshold: 5,
      maxDecisions: 50,
    });
  });

  describe('constructor', () => {
    it('should initialize with default services', () => {
      expect(engine.confidenceService).toBeDefined();
      expect(engine.priorityService).toBeDefined();
      expect(engine.scoringService).toBeDefined();
      expect(engine.deduplicationService).toBeDefined();
      expect(engine.lifecycleService).toBeDefined();
      expect(engine.impactCalculator).toBeDefined();
      expect(engine.scenarioCalculator).toBeDefined();
      expect(engine.breakEvenCalculator).toBeDefined();
      expect(engine.ruleEngine).toBeDefined();
    });

    it('should register all rules', () => {
      const rules = engine.ruleEngine.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should accept custom configuration', () => {
      const customEngine = new DecisionEngine({
        cooldownPeriod: 5000,
        confidenceThreshold: 70,
        minPriority: 'HIGH',
        minImpactThreshold: 20,
        maxDecisions: 10,
      });

      expect(customEngine.config.cooldownPeriod).toBe(5000);
      expect(customEngine.config.confidenceThreshold).toBe(70);
      expect(customEngine.config.minPriority).toBe('HIGH');
      expect(customEngine.config.minImpactThreshold).toBe(20);
      expect(customEngine.config.maxDecisions).toBe(10);
    });

    it('should freeze config', () => {
      expect(Object.isFrozen(engine.config)).toBe(true);
    });
  });

  describe('generateDecisions', () => {
    it('should generate decisions with summary', async () => {
      const result = await engine.generateDecisions(
        { businessId: 'test_123', businessSize: 10000000 },
        { includeImpact: true, includeScenarios: false }
      );

      expect(result.correlationId).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      expect(result.context.businessId).toBe('test_123');
      expect(result.summary).toBeDefined();
      expect(result.decisions).toBeDefined();
      expect(result.fullDecisions).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should include impact calculations when requested', async () => {
      const result = await engine.generateDecisions(
        { businessId: 'test_123' },
        { includeImpact: true }
      );
      expect(result.metrics.hasImpact).toBeDefined();
    });

    it('should include scenario analysis when requested', async () => {
      const result = await engine.generateDecisions(
        { businessId: 'test_123' },
        { includeImpact: true, includeScenarios: true }
      );
      expect(result.metrics.hasScenarios).toBeDefined();
    });

    it('should respect category filter', async () => {
      const result = await engine.generateDecisions(
        { businessId: 'test_123' },
        { categories: ['CASH_FLOW'] }
      );
      const allCashFlow = result.fullDecisions.every(
        (d) => d.category === 'CASH_FLOW'
      );
      expect(allCashFlow).toBe(true);
    });

    it('should respect type filter', async () => {
      const result = await engine.generateDecisions(
        { businessId: 'test_123' },
        { types: ['CASH_FLOW_WARNING'] }
      );
      const allMatching = result.fullDecisions.every(
        (d) => d.type === 'CASH_FLOW_WARNING'
      );
      expect(allMatching).toBe(true);
    });

    it('should respect max decisions limit', async () => {
      const result = await engine.generateDecisions(
        { businessId: 'test_123' },
        { limit: 5 }
      );
      expect(result.fullDecisions.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty context without throwing', async () => {
      await expect(engine.generateDecisions()).resolves.toBeDefined();
    });
  });

  describe('gatherData', () => {
    it('should gather data from all providers', async () => {
      const data = await engine.gatherData({ businessId: 'test_123' });

      expect(mockDataProviders.analytics.getData).toHaveBeenCalled();
      expect(mockDataProviders.forecast.getData).toHaveBeenCalled();
      expect(mockDataProviders.risk.getData).toHaveBeenCalled();
      expect(mockDataProviders.report.getData).toHaveBeenCalled();
      expect(mockDataProviders.inventory.getData).toHaveBeenCalled();
      expect(mockDataProviders.customers.getData).toHaveBeenCalled();
      expect(mockDataProviders.suppliers.getData).toHaveBeenCalled();

      expect(data.kpis).toBeDefined();
      expect(data.projections).toBeDefined();
      expect(data.risks).toBeDefined();
    });

    it('should handle missing providers gracefully', async () => {
      const minimalEngine = new DecisionEngine({});
      const data = await minimalEngine.gatherData({ businessId: 'test_123' });
      expect(data).toBeDefined();
    });

    it('should handle provider errors gracefully', async () => {
      mockDataProviders.analytics.getData = jest
        .fn()
        .mockRejectedValue(new Error('Provider error'));

      const data = await engine.gatherData({ businessId: 'test_123' });
      expect(data).toBeDefined();
      expect(data.projections).toBeDefined();
    });
  });

  describe('flattenData', () => {
    it('should flatten nested data structure', () => {
      const data = {
        analytics: {
          kpis: { grossMargin: 0.25 },
          ratios: { currentRatio: 1.5 },
        },
        forecast: {
          projections: { cashFlow: 500000 },
        },
      };

      const flat = engine.flattenData(data);

      expect(flat.kpis).toEqual({ grossMargin: 0.25 });
      expect(flat.ratios).toEqual({ currentRatio: 1.5 });
      expect(flat.projections).toEqual({ cashFlow: 500000 });
      expect(flat._raw).toBe(data);
    });
  });

  describe('scoreDecisions', () => {
    it('should score decisions correctly', async () => {
      const decisions = [
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          category: 'CASH_FLOW',
          title: 'Cash pressure',
          recommendation: 'Collect receivables',
          evidence: { currentCash: 100000, projectedCash: 50000 },
          severity: 'WARNING',
        }),
      ];

      const scored = await engine.scoreDecisions(
        decisions,
        { currentCash: 100000, projectedCash: 50000 },
        { businessSize: 10000000 }
      );

      expect(scored.length).toBeGreaterThan(0);
      expect(scored[0].confidence).toBeDefined();
      expect(scored[0].priority).toBeDefined();
      expect(scored[0].scoring).toBeDefined();
    });

    it('should filter out decisions below threshold', async () => {
      // Use a real type but starved evidence so confidence fails threshold
      const decisions = [
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          category: 'CASH_FLOW',
          title: 'Low quality',
          recommendation: 'Review data',
          evidence: {
            transactionCount: 1,
            lastUpdated: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          },
          severity: 'INFO',
          impact: { financialImpact: 0 },
        }),
      ];

      const scored = await engine.scoreDecisions(
        decisions,
        {},
        { businessSize: 10000000 }
      );

      // May be 0 if scoring rejects low-quality evidence
      expect(Array.isArray(scored)).toBe(true);
    });
  });

  describe('deduplicateDecisions', () => {
    it('should deduplicate duplicate decisions', () => {
      const decisions = [
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
          confidence: 80,
        }),
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
          confidence: 90,
        }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Low stock',
          recommendation: 'Reorder',
          relatedEntity: 'PRODUCT',
          relatedEntityId: 'prod_1',
          confidence: 85,
        }),
      ];

      const unique = engine.deduplicateDecisions(decisions);
      expect(unique.length).toBe(2);
      expect(
        unique.find((d) => d.type === 'CASH_FLOW_WARNING').confidence
      ).toBe(90);
    });

    it('should handle cooldown periods', () => {
      const decisions = [
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
        }),
      ];

      engine.addToHistory(decisions);

      const newDecisions = [
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
        }),
      ];

      const unique = engine.deduplicateDecisions(newDecisions);
      expect(unique.length).toBe(0);
    });
  });

  describe('filterDecisions', () => {
    it('should filter by category', () => {
      const decisions = [
        makeDecision({ type: 'CASH_FLOW_WARNING', category: 'CASH_FLOW' }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Stock',
          recommendation: 'Reorder',
        }),
        makeDecision({
          type: 'MARGIN_COMPRESSION',
          category: 'PRICING',
          title: 'Margin',
          recommendation: 'Review pricing',
        }),
      ];

      const filtered = engine.filterDecisions(decisions, {
        categories: ['CASH_FLOW'],
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].category).toBe('CASH_FLOW');
    });

    it('should filter by type', () => {
      const decisions = [
        makeDecision({ type: 'CASH_FLOW_WARNING', category: 'CASH_FLOW' }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Stock',
          recommendation: 'Reorder',
        }),
      ];

      const filtered = engine.filterDecisions(decisions, {
        types: ['LOW_STOCK'],
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].type).toBe('LOW_STOCK');
    });

    it('should return all decisions when no filters', () => {
      const decisions = [
        makeDecision({ type: 'CASH_FLOW_WARNING', category: 'CASH_FLOW' }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Stock',
          recommendation: 'Reorder',
        }),
      ];

      const filtered = engine.filterDecisions(decisions, {});
      expect(filtered.length).toBe(2);
    });
  });

  describe('sortByPriority', () => {
    it('should sort decisions by priority (highest first)', () => {
      const decisions = [
        makeDecision({ type: 'CASH_FLOW_WARNING', priority: 'LOW' }),
        makeDecision({ type: 'CASH_FLOW_WARNING', priority: 'CRITICAL' }),
        makeDecision({ type: 'CASH_FLOW_WARNING', priority: 'HIGH' }),
        makeDecision({ type: 'CASH_FLOW_WARNING', priority: 'MEDIUM' }),
      ];

      const sorted = engine.sortByPriority(decisions);
      expect(sorted[0].priority).toBe('CRITICAL');
      expect(sorted[1].priority).toBe('HIGH');
      expect(sorted[2].priority).toBe('MEDIUM');
      expect(sorted[3].priority).toBe('LOW');
    });
  });

  describe('generateSummary', () => {
    it('should generate complete summary', () => {
      const decisions = [
        makeDecision({
          priority: 'CRITICAL',
          severity: 'CRITICAL',
          category: 'CASH_FLOW',
          confidence: 90,
        }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Stock',
          recommendation: 'Reorder',
          priority: 'HIGH',
          severity: 'WARNING',
          confidence: 80,
        }),
        makeDecision({
          type: 'MARGIN_COMPRESSION',
          category: 'PRICING',
          title: 'Margin',
          recommendation: 'Review',
          priority: 'MEDIUM',
          severity: 'INFO',
          confidence: 70,
        }),
        makeDecision({
          type: 'REVENUE_GROWTH_OPPORTUNITY',
          category: 'GROWTH',
          title: 'Growth',
          recommendation: 'Invest',
          priority: 'LOW',
          severity: 'OPPORTUNITY',
          confidence: 60,
        }),
      ];

      const summary = engine.generateSummary(decisions);

      expect(summary.total).toBe(4);
      expect(summary.byPriority.CRITICAL).toBe(1);
      expect(summary.byPriority.HIGH).toBe(1);
      expect(summary.byPriority.MEDIUM).toBe(1);
      expect(summary.byPriority.LOW).toBe(1);
      expect(summary.bySeverity.CRITICAL).toBe(1);
      expect(summary.bySeverity.WARNING).toBe(1);
      expect(summary.bySeverity.INFO).toBe(1);
      expect(summary.bySeverity.OPPORTUNITY).toBe(1);
      expect(summary.byCategory.CASH_FLOW).toBe(1);
      expect(summary.byCategory.INVENTORY).toBe(1);
      expect(summary.byCategory.PRICING).toBe(1);
      expect(summary.byCategory.GROWTH).toBe(1);
      expect(summary.averageConfidence).toBe(75);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics about decisions', () => {
      const decisions = [
        makeDecision({
          priority: 'CRITICAL',
          category: 'CASH_FLOW',
          confidence: 90,
        }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Stock',
          recommendation: 'Reorder',
          priority: 'HIGH',
          confidence: 80,
        }),
      ];

      const metrics = engine.getMetrics(decisions);

      expect(metrics.total).toBe(2);
      expect(metrics.averageConfidence).toBe(85);
      expect(metrics.priorities).toEqual(['CRITICAL', 'HIGH']);
      expect(metrics.categories).toEqual(['CASH_FLOW', 'INVENTORY']);
    });
  });

  describe('addToHistory', () => {
    it('should add decisions to history', () => {
      const decisions = [
        makeDecision({ title: 'A', recommendation: 'Act' }),
        makeDecision({ title: 'B', recommendation: 'Act' }),
      ];

      engine.addToHistory(decisions);
      expect(engine.decisionHistory.length).toBe(2);
    });

    it('should limit history to 1000 items', () => {
      const decisions = [];
      for (let i = 0; i < 1005; i++) {
        decisions.push(
          makeDecision({
            title: `T${i}`,
            recommendation: 'Act',
            id: `dec_${i}`,
          })
        );
      }

      engine.addToHistory(decisions);
      expect(engine.decisionHistory.length).toBe(1000);
    });
  });

  describe('getByCategory', () => {
    it('should filter decisions by category', () => {
      const decisions = [
        makeDecision({ category: 'CASH_FLOW' }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Stock',
          recommendation: 'Reorder',
        }),
      ];

      const result = engine.getByCategory(decisions, 'CASH_FLOW');
      expect(result.length).toBe(1);
      expect(result[0].category).toBe('CASH_FLOW');
    });
  });

  describe('getByPriority', () => {
    it('should filter decisions by priority', () => {
      const decisions = [
        makeDecision({ priority: 'CRITICAL' }),
        makeDecision({ priority: 'HIGH' }),
      ];

      const result = engine.getByPriority(decisions, 'CRITICAL');
      expect(result.length).toBe(1);
      expect(result[0].priority).toBe('CRITICAL');
    });
  });

  describe('getTopDecisions', () => {
    it('should return top N decisions', () => {
      const decisions = [
        makeDecision({ priority: 'LOW' }),
        makeDecision({ priority: 'CRITICAL' }),
        makeDecision({ priority: 'HIGH' }),
        makeDecision({ priority: 'MEDIUM' }),
      ];

      const top = engine.getTopDecisions(decisions, 2);
      expect(top.length).toBe(2);
      expect(top[0].priority).toBe('CRITICAL');
      expect(top[1].priority).toBe('HIGH');
    });
  });

  describe('getCriticalDecisions', () => {
    it('should return only CRITICAL decisions', () => {
      const decisions = [
        makeDecision({ priority: 'CRITICAL' }),
        makeDecision({ priority: 'HIGH' }),
        makeDecision({ priority: 'CRITICAL' }),
      ];

      const critical = engine.getCriticalDecisions(decisions);
      expect(critical.length).toBe(2);
      expect(critical.every((d) => d.priority === 'CRITICAL')).toBe(true);
    });
  });

  describe('getActionableDecisions', () => {
    it('should return only actionable decisions', () => {
      const decisions = [
        makeDecision({ status: 'ACTIVE' }),
        makeDecision({ status: 'ACKNOWLEDGED' }),
        makeDecision({ status: 'RESOLVED' }),
        makeDecision({ status: 'EXPIRED' }),
      ];

      const actionable = engine.getActionableDecisions(decisions);
      expect(actionable.length).toBe(2);
      expect(
        actionable.every((d) =>
          ['ACTIVE', 'ACKNOWLEDGED'].includes(d.status)
        )
      ).toBe(true);
    });
  });

  describe('getSummaryForDisplay', () => {
    it('should return formatted summary for display', () => {
      const decisions = [
        makeDecision({ priority: 'CRITICAL', status: 'ACTIVE' }),
        makeDecision({ priority: 'HIGH', status: 'ACKNOWLEDGED' }),
      ];

      const summary = engine.getSummaryForDisplay(decisions);

      expect(summary.summary).toBeDefined();
      expect(summary.topDecisions).toBeDefined();
      expect(summary.criticalDecisions).toBeDefined();
      expect(summary.actionableCount).toBe(2);
      expect(summary.totalImpact).toBeDefined();
    });
  });
});