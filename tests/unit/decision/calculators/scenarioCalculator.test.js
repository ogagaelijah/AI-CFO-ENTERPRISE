'use strict';

const ScenarioCalculator = require('../../../../src/application/services/decision/calculators/scenarioCalculator');

describe('ScenarioCalculator', () => {
  let calculator;

  const mockBusinessData = {
    currentPrice: 1000,
    currentVolume: 1000,
    currentMargin: 0.3,
    currentCost: 700,
    currentRevenue: 10_000_000,
    annualVolume: 10_000,
    currentExpense: 100_000,
    currentNetMargin: 0.1,
    investment: 500_000,
  };

  beforeEach(() => {
    calculator = new ScenarioCalculator();
  });

  describe('runScenario', () => {
    it('should run a scenario and return results', () => {
      const result = calculator.runScenario({
        name: 'Test Scenario',
        type: 'PRICE_CHANGE',
        currentState: {
          currentPrice: 1000,
          currentVolume: 1000,
          currentMargin: 0.3,
        },
        proposedChange: { priceChangePercent: 0.1 },
      });

      expect(result.name).toBe('Test Scenario');
      expect(result.type).toBe('PRICE_CHANGE');
      expect(result.impact).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('runPriceScenario', () => {
    it('should run a price scenario', () => {
      const result = calculator.runPriceScenario({
        name: '10% Price Increase',
        currentPrice: 1000,
        currentVolume: 1000,
        currentMargin: 0.3,
        priceChangePercent: 0.1,
      });

      expect(result.name).toBe('10% Price Increase');
      expect(result.type).toBe('PRICE_CHANGE');
      expect(result.impact.priceChange).toBeCloseTo(0.1); // FIX: float safety
    });

    it('should generate default name if not provided', () => {
      const result = calculator.runPriceScenario({
        currentPrice: 1000,
        currentVolume: 1000,
        currentMargin: 0.3,
        priceChangePercent: 0.1,
      });

      expect(result.name).toContain('Price Increase');
    });
  });

  describe('runCostSavingScenario', () => {
    it('should run a cost saving scenario', () => {
      const result = calculator.runCostSavingScenario({
        name: '10% Cost Reduction',
        currentCost: 500,
        annualVolume: 10_000,
        currentMargin: 0.3,
        currentRevenue: 10_000_000,
        savingPercent: 0.1,
      });

      expect(result.name).toBe('10% Cost Reduction');
      expect(result.type).toBe('COST_SAVING');
      expect(result.impact.savingPerUnit).toBe(50);
      expect(result.impact.annualSaving).toBe(500_000);
    });
  });

  describe('runRevenueGrowthScenario', () => {
    it('should run a revenue growth scenario', () => {
      const result = calculator.runRevenueGrowthScenario({
        name: '15% Revenue Growth',
        currentRevenue: 10_000_000,
        currentMargin: 0.3,
        targetGrowth: 0.15,
        investment: 500_000,
      });

      expect(result.name).toBe('15% Revenue Growth');
      expect(result.type).toBe('REVENUE_GROWTH');
      expect(result.impact.growthRate).toBeCloseTo(15); // FIX: float safety
      expect(result.impact.revenueIncrease).toBe(1_500_000);
    });
  });

  describe('runVolumeScenario', () => {
    it('should run a volume scenario', () => {
      const result = calculator.runVolumeScenario({
        name: '10% Volume Increase',
        currentVolume: 1000,
        currentPrice: 1000,
        currentCost: 700,
        currentMargin: 0.3,
        volumeChangePercent: 0.1,
      });

      expect(result.name).toBe('10% Volume Increase');
      expect(result.type).toBe('VOLUME_CHANGE');
      expect(result.impact.volumeChangePercent).toBeCloseTo(10); // FIX: float safety
      expect(result.impact.volumeChange).toBe(100);
    });
  });

  describe('runExpenseReductionScenario', () => {
    it('should run an expense reduction scenario', () => {
      const result = calculator.runExpenseReductionScenario({
        name: '10% Expense Reduction',
        currentExpense: 100_000,
        annualRevenue: 12_000_000,
        currentNetMargin: 0.1,
        reductionPercent: 0.1,
      });

      expect(result.name).toBe('10% Expense Reduction');
      expect(result.type).toBe('EXPENSE_REDUCTION');
      expect(result.impact.annualSaving).toBe(120_000); // FIX: 10_000 * 12 months
      expect(result.impact.reductionAmount).toBe(10_000);
    });
  });

  describe('runWorkingCapitalScenario', () => {
    it('should run a working capital scenario', () => {
      const result = calculator.runWorkingCapitalScenario({
        name: 'Working Capital Optimization',
        currentAR: 5_000_000,
        currentAP: 3_000_000,
        currentInventory: 2_000_000,
        dailySales: 100_000,
        dailyPurchases: 80_000,
        arReductionDays: 5,
        apExtensionDays: 10,
        inventoryReductionDays: 3,
      });

      expect(result.name).toBe('Working Capital Optimization');
      expect(result.type).toBe('WORKING_CAPITAL');
      expect(result.impact.totalCashFreed).toBe(1_600_000);
    });
  });

  describe('runScenarios', () => {
    it('should run multiple scenarios and compare', () => {
      const result = calculator.runScenarios({
        scenarios: [
          {
            name: 'Price Increase 10%',
            type: 'PRICE_CHANGE',
            currentState: {
              currentPrice: 1000,
              currentVolume: 1000,
              currentMargin: 0.3,
            },
            proposedChange: { priceChangePercent: 0.1 },
          },
          {
            name: 'Cost Reduction 10%',
            type: 'COST_SAVING',
            currentState: {
              currentCost: 700,
              annualVolume: 1000,
              currentMargin: 0.3,
              currentRevenue: 1_000_000,
            },
            proposedChange: { savingPercent: 0.1 },
          },
          {
            name: 'Volume Increase 10%',
            type: 'VOLUME_CHANGE',
            currentState: {
              currentVolume: 1000,
              currentPrice: 1000,
              currentCost: 700,
              currentMargin: 0.3,
            },
            proposedChange: { volumeChangePercent: 0.1 },
          },
        ],
        businessContext: {},
        comparisonMetric: 'profitImpact',
      });

      expect(result.scenarios).toHaveLength(3);
      expect(result.ranked).toHaveLength(3);
      expect(result.bestScenario).toBeDefined();
      expect(result.worstScenario).toBeDefined();
      expect(result.ranked[0].rank).toBe(1);
    });

    it('should propagate currency from businessContext', () => { // NEW TEST
      const result = calculator.runScenarios({
        scenarios: [],
        businessContext: { currency: 'USD' },
      });
      expect(result.currency).toBe('USD');
    });

    it('should sort scenarios with null metric last', () => { // NEW TEST
      const result = calculator.runScenarios({
        scenarios: [
          {
            name: 'Price Change',
            type: 'PRICE_CHANGE',
            currentState: { currentPrice: 1000, currentVolume: 1000, currentMargin: 0.3 },
            proposedChange: { priceChangePercent: 0.1 },
          },
          {
            name: 'Revenue Growth',
            type: 'REVENUE_GROWTH',
            currentState: { currentRevenue: 1000, currentMargin: 0.5 },
            proposedChange: { targetGrowth: 0.1, investment: 100 },
          },
        ],
        comparisonMetric: 'roi', // PRICE_CHANGE has roi=null
      });
      expect(result.ranked[0].name).toBe('Revenue Growth'); // Has ROI
      expect(result.ranked[1].name).toBe('Price Change'); // roi=null sorts last
    });
  });

  describe('runBusinessScenarios', () => {
    it('should run comprehensive business scenarios', () => {
      const result = calculator.runBusinessScenarios({
        businessData: mockBusinessData,
        scenarios: ['price', 'cost', 'revenue', 'volume'],
        businessContext: {},
      });

      expect(result.scenarios).toBeDefined();
      expect(result.allResults.length).toBeGreaterThan(0);
      expect(result.ranked).toBeDefined();
      expect(result.bestScenario).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.insights).toBeDefined();
    });

    it('should handle empty scenarios array', () => {
      const result = calculator.runBusinessScenarios({
        businessData: mockBusinessData,
        scenarios: [],
        businessContext: {},
      });

      expect(result.allResults).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });
  });

  describe('compareScenarios', () => {
    it('should compare two scenarios', () => {
      const scenario1 = calculator.runPriceScenario({
        name: 'Price Increase 10%',
        currentPrice: 1000,
        currentVolume: 1000,
        currentMargin: 0.3,
        priceChangePercent: 0.1,
      });

      const scenario2 = calculator.runPriceScenario({
        name: 'Price Increase 5%',
        currentPrice: 1000,
        currentVolume: 1000,
        currentMargin: 0.3,
        priceChangePercent: 0.05,
      });

      const comparison = calculator.compareScenarios(
        scenario1,
        scenario2
      );

      expect(comparison.scenario1.name).toBe('Price Increase 10%');
      expect(comparison.scenario2.name).toBe('Price Increase 5%');
      expect(comparison.differences).toBeDefined();
      expect(comparison.betterScenario).toBeDefined();
      expect(comparison.recommendation).toBeDefined();
    });

    it('should handle scenarios with equal impact', () => {
      const scenario1 = calculator.runPriceScenario({
        name: 'Scenario A',
        currentPrice: 1000,
        currentVolume: 1000,
        currentMargin: 0.3,
        priceChangePercent: 0.1,
      });

      const scenario2 = calculator.runPriceScenario({
        name: 'Scenario B',
        currentPrice: 1000,
        currentVolume: 1000,
        currentMargin: 0.3,
        priceChangePercent: 0.1,
      });

      const comparison = calculator.compareScenarios(
        scenario1,
        scenario2
      );
      expect(comparison.betterScenario).toBe('TIE');
      expect(comparison.recommendation).toContain(
        'similar profit impact'
      );
    });
  });

  describe('formatForDisplay', () => {
    it('should format scenario for display', () => {
      const scenario = calculator.runPriceScenario({
        name: '10% Price Increase',
        currentPrice: 1000,
        currentVolume: 1000,
        currentMargin: 0.3,
        priceChangePercent: 0.1,
      });

      const formatted = calculator.formatForDisplay(scenario);

      expect(formatted.name).toBe('10% Price Increase');
      expect(formatted.type).toBe('PRICE_CHANGE');
      expect(formatted.impact.summary).toBeDefined();
      expect(formatted.impact.revenue).toBeDefined();
      expect(formatted.impact.profit).toBeDefined();
      expect(formatted.metrics).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('safely handles null/empty inputs', () => {
      expect(() => calculator.runScenario()).not.toThrow();
      expect(() => calculator.runScenarios(null)).not.toThrow();
      expect(() =>
        calculator.runBusinessScenarios({})
      ).not.toThrow();
      expect(() =>
        calculator.compareScenarios(null, null)
      ).not.toThrow();
    });
  });
});