// tests/unit/risk/contracts/RiskContracts.test.js

'use strict';

const {
  RiskContracts,
  RISK_TYPES,
  SEVERITY_LEVELS,
  RISK_STATUS,
} = require('../../../../src/application/services/risk/contracts');

/**
 * Helpers – keep assertions DRY and explicit
 */
const expectValidRiskShape = (risk) => {
  expect(risk).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      type: expect.any(String),
      title: expect.any(String),
      severity: expect.stringMatching(/^(LOW|MEDIUM|HIGH|CRITICAL)$/),
      score: expect.any(Number),
      status: expect.stringMatching(/^(ACTIVE|MITIGATED|RESOLVED|ARCHIVED)$/),
      description: expect.any(String),
      metrics: expect.any(Object),
      evidence: expect.any(Array),
      impact: expect.any(Object),
      recommendation: expect.any(String),
      confidence: expect.any(Number),
      trend: expect.objectContaining({
        direction: expect.stringMatching(/^(IMPROVING|STABLE|WORSENING)$/),
      }),
      createdAt: expect.any(String), // ISO
      updatedAt: expect.any(String),
    })
  );
  expect(risk.score).toBeGreaterThanOrEqual(0);
  expect(risk.score).toBeLessThanOrEqual(100);
  expect(risk.confidence).toBeGreaterThanOrEqual(0);
  expect(risk.confidence).toBeLessThanOrEqual(1);
};

describe('RiskContracts', () => {
  // ──────────────────────────────────────────────
  // Severity helpers
  // ──────────────────────────────────────────────
  describe('getSeverity()', () => {
    const cases = [
      { score: -50, expected: 'LOW' },
      { score: 0, expected: 'LOW' },
      { score: 24, expected: 'LOW' },
      { score: 25, expected: 'MEDIUM' },
      { score: 49, expected: 'MEDIUM' },
      { score: 50, expected: 'HIGH' },
      { score: 74, expected: 'HIGH' },
      { score: 75, expected: 'CRITICAL' },
      { score: 100, expected: 'CRITICAL' },
      { score: 150, expected: 'CRITICAL' },
      { score: Number.MAX_SAFE_INTEGER, expected: 'CRITICAL' },
      { score: Number.MIN_SAFE_INTEGER, expected: 'LOW' },
      { score: NaN, expected: 'LOW' }, // defensive default
      { score: Infinity, expected: 'CRITICAL' },
      { score: -Infinity, expected: 'LOW' },
    ];

    test.each(cases)('score $score → $expected', ({ score, expected }) => {
      expect(RiskContracts.getSeverity(score)).toBe(expected);
    });
  });

  describe('getSeverityLabel()', () => {
    const cases = [
      ['LOW', 'Low'],
      ['MEDIUM', 'Medium'],
      ['HIGH', 'High'],
      ['CRITICAL', 'Critical'],
    ];

    test.each(cases)('%s → %s', (level, label) => {
      expect(RiskContracts.getSeverityLabel(level)).toBe(label);
    });

    test('unknown severity returns fallback', () => {
      expect(RiskContracts.getSeverityLabel('UNKNOWN')).toBe('Unknown');
      expect(RiskContracts.getSeverityLabel(null)).toBe('Unknown');
      expect(RiskContracts.getSeverityLabel(undefined)).toBe('Unknown');
    });
  });

  describe('getSeverityColor()', () => {
    const cases = [
      ['LOW', 'green'],
      ['MEDIUM', 'yellow'],
      ['HIGH', 'orange'],
      ['CRITICAL', 'red'],
    ];

    test.each(cases)('%s → %s', (level, color) => {
      expect(RiskContracts.getSeverityColor(level)).toBe(color);
    });

    test('unknown severity returns neutral', () => {
      expect(RiskContracts.getSeverityColor('FOO')).toBe('gray');
    });
  });

  describe('getSeverityIcon()', () => {
    const cases = [
      ['LOW', '🟢'],
      ['MEDIUM', '🟡'],
      ['HIGH', '🟠'],
      ['CRITICAL', '🔴'],
    ];

    test.each(cases)('%s → %s', (level, icon) => {
      expect(RiskContracts.getSeverityIcon(level)).toBe(icon);
    });

    test('unknown severity returns neutral icon', () => {
      expect(RiskContracts.getSeverityIcon('FOO')).toBe('⚪');
    });
  });

  // ──────────────────────────────────────────────
  // Core factory
  // ──────────────────────────────────────────────
  describe('createRisk()', () => {
    const basePayload = {
      type: RISK_TYPES.CASH_FLOW,
      title: 'Test Risk',
      score: 75,
      description: 'Test description',
      metrics: { cash: 10_000 },
      evidence: ['Evidence 1'],
      impact: { financial: 5_000, timeframe: '30 days' },
      recommendation: 'Take action',
      confidence: 0.9,
    };

    test('creates a fully valid risk object', () => {
      const risk = RiskContracts.createRisk(basePayload);

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.CASH_FLOW);
      expect(risk.title).toBe('Test Risk');
      expect(risk.severity).toBe('CRITICAL');
      expect(risk.score).toBe(75);
      expect(risk.status).toBe(RISK_STATUS.ACTIVE);
      expect(risk.description).toBe('Test description');
      expect(risk.metrics).toEqual({ cash: 10_000 });
      expect(risk.evidence).toEqual(['Evidence 1']);
      expect(risk.impact).toEqual({ financial: 5_000, timeframe: '30 days' });
      expect(risk.recommendation).toBe('Take action');
      expect(risk.confidence).toBe(0.9);
      expect(risk.id).toMatch(/^risk_/); // or whatever your ID scheme is
    });

    test('clamps score to [0, 100]', () => {
      expect(RiskContracts.createRisk({ ...basePayload, score: -20 }).score).toBe(0);
      expect(RiskContracts.createRisk({ ...basePayload, score: 140 }).score).toBe(100);
    });

    test('clamps confidence to [0, 1]', () => {
      expect(RiskContracts.createRisk({ ...basePayload, confidence: -0.5 }).confidence).toBe(0);
      expect(RiskContracts.createRisk({ ...basePayload, confidence: 1.5 }).confidence).toBe(1);
    });

    test('defaults missing optional fields safely', () => {
      const risk = RiskContracts.createRisk({
        type: RISK_TYPES.CASH_FLOW,
        title: 'Minimal',
        score: 40,
      });

      expectValidRiskShape(risk);
      expect(risk.description).toBe('');
      expect(risk.metrics).toEqual({});
      expect(risk.evidence).toEqual([]);
      expect(risk.impact).toEqual({});
      expect(risk.recommendation).toBeTruthy();
      expect(risk.confidence).toBeGreaterThanOrEqual(0);
      expect(risk.confidence).toBeLessThanOrEqual(1);
    });

    describe('trend calculation', () => {
      const trendCases = [
        { score: 80, previousScore: 60, expected: 'WORSENING' },
        { score: 50, previousScore: 70, expected: 'IMPROVING' },
        { score: 50, previousScore: 50, expected: 'STABLE' },
        { score: 50, previousScore: 49, expected: 'STABLE' }, // small delta
        { score: 50, previousScore: 55, expected: 'STABLE' },
        { score: 90, previousScore: undefined, expected: 'STABLE' }, // no history
        { score: 10, previousScore: null, expected: 'STABLE' },
      ];

      test.each(trendCases)(
        'score $score vs previous $previousScore → $expected',
        ({ score, previousScore, expected }) => {
          const risk = RiskContracts.createRisk({
            ...basePayload,
            score,
            previousScore,
          });
          expect(risk.trend.direction).toBe(expected);
        }
      );
    });

    test('generates unique IDs', () => {
      const ids = new Set(
        Array.from({ length: 50 }, () =>
          RiskContracts.createRisk(basePayload).id
        )
      );
      expect(ids.size).toBe(50);
    });

    test('throws or returns safe default on completely invalid input', () => {
      // Adjust according to actual contract (throw vs soft-fail)
      expect(() => RiskContracts.createRisk(null)).toThrow();
      expect(() => RiskContracts.createRisk({})).toThrow(); // missing required
    });
  });

  // ──────────────────────────────────────────────
  // Domain-specific factories
  // ──────────────────────────────────────────────
  describe('createCashRisk()', () => {
    test('critical cash runway', () => {
      const risk = RiskContracts.createCashRisk({
        score: 85,
        currentCash: 100_000,
        averageMonthlyBurn: 150_000,
        cashRunwayMonths: 0.67,
      });

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.CASH_FLOW);
      expect(risk.severity).toBe('CRITICAL');
      expect(risk.metrics.currentCash).toBe(100_000);
      expect(risk.metrics.cashRunwayMonths).toBeCloseTo(0.67);
      expect(risk.recommendation.toLowerCase()).toMatch(/immediate|urgent|critical/);
    });

    test('healthy cash position', () => {
      const risk = RiskContracts.createCashRisk({
        score: 15,
        currentCash: 500_000,
        averageMonthlyBurn: 100_000,
        cashRunwayMonths: 5,
      });

      expect(risk.severity).toBe('LOW');
      expect(risk.recommendation.toLowerCase()).toMatch(/maintain|healthy|continue/);
    });

    test('handles zero / negative burn safely', () => {
      const risk = RiskContracts.createCashRisk({
        score: 10,
        currentCash: 1_000_000,
        averageMonthlyBurn: 0,
        cashRunwayMonths: Infinity,
      });
      expect(risk.severity).toBe('LOW');
      expect(Number.isFinite(risk.metrics.cashRunwayMonths) || risk.metrics.cashRunwayMonths === Infinity).toBe(true);
    });
  });

  describe('createRevenueRisk()', () => {
    test('critical revenue decline', () => {
      const risk = RiskContracts.createRevenueRisk({
        score: 80,
        currentRevenue: 500_000,
        previousRevenue: 800_000,
        revenueGrowth: -37.5,
      });

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.REVENUE);
      expect(risk.severity).toBe('CRITICAL');
      expect(risk.metrics.revenueGrowth).toBeCloseTo(-37.5);
      expect(risk.recommendation.toLowerCase()).toMatch(/immediate|review|action/);
    });

    test('healthy revenue growth', () => {
      const risk = RiskContracts.createRevenueRisk({
        score: 10,
        currentRevenue: 800_000,
        previousRevenue: 750_000,
        revenueGrowth: 6.67,
      });

      expect(risk.severity).toBe('LOW');
      expect(risk.recommendation.toLowerCase()).toMatch(/maintain|healthy/);
    });
  });

  describe('createProfitabilityRisk()', () => {
    test('critical margin erosion', () => {
      const risk = RiskContracts.createProfitabilityRisk({
        score: 78,
        currentMargin: 12,
        previousMargin: 28,
        marginChange: -16,
        marginType: 'gross',
      });

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.PROFITABILITY);
      expect(risk.severity).toBe('CRITICAL');
      expect(risk.metrics.marginChange).toBe(-16);
      expect(risk.recommendation.toLowerCase()).toMatch(/immediate|review/);
    });
  });

  describe('createExpenseRisk()', () => {
    test('high expense growth relative to revenue', () => {
      const risk = RiskContracts.createExpenseRisk({
        score: 65,
        currentExpenses: 200_000,
        previousExpenses: 150_000,
        expenseGrowth: 33.33,
        revenueGrowth: 5,
      });

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.EXPENSE);
      expect(risk.severity).toBe('HIGH');
      expect(risk.recommendation.toLowerCase()).toMatch(/review|expense|cost/);
    });
  });

  describe('createReceivablesRisk()', () => {
    test('high overdue receivables', () => {
      const risk = RiskContracts.createReceivablesRisk({
        score: 72,
        totalReceivables: 500_000,
        overdueReceivables: 300_000,
        overduePercentage: 60,
      });

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.RECEIVABLES);
      expect(risk.severity).toBe('HIGH');
      expect(risk.recommendation.toLowerCase()).toMatch(/collection|immediate|overdue/);
    });
  });

  describe('createPayablesRisk()', () => {
    test('medium overdue payables', () => {
      const risk = RiskContracts.createPayablesRisk({
        score: 45,
        totalPayables: 400_000,
        overduePayables: 120_000,
        overduePercentage: 30,
      });

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.PAYABLES);
      expect(risk.severity).toBe('MEDIUM');
      expect(risk.recommendation.toLowerCase()).toMatch(/review|payment|schedule/);
    });
  });

  describe('createInventoryRisk()', () => {
    test('elevated inventory risk', () => {
      const risk = RiskContracts.createInventoryRisk({
        score: 55,
        inventoryValue: 300_000,
        inventoryGrowth: 25,
        revenueGrowth: 5,
        lowStockItems: 3,
      });

      expectValidRiskShape(risk);
      expect(risk.type).toBe(RISK_TYPES.INVENTORY);
      expect(risk.severity).toBe('HIGH');
      expect(risk.recommendation.toLowerCase()).toMatch(/monitor|inventory|growth|stock/);
    });
  });

  // ──────────────────────────────────────────────
  // Cross-cutting concerns
  // ──────────────────────────────────────────────
  describe('immutability & pure functions', () => {
    test('create* methods do not mutate input', () => {
      const input = {
        type: RISK_TYPES.CASH_FLOW,
        title: 'Immutable Test',
        score: 40,
        metrics: { a: 1 },
        evidence: ['x'],
      };
      const snapshot = structuredClone(input);

      RiskContracts.createRisk(input);
      expect(input).toEqual(snapshot);
    });
  });

  describe('severity helpers consistency', () => {
    test('label / color / icon stay in sync with SEVERITY_LEVELS', () => {
      Object.keys(SEVERITY_LEVELS).forEach((level) => {
        expect(RiskContracts.getSeverityLabel(level)).toBeTruthy();
        expect(RiskContracts.getSeverityColor(level)).toBeTruthy();
        expect(RiskContracts.getSeverityIcon(level)).toBeTruthy();
      });
    });
  });
});