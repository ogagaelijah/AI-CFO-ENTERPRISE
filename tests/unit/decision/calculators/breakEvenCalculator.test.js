'use strict';

const BreakEvenCalculator = require('../../../../src/application/services/decision/calculators/breakEvenCalculator');

describe('BreakEvenCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new BreakEvenCalculator();
  });

  // ─── calculateBreakEven ─────────────────────────────────────

  describe('calculateBreakEven', () => {
    it('should calculate break-even point correctly', () => {
      const result = calculator.calculateBreakEven({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 2500,
      });

      expect(result.type).toBe('BREAK_EVEN');
      expect(result.outputs.breakEvenUnits).toBe(2000);
      expect(result.outputs.breakEvenRevenue).toBe(2_000_000);
      expect(result.outputs.contributionMargin).toBe(500);
      expect(result.outputs.contributionMarginRatio).toBe(0.5);
      expect(result.outputs.currentProfit).toBe(250_000);
      expect(result.outputs.marginOfSafety).toBe(20);
      expect(result.outputs.isProfitable).toBe(true);
      expect(result.relatedEntityId).toBeUndefined(); // calculator, not a rule
    });

    it('should detect loss-making situation', () => {
      const result = calculator.calculateBreakEven({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 1500,
      });

      expect(result.outputs.currentProfit).toBe(-250_000);
      expect(result.outputs.isProfitable).toBe(false);
      expect(result.outputs.profitGap).toBe(250_000);
      expect(result.recommendation).toContain('losing money');
    });

    it('should handle zero contribution margin', () => {
      const result = calculator.calculateBreakEven({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 1000,
        sellingPricePerUnit: 1000,
        currentVolume: 1000,
      });

      expect(result.outputs.breakEvenUnits).toBe(Infinity);
      expect(result.recommendation).toContain('Cannot reach break-even');
    });

    it('should handle missing current volume', () => {
      const result = calculator.calculateBreakEven({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
      });

      expect(result.outputs.breakEvenUnits).toBe(2000);
      expect(result.outputs.currentVolume).toBe(0);
      expect(result.outputs.currentProfit).toBe(-1_000_000);
      expect(result.outputs.marginOfSafety).toBe(0);
    });

    it('should provide margin of safety recommendations', () => {
      const lowSafety = calculator.calculateBreakEven({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 2100,
      });
      expect(lowSafety.recommendation).toContain('margin of safety');

      const highSafety = calculator.calculateBreakEven({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 5000,
      });
      expect(highSafety.recommendation).toContain(
        'Strong margin of safety'
      );
    });
  });

  // ─── calculateTargetProfit ──────────────────────────────────

  describe('calculateTargetProfit', () => {
    it('should calculate units needed for target profit', () => {
      const result = calculator.calculateTargetProfit({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        targetProfit: 500_000,
      });

      expect(result.feasible).toBe(true);
      expect(result.outputs.unitsNeeded).toBe(3000);
      expect(result.outputs.revenueNeeded).toBe(3_000_000);
      expect(result.message).toContain('Need to sell 3,000 units');
    });

    it('should handle zero contribution margin', () => {
      const result = calculator.calculateTargetProfit({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 1000,
        sellingPricePerUnit: 1000,
        targetProfit: 500_000,
      });

      expect(result.feasible).toBe(false);
      expect(result.unitsNeeded).toBe(Infinity);
      expect(result.message).toContain('Cannot achieve target profit');
    });
  });

  // ─── calculateContributionMargin ────────────────────────────

  describe('calculateContributionMargin', () => {
    it('should calculate contribution margin analysis', () => {
      const result = calculator.calculateContributionMargin({
        sellingPricePerUnit: 1000,
        variableCostPerUnit: 500,
        fixedCosts: 1_000_000,
        currentVolume: 3000,
      });

      expect(result.outputs.contributionMargin).toBe(500);
      expect(result.outputs.contributionMarginRatio).toBe(50);
      expect(result.outputs.totalContribution).toBe(1_500_000);
      expect(result.outputs.currentProfit).toBe(500_000);
      expect(result.outputs.breakEvenUnits).toBe(2000);
    });

    it('should handle missing current volume', () => {
      const result = calculator.calculateContributionMargin({
        sellingPricePerUnit: 1000,
        variableCostPerUnit: 500,
        fixedCosts: 1_000_000,
      });

      expect(result.outputs.currentVolume).toBe(0);
      expect(result.outputs.totalContribution).toBe(0);
      expect(result.outputs.currentProfit).toBe(-1_000_000);
    });

    it('should provide contribution margin recommendations', () => {
      const lowMargin = calculator.calculateContributionMargin({
        sellingPricePerUnit: 1000,
        variableCostPerUnit: 800,
        fixedCosts: 1_000_000,
        currentVolume: 3000,
      });
      expect(lowMargin.recommendation).toContain('is low');

      const negativeProfit = calculator.calculateContributionMargin({
        sellingPricePerUnit: 1000,
        variableCostPerUnit: 500,
        fixedCosts: 2_000_000,
        currentVolume: 3000,
      });
      expect(negativeProfit.recommendation).toContain(
        'below fixed costs'
      );
    });
  });

  // ─── calculateBreakEvenScenarios ────────────────────────────

  describe('calculateBreakEvenScenarios', () => {
    it('should calculate multiple break-even scenarios', () => {
      const result = calculator.calculateBreakEvenScenarios({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 3000,
        priceScenarios: [0.1, -0.1],
        volumeScenarios: [0.1, -0.1],
      });

      expect(result.scenarios).toHaveLength(5); // Base + 2 price + 2 volume
      expect(result.bestScenario).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should handle no price scenarios', () => {
      const result = calculator.calculateBreakEvenScenarios({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 3000,
        priceScenarios: [],
        volumeScenarios: [0.1],
      });

      expect(result.scenarios).toHaveLength(2); // Base + 1 volume
      expect(result.bestScenario).toBeDefined();
    });

    it('should handle negative contribution margin scenarios', () => {
      const result = calculator.calculateBreakEvenScenarios({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 3000,
        priceScenarios: [-0.6],
        volumeScenarios: [],
      });

      expect(result.scenarios[1].breakEvenUnits).toBe(Infinity);
    });
  });

  // ─── formatForDisplay ───────────────────────────────────────

  describe('formatForDisplay', () => {
    it('should format break-even result for display', () => {
      const result = calculator.calculateBreakEven({
        fixedCosts: 1_000_000,
        variableCostPerUnit: 500,
        sellingPricePerUnit: 1000,
        currentVolume: 2500,
      });

      const formatted = calculator.formatForDisplay(result);

      expect(formatted.type).toBe('BREAK_EVEN');
      expect(formatted.summary).toBeDefined();
      expect(formatted.metrics.breakEvenUnits).toBe(2000);
      expect(formatted.metrics.breakEvenRevenue).toBe(2_000_000);
      expect(formatted.metrics.contributionMargin).toBe(500);
      expect(formatted.metrics.contributionMarginRatio).toBe(0.5);
      expect(formatted.metrics.marginOfSafety).toBe(20);
      expect(formatted.metrics.isProfitable).toBe(true);
      expect(formatted.requiresReview).toBe(false);
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────

  describe('Edge cases – invalid / malformed inputs', () => {
    it('safely handles null/undefined/empty for all methods', () => {
      expect(() => calculator.calculateBreakEven()).not.toThrow();
      expect(() => calculator.calculateBreakEven(null)).not.toThrow();
      expect(() => calculator.calculateTargetProfit({})).not.toThrow();
      expect(() =>
        calculator.calculateContributionMargin(undefined)
      ).not.toThrow();
      expect(() =>
        calculator.calculateBreakEvenScenarios(null)
      ).not.toThrow();
    });

    it('tolerates non-object inputs without throwing', () => {
      const bad = [42, 'string', true, [], () => {}];
      for (const input of bad) {
        expect(() => calculator.calculateBreakEven(input)).not.toThrow();
        expect(
          calculator.calculateBreakEven(input).outputs.breakEvenUnits
        ).toBeDefined();
      }
    });
  });
});