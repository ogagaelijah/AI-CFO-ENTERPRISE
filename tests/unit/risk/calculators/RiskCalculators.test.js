// tests/unit/risk/calculators/RiskCalculators.test.js

'use strict';

const {
  RevenueRiskCalculator,
  ReceivablesRiskCalculator,
  ProfitabilityRiskCalculator,
  PayablesRiskCalculator,
  InventoryRiskCalculator,
  CashFlowRiskCalculator,
  ExpenseRiskCalculator,
  RiskCalculatorRegistry,
} = require('../../../../src/application/services/risk/calculators');

const {
  RISK_TYPES,
  RISK_STATUS,
} = require('../../../../src/application/services/risk/contracts');

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

describe('Risk Calculators Suite', () => {
  // ──────────────────────────────────────────────
  // Shared helpers
  // ──────────────────────────────────────────────
  const baseParams = {
    userId: 'user-1',
    businessId: 'biz-1',
  };

  const expectValidRiskShape = (risk, expectedType) => {
    expect(risk).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: expectedType,
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
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        meta: expect.objectContaining({
          calculator: expect.any(String),
          calculatorVersion: expect.any(String),
        }),
      })
    );

    expect(risk.score).toBeGreaterThanOrEqual(0);
    expect(risk.score).toBeLessThanOrEqual(100);
    expect(risk.confidence).toBeGreaterThanOrEqual(0);
    expect(risk.confidence).toBeLessThanOrEqual(1);
  };

  // ──────────────────────────────────────────────
  // Individual Calculators – Parametrized
  // ──────────────────────────────────────────────
  describe.each([
    {
      name: 'RevenueRiskCalculator',
      Calculator: RevenueRiskCalculator,
      type: RISK_TYPES.REVENUE,
      healthyPayload: {
        revenueData: [
          { revenue: 100_000 },
          { revenue: 110_000 },
          { revenue: 125_000 },
        ],
      },
      criticalPayload: {
        revenueData: [
          { revenue: 200_000 },
          { revenue: 90_000 },
        ],
      },
      criticalScoreMin: 50,
    },
    {
      name: 'ReceivablesRiskCalculator',
      Calculator: ReceivablesRiskCalculator,
      type: RISK_TYPES.RECEIVABLES,
      healthyPayload: {
        receivablesData: [{ value: 300_000 }],
        agingData: {
          current: 280_000,
          days1to30: 15_000,
          days31to60: 5_000,
          days61to90: 0,
          daysOver90: 0,
        },
      },
      criticalPayload: {
        receivablesData: [{ value: 500_000 }],
        agingData: {
          current: 100_000,
          days1to30: 50_000,
          days31to60: 100_000,
          days61to90: 100_000,
          daysOver90: 150_000,
        },
      },
      criticalScoreMin: 40,
    },
    {
      name: 'ProfitabilityRiskCalculator',
      Calculator: ProfitabilityRiskCalculator,
      type: RISK_TYPES.PROFITABILITY,
      healthyPayload: {
        marginData: [{ margin: 32 }, { margin: 34 }, { margin: 35 }],
        marginType: 'gross',
      },
      criticalPayload: {
        marginData: [{ margin: 28 }, { margin: 9 }],
        marginType: 'gross',
      },
      criticalScoreMin: 40,
    },
    {
      name: 'PayablesRiskCalculator',
      Calculator: PayablesRiskCalculator,
      type: RISK_TYPES.PAYABLES,
      healthyPayload: {
        payablesData: [{ value: 200_000 }],
        agingData: {
          current: 180_000,
          days1to30: 15_000,
          days31to60: 5_000,
          days61to90: 0,
          daysOver90: 0,
        },
      },
      criticalPayload: {
        payablesData: [{ value: 400_000 }],
        agingData: {
          current: 100_000,
          days1to30: 50_000,
          days31to60: 80_000,
          days61to90: 80_000,
          daysOver90: 90_000,
        },
      },
      criticalScoreMin: 40,
    },
    {
      name: 'InventoryRiskCalculator',
      Calculator: InventoryRiskCalculator,
      type: RISK_TYPES.INVENTORY,
      healthyPayload: {
        inventoryData: [
          { value: 150_000, revenue: 600_000 },
          { value: 160_000, revenue: 620_000 },
        ],
        revenueGrowth: 8,
        lowStockItems: 1,
      },
      criticalPayload: {
        inventoryData: [
          { value: 200_000, revenue: 500_000 },
          { value: 350_000, revenue: 510_000 },
        ],
        revenueGrowth: 2,
        lowStockItems: 12,
      },
      criticalScoreMin: 40,
    },
    {
      name: 'CashFlowRiskCalculator',
      Calculator: CashFlowRiskCalculator,
      type: RISK_TYPES.CASH_FLOW,
      healthyPayload: {
        currentCash: 1_500_000,
        averageMonthlyBurn: 120_000,
      },
      criticalPayload: {
        currentCash: 90_000,
        averageMonthlyBurn: 180_000,
      },
      criticalScoreMin: 50,
    },
    {
      name: 'ExpenseRiskCalculator',
      Calculator: ExpenseRiskCalculator,
      type: RISK_TYPES.EXPENSE,
      healthyPayload: {
        expenseData: [
          { value: 80_000 },
          { value: 82_000 },
          { value: 85_000 },
        ],
        revenueGrowth: 10,
      },
      criticalPayload: {
        expenseData: [
          { value: 100_000 },
          { value: 160_000 },
        ],
        revenueGrowth: 4,
      },
      criticalScoreMin: 40,
    },
  ])('$name', ({ Calculator, type, healthyPayload, criticalPayload, criticalScoreMin }) => {
    let calculator;

    beforeEach(() => {
      calculator = new Calculator({ logger: mockLogger });
    });

    test('returns valid risk shape on healthy data', async () => {
      const risk = await calculator.calculate({
        ...baseParams,
        ...healthyPayload,
      });

      expectValidRiskShape(risk, type);
      expect(risk.score).toBeLessThanOrEqual(40); // ← fixed
      expect(risk.meta.calculator).toBe(Calculator.name);
    });

    test('detects elevated / critical risk', async () => {
      const risk = await calculator.calculate({
        ...baseParams,
        ...criticalPayload,
      });

      expectValidRiskShape(risk, type);
      expect(risk.score).toBeGreaterThanOrEqual(criticalScoreMin);
      expect(risk.severity).toMatch(/MEDIUM|HIGH|CRITICAL/);
    });

    test('never throws – returns fallback on invalid input', async () => {
      const risk = await calculator.calculate({
        userId: null,
        businessId: null,
      });

      expect(risk.type).toBe(type);
      expect(risk.score).toBe(75);
      expect(risk.meta.error).toBe(true);
      expect(risk.status).toBe(RISK_STATUS.ACTIVE);
    });

    test('handles empty data arrays gracefully', async () => {
      const emptyPayload = Object.fromEntries(
        Object.keys(healthyPayload).map((k) => [
          k,
          Array.isArray(healthyPayload[k]) ? [] : healthyPayload[k],
        ])
      );

      const risk = await calculator.calculate({
        ...baseParams,
        ...emptyPayload,
      });

      expectValidRiskShape(risk, type);
    });
  });

  // ──────────────────────────────────────────────
  // High-value Edge Cases
  // ──────────────────────────────────────────────
  describe('Edge Cases', () => {
    test('CashFlow – Infinity runway (zero burn) is handled safely', async () => {
      const calculator = new CashFlowRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        currentCash: 2_000_000,
        averageMonthlyBurn: 0,
      });

      expectValidRiskShape(risk, RISK_TYPES.CASH_FLOW);
      expect(
        risk.metrics.cashRunwayMonths === Infinity ||
          Number.isFinite(risk.metrics.cashRunwayMonths)
      ).toBe(true);
      expect(risk.score).toBeLessThan(30);
    });

    test('CashFlow – negative cash produces high score', async () => {
      const calculator = new CashFlowRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        currentCash: -50_000,
        averageMonthlyBurn: 80_000,
      });

      expect(risk.score).toBeGreaterThanOrEqual(50);
      expect(risk.evidence.some((e) => /negative|zero/i.test(e))).toBe(true);
    });

    test('Profitability – negative margin is detected', async () => {
      const calculator = new ProfitabilityRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        marginData: [{ margin: -4.5 }],
        marginType: 'net',
      });

      expect(risk.metrics.isNegative).toBe(true);
      expect(risk.score).toBeGreaterThanOrEqual(30);
      expect(risk.evidence.some((e) => /negative/i.test(e))).toBe(true);
    });

    test('Receivables – missing aging data does not crash', async () => {
      const calculator = new ReceivablesRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        receivablesData: [{ value: 400_000 }, { value: 450_000 }],
        agingData: null,
      });

      expectValidRiskShape(risk, RISK_TYPES.RECEIVABLES);
      expect(risk.metrics.overduePercentage).toBeDefined();
    });

    test('Payables – missing aging data does not crash', async () => {
      const calculator = new PayablesRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        payablesData: [{ value: 300_000 }],
        agingData: undefined,
      });

      expectValidRiskShape(risk, RISK_TYPES.PAYABLES);
    });

    test('Inventory – high concentration + many slow-moving items', async () => {
      const calculator = new InventoryRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        inventoryData: [{ value: 500_000 }],
        revenueGrowth: 2,
        lowStockItems: 8,
        inventoryDetails: [
          { value: 400_000, daysSinceLastSale: 120 },
          { value: 50_000, daysSinceLastSale: 45 },
          { value: 50_000, daysSinceLastSale: 10 },
        ],
      });

      expect(risk.metrics.inventoryConcentration).toBeGreaterThan(70);
      expect(risk.metrics.slowMovingItems).toBeGreaterThan(0);
      expect(risk.score).toBeGreaterThan(20);
    });

    test('Expense – expenses growing while revenue is flat/negative', async () => {
      const calculator = new ExpenseRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        expenseData: [
          { value: 100_000 },
          { value: 145_000 },
        ],
        revenueGrowth: -2,
      });

      expect(risk.metrics.expenseToRevenueGap).toBeGreaterThan(40);
      expect(risk.score).toBeGreaterThanOrEqual(40);
    });

    test('Revenue – single data point still returns valid contract', async () => {
      const calculator = new RevenueRiskCalculator({ logger: mockLogger });

      const risk = await calculator.calculate({
        ...baseParams,
        revenueData: [{ revenue: 75_000 }],
      });

      expectValidRiskShape(risk, RISK_TYPES.REVENUE);
      expect(risk.metrics.dataPoints).toBe(1);
    });
  });

  // ──────────────────────────────────────────────
  // Registry
  // ──────────────────────────────────────────────
  describe('RiskCalculatorRegistry', () => {
    let registry;

    beforeEach(() => {
      registry = new RiskCalculatorRegistry({ logger: mockLogger });
    });

    test('registers all 7 calculators', () => {
      const types = registry.listTypes();
      expect(types).toHaveLength(7);
      expect(types).toEqual(
        expect.arrayContaining([
          RISK_TYPES.REVENUE,
          RISK_TYPES.RECEIVABLES,
          RISK_TYPES.PROFITABILITY,
          RISK_TYPES.PAYABLES,
          RISK_TYPES.INVENTORY,
          RISK_TYPES.CASH_FLOW,
          RISK_TYPES.EXPENSE,
        ])
      );
    });

    test('calculateOne works for a known type', async () => {
      const risk = await registry.calculateOne(RISK_TYPES.REVENUE, {
        ...baseParams,
        revenueData: [{ revenue: 100_000 }, { revenue: 120_000 }],
      });

      expectValidRiskShape(risk, RISK_TYPES.REVENUE);
    });

    test('calculateOne throws for unknown type', async () => {
      await expect(
        registry.calculateOne('UNKNOWN_TYPE', baseParams)
      ).rejects.toThrow(/No calculator registered/);
    });

    test('calculateAll runs the full suite in parallel', async () => {
      const results = await registry.calculateAll({
        userId: 'user-1',
        businessId: 'biz-1',
        data: {
          revenue: [{ revenue: 100_000 }, { revenue: 90_000 }],
          cash: [{ cash: 400_000 }],
          currentCash: 400_000,
          averageMonthlyBurn: 90_000,
          expenses: [{ value: 70_000 }, { value: 95_000 }],
          revenueGrowth: 3,
        },
      });

      expect(results[RISK_TYPES.REVENUE]).toBeDefined();
      expect(results[RISK_TYPES.CASH_FLOW]).toBeDefined();
      expect(results[RISK_TYPES.EXPENSE]).toBeDefined();
      expect(Object.keys(results).length).toBeGreaterThanOrEqual(3);
    });
  });
});