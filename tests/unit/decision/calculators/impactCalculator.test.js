'use strict';

const ImpactCalculator = require('../../../../src/application/services/decision/calculators/impactCalculator');

// Inlined - no external contracts dependency
const IMPACT_TYPE = Object.freeze({
  PRICE_CHANGE: 'PRICE_CHANGE',
  COST_SAVING: 'COST_SAVING',
  REVENUE_GROWTH: 'REVENUE_GROWTH',
  VOLUME_CHANGE: 'VOLUME_CHANGE',
  EXPENSE_REDUCTION: 'EXPENSE_REDUCTION',
  WORKING_CAPITAL: 'WORKING_CAPITAL',
});

describe('ImpactCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new ImpactCalculator();
  });

  describe('calculate', () => {
    describe('PRICE_CHANGE', () => {
      it('should calculate price increase impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.PRICE_CHANGE,
          currentState: { currentPrice: 1000, currentVolume: 1000, currentMargin: 0.3, priceElasticity: 0.5 },
          proposedChange: { priceChangePercent: 0.1 },
        });
        expect(result.type).toBe(IMPACT_TYPE.PRICE_CHANGE);
        expect(result.priceChange).toBe(0.1);
        expect(result.newPrice).toBe(1100);
        expect(result.revenueImpact).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.recommendation).toContain('Price increase');
      });

      it('should calculate price decrease impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.PRICE_CHANGE,
          currentState: { currentPrice: 1000, currentVolume: 1000, currentMargin: 0.3, priceElasticity: 0.5 },
          proposedChange: { priceChangePercent: -0.1 },
        });
        expect(result.type).toBe(IMPACT_TYPE.PRICE_CHANGE);
        expect(result.priceChange).toBe(-0.1);
        expect(result.volumeChange).toBeGreaterThan(0);
      });

      it('should lower confidence when elasticity is missing', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.PRICE_CHANGE,
          currentState: { currentPrice: 1000, currentVolume: 1000, currentMargin: 0.3 },
          proposedChange: { priceChangePercent: 0.1 },
        });
        expect(result.confidence).toBeLessThan(80);
      });
    });

    describe('COST_SAVING', () => {
      it('should calculate cost saving impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.COST_SAVING,
          currentState: { currentCost: 500, annualVolume: 10_000, currentMargin: 0.3, currentRevenue: 10_000_000 },
          proposedChange: { savingPercent: 0.1 },
        });
        expect(result.type).toBe(IMPACT_TYPE.COST_SAVING);
        expect(result.savingPerUnit).toBe(50);
        expect(result.annualSaving).toBe(500_000);
        expect(result.recommendation).toContain('Annual savings');
      });

      it('should calculate with specific saving amount', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.COST_SAVING,
          currentState: { currentCost: 500, annualVolume: 10_000, currentMargin: 0.3, currentRevenue: 10_000_000 },
          proposedChange: { savingAmount: 75 },
        });
        expect(result.savingPerUnit).toBe(75);
        expect(result.annualSaving).toBe(750_000);
      });
    });

    describe('REVENUE_GROWTH', () => {
      it('should calculate revenue growth impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.REVENUE_GROWTH,
          currentState: { currentRevenue: 10_000_000, currentMargin: 0.3, growthRate: 0.1 },
          proposedChange: { targetGrowth: 0.15, investment: 500_000 },
        });
        expect(result.type).toBe(IMPACT_TYPE.REVENUE_GROWTH);
        expect(result.growthRate).toBe(15);
        expect(result.revenueIncrease).toBe(1_500_000);
        expect(result.roi).toBeDefined();
        expect(result.recommendation).toContain('Revenue growth');
      });

      it('should handle missing investment data', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.REVENUE_GROWTH,
          currentState: { currentRevenue: 10_000_000, currentMargin: 0.3 },
          proposedChange: { targetGrowth: 0.1 },
        });
        expect(result.roi).toBeNull();
        expect(result.confidence).toBeLessThan(80);
      });
    });

    describe('VOLUME_CHANGE', () => {
      it('should calculate volume increase impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.VOLUME_CHANGE,
          currentState: { currentVolume: 1000, currentPrice: 1000, currentCost: 700, currentMargin: 0.3 },
          proposedChange: { volumeChangePercent: 0.1 },
        });
        expect(result.type).toBe(IMPACT_TYPE.VOLUME_CHANGE);
        expect(result.volumeChangePercent).toBe(10);
        expect(result.volumeChange).toBe(100);
        expect(result.revenueImpact).toBe(100_000);
        expect(result.recommendation).toContain('Volume increase');
      });

      it('should calculate volume decrease impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.VOLUME_CHANGE,
          currentState: { currentVolume: 1000, currentPrice: 1000, currentCost: 700, currentMargin: 0.3 },
          proposedChange: { volumeChangePercent: -0.1 },
        });
        expect(result.volumeChangePercent).toBe(-10);
        expect(result.revenueImpact).toBe(-100_000);
        expect(result.recommendation).toContain('Volume decline');
      });
    });

    describe('EXPENSE_REDUCTION', () => {
      it('should calculate expense reduction impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.EXPENSE_REDUCTION,
          currentState: { currentExpense: 100_000, annualRevenue: 12_000_000, currentNetMargin: 0.1 },
          proposedChange: { reductionPercent: 0.1 },
        });
        expect(result.type).toBe(IMPACT_TYPE.EXPENSE_REDUCTION);
        expect(result.reductionPercent).toBe(10);
        expect(result.annualSaving).toBe(120_000);
        expect(result.recommendation).toContain('Annual expense reduction');
      });

      it('should calculate with specific reduction amount', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.EXPENSE_REDUCTION,
          currentState: { currentExpense: 100_000, annualRevenue: 12_000_000, currentNetMargin: 0.1 },
          proposedChange: { reductionAmount: 15_000 },
        });
        expect(result.reductionAmount).toBe(15_000);
        expect(result.annualSaving).toBe(180_000);
      });
    });

    describe('WORKING_CAPITAL', () => {
      it('should calculate working capital impact', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.WORKING_CAPITAL,
          currentState: { currentAR: 5_000_000, currentAP: 3_000_000, currentInventory: 2_000_000, dailySales: 100_000, dailyPurchases: 80_000 },
          proposedChange: { arReductionDays: 5, apExtensionDays: 10, inventoryReductionDays: 3 },
        });
        expect(result.type).toBe(IMPACT_TYPE.WORKING_CAPITAL);
        expect(result.arReduction).toBe(500_000);
        expect(result.apExtension).toBe(800_000);
        expect(result.inventoryReduction).toBe(300_000);
        expect(result.totalCashFreed).toBe(1_600_000);
        expect(result.recommendation).toContain('Total cash that can be freed');
      });

      it('should handle partial working capital changes', () => {
        const result = calculator.calculate({
          type: IMPACT_TYPE.WORKING_CAPITAL,
          currentState: { currentAR: 5_000_000, currentAP: 3_000_000, currentInventory: 2_000_000, dailySales: 100_000, dailyPurchases: 80_000 },
          proposedChange: { arReductionDays: 5 },
        });
        expect(result.arReduction).toBe(500_000);
        expect(result.apExtension).toBe(0);
        expect(result.inventoryReduction).toBe(0);
        expect(result.totalCashFreed).toBe(500_000);
      });
    });

    describe('GENERIC', () => {
      it('should handle unknown impact type', () => {
        const result = calculator.calculate({ type: 'UNKNOWN', currentState: {}, proposedChange: {} });
        expect(result.type).toBe('GENERIC');
        expect(result.requiresReview).toBe(true);
        expect(result.confidence).toBe(50);
      });
    });
  });

  describe('calculateConfidence', () => {
    it('should return higher confidence with more data', () => {
      const low = calculator.calculateConfidence({ hasPriceData: true });
      const high = calculator.calculateConfidence({ hasPriceData: true, hasVolumeData: true, hasMarginData: true, hasCostData: true, elasticityKnown: true });
      expect(low).toBeLessThanOrEqual(high);
    });

    it('should clamp confidence between 0 and 100', () => {
      const result = calculator.calculateConfidence({
        hasPriceData: true, hasVolumeData: true, hasMarginData: true, hasCostData: true, hasRevenueData: true,
        hasExpenseData: true, hasARDailyData: true, hasAPDailyData: true, hasInventoryData: true, elasticityKnown: true,
        savingIsSpecific: true, growthIsSpecific: true, investmentKnown: true, reductionIsSpecific: true, changesSpecific: true, volumeChangeSpecific: true,
      });
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('formatForDisplay', () => {
    it('should format impact for display', () => {
      const impact = calculator.calculate({
        type: IMPACT_TYPE.PRICE_CHANGE,
        currentState: { currentPrice: 1000, currentVolume: 1000, currentMargin: 0.3 },
        proposedChange: { priceChangePercent: 0.1 },
      });
      const formatted = calculator.formatForDisplay(impact);
      expect(formatted.type).toBe(IMPACT_TYPE.PRICE_CHANGE);
      expect(formatted.summary).toBeDefined();
      expect(formatted.metrics).toHaveProperty('current');
      expect(formatted.metrics).toHaveProperty('projected');
      expect(formatted.metrics).toHaveProperty('changes');
      expect(formatted.confidence).toBeDefined();
    });
  });

  describe('Edge cases – invalid inputs', () => {
    it('handles null/undefined params without throwing', () => {
      expect(() => calculator.calculate()).not.toThrow();
      expect(() => calculator.calculate(null)).not.toThrow();
      expect(calculator.calculate({}).type).toBe('GENERIC');
    });

    it('handles non-numeric inputs safely', () => {
      const result = calculator.calculate({
        type: IMPACT_TYPE.PRICE_CHANGE,
        currentState: { currentPrice: 'bad', currentVolume: null, currentMargin: undefined },
        proposedChange: { priceChangePercent: 'x' },
      });
      expect(result.type).toBe(IMPACT_TYPE.PRICE_CHANGE);
      expect(result.newPrice).toBe(0);
    });
  });
});