const DecisionConfidenceService = require('../../../src/application/services/decision/DecisionConfidenceService');

describe('DecisionConfidenceService', () => {
  let service;

  beforeEach(() => {
    service = new DecisionConfidenceService();
  });

  describe('calculate', () => {
    it('should return base confidence when no data provided', () => {
      const result = service.calculate({});
      expect(result.score).toBe(70);
      expect(result.isSufficient).toBe(true);
    });

    it('should penalize stale data', () => {
      const result = service.calculate({
        lastUpdated: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
      });
      expect(result.score).toBe(50); // 70 - 20
      expect(result.penalties.some(p => p.code === 'data_stale')).toBe(true);
    });

    it('should penalize aging data moderately', () => {
      const result = service.calculate({
        lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      });
      expect(result.score).toBe(60); // 70 - 10
    });

    it('should penalize insufficient transactions', () => {
      const result = service.calculate({ transactionCount: 2 });
      expect(result.score).toBe(55); // 70 - 15
    });

    it('should penalize high variance', () => {
      const result = service.calculate({ historicalVariance: 0.6 });
      expect(result.score).toBe(60); // 70 - 10
    });

    it('should penalize missing required fields', () => {
      const result = service.calculate(
        { someField: 'value' },
        { requiredFields: ['field1', 'field2', 'field3'] }
      );
      expect(result.score).toBeLessThan(70);
      expect(result.breakdown.completeness).toBe('0/3');
    });

    it('should penalize forecast data', () => {
      const result = service.calculate(
        { isForecast: true },
        { isForecast: true }
      );
      expect(result.score).toBe(60); // 70 - 10
      expect(result.breakdown.dataType).toBe('forecast');
    });

    it('should respect base confidence option', () => {
      const svc = new DecisionConfidenceService({ baseConfidence: 90 });
      const result = svc.calculate({});
      expect(result.score).toBe(90);
    });

    it('should clamp result to 0-100', () => {
      const result = service.calculate(
        {
          lastUpdated: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          transactionCount: 1,
          historicalVariance: 0.9
        },
        { requiredFields: ['field1', 'field2'] }
      );
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle dataSource reliability', () => {
      const verified = service.calculate({ dataSource: 'verified' });
      const userInput = service.calculate({ dataSource: 'user_input' });
      expect(verified.score).toBeGreaterThan(userInput.score);
    });

    it('should handle sample size', () => {
      const small = service.calculate({ sampleSize: 3 });
      const large = service.calculate({ sampleSize: 20 });
      expect(small.score).toBeLessThan(large.score);
    });

    it('should handle trend consistency', () => {
      const consistent = service.calculate({ trendConsistency: 0.9 });
      const inconsistent = service.calculate({ trendConsistency: 0.5 });
      expect(consistent.score).toBeGreaterThan(inconsistent.score);
    });
  });

  describe('getLevel', () => {
    it('should return VERY_HIGH for score >= 90', () => {
      expect(service.getLevel(95)).toBe('VERY_HIGH');
      expect(service.getLevel(90)).toBe('VERY_HIGH');
    });

    it('should return HIGH for score 75-89', () => {
      expect(service.getLevel(85)).toBe('HIGH');
      expect(service.getLevel(75)).toBe('HIGH');
    });

    it('should return MODERATE for score 60-74', () => {
      expect(service.getLevel(70)).toBe('MODERATE');
      expect(service.getLevel(60)).toBe('MODERATE');
    });

    it('should return LOW for score 40-59', () => {
      expect(service.getLevel(50)).toBe('LOW');
      expect(service.getLevel(40)).toBe('LOW');
    });

    it('should return VERY_LOW for score < 40', () => {
      expect(service.getLevel(30)).toBe('VERY_LOW');
      expect(service.getLevel(10)).toBe('VERY_LOW');
    });
  });

  describe('isSufficient', () => {
    it('should return true for score >= threshold', () => {
      expect(service.isSufficient(75, 60)).toBe(true);
      expect(service.isSufficient(60, 60)).toBe(true);
    });

    it('should return false for score < threshold', () => {
      expect(service.isSufficient(50, 60)).toBe(false);
      expect(service.isSufficient(59, 60)).toBe(false);
    });

    it('should use default threshold of 60', () => {
      expect(service.isSufficient(60)).toBe(true);
      expect(service.isSufficient(59)).toBe(false);
    });
  });

  describe('toDisplay', () => {
    it('should return display-friendly object', () => {
      const result = service.toDisplay({ transactionCount: 5 });
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('emoji');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('isSufficient');
      expect(result).toHaveProperty('penalties');
    });
  });
});