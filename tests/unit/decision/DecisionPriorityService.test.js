const DecisionPriorityService = require('../../../src/application/services/decision/DecisionPriorityService');

describe('DecisionPriorityService', () => {
  let service;

  beforeEach(() => {
    service = new DecisionPriorityService();
  });

  describe('calculate', () => {
    it('should return CRITICAL for high scores', () => {
      const result = service.calculate({
        impactScore: 95,
        urgencyScore: 90,
        confidence: 90,
        relevanceScore: 90
      });
      expect(result.priority).toBe('CRITICAL'); // FIXED
      expect(result.score).toBeGreaterThan(85);
    });

    it('should return HIGH for good scores', () => {
      const result = service.calculate({
        impactScore: 80,
        urgencyScore: 75,
        confidence: 80,
        relevanceScore: 80
      });
      expect(result.priority).toBe('HIGH');
    });

    it('should return MEDIUM for moderate scores', () => {
      const result = service.calculate({
        impactScore: 60,
        urgencyScore: 55,
        confidence: 60,
        relevanceScore: 60
      });
      expect(result.priority).toBe('MEDIUM');
    });

    it('should return LOW for low scores', () => {
      const result = service.calculate({
        impactScore: 30,
        urgencyScore: 30,
        confidence: 30,
        relevanceScore: 30
      });
      expect(result.priority).toBe('LOW');
    });

    it('should use default values for missing inputs', () => {
      const result = service.calculate({});
      expect(result.priority).toBeDefined();
    });

    it('should respect custom weights', () => {
      const result = service.calculate({
        impactScore: 50,
        urgencyScore: 50,
        confidence: 50,
        relevanceScore: 50,
        weights: { impact: 0.6, urgency: 0.2, confidence: 0.1, relevance: 0.1 }
      });
      expect(result.priority).toBeDefined();
    });

    it('should clamp scores to 0-100', () => {
      const result = service.calculate({
        impactScore: 150,
        urgencyScore: -10,
        confidence: 200,
        relevanceScore: 50
      });
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(result.priority);
    });
  });

  describe('scoreToPriority', () => {
    it('should map scores correctly', () => {
      expect(service.scoreToPriority(90)).toBe('CRITICAL');
      expect(service.scoreToPriority(85)).toBe('CRITICAL');
      expect(service.scoreToPriority(75)).toBe('HIGH');
      expect(service.scoreToPriority(70)).toBe('HIGH');
      expect(service.scoreToPriority(60)).toBe('MEDIUM');
      expect(service.scoreToPriority(50)).toBe('MEDIUM');
      expect(service.scoreToPriority(40)).toBe('LOW');
      expect(service.scoreToPriority(30)).toBe('LOW');
    });
  });

  describe('calculateUrgency', () => {
    it('should return high urgency for IMMEDIATE timeframe', () => {
      const result = service.calculateUrgency('IMMEDIATE', 'WARNING');
      expect(result).toBeGreaterThan(80);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should return high urgency for SHORT_TERM timeframe', () => {
      const result = service.calculateUrgency('SHORT_TERM', 'WARNING');
      expect(result).toBe(96); // 80 * 1.2
    });

    it('should return moderate urgency for MEDIUM_TERM timeframe', () => {
      const result = service.calculateUrgency('MEDIUM_TERM', 'INFO');
      expect(result).toBe(60);
    });

    it('should return low urgency for LONG_TERM timeframe', () => {
      const result = service.calculateUrgency('LONG_TERM', 'OPPORTUNITY');
      expect(result).toBe(24); // 30 * 0.8
    });

    it('should apply severity multiplier for CRITICAL and cap at 100', () => {
      const urgent = service.calculateUrgency('SHORT_TERM', 'CRITICAL');
      const moderate = service.calculateUrgency('SHORT_TERM', 'INFO');
      expect(urgent).toBe(100); // FIXED: was 112, now capped
      expect(moderate).toBe(80);
      expect(urgent).toBeGreaterThan(moderate);
    });

    it('should apply severity multiplier for WARNING', () => {
      const result = service.calculateUrgency('SHORT_TERM', 'WARNING');
      expect(result).toBe(96);
    });

    it('should apply severity multiplier for OPPORTUNITY', () => {
      const result = service.calculateUrgency('SHORT_TERM', 'OPPORTUNITY');
      expect(result).toBe(64);
    });

    it('should cap urgency at 100', () => {
      const result = service.calculateUrgency('IMMEDIATE', 'CRITICAL');
      expect(result).toBe(100);
    });
  });

  describe('calculateImpact', () => {
    it('should return 95 for impact > 50% of business', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 6000000 }); // FIXED
      expect(result).toBe(95);
    });

    it('should return 80 for impact > 20% of business', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 3000000 });
      expect(result).toBe(80);
    });

    it('should return 70 for impact > 10% of business', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 1500000 });
      expect(result).toBe(70);
    });

    it('should return 60 for impact > 5% of business', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 800000 });
      expect(result).toBe(60);
    });

    it('should return 50 for impact > 2% of business', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 300000 });
      expect(result).toBe(50);
    });

    it('should return 40 for impact > 1% of business', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 150000 });
      expect(result).toBe(40);
    });

    it('should return 30 for impact < 1% of business', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 50000 });
      expect(result).toBe(30);
    });

    it('should return 0 for impact below minimum threshold', () => {
      const result = service.calculateImpact(
        { estimatedFinancialImpact: 1000 },
        10000000,
        { minImpact: 5000 }
      );
      expect(result).toBe(0);
    });

    it('should use default business size of 10,000,000', () => {
      const result = service.calculateImpact({ estimatedFinancialImpact: 100000 });
      expect(result).toBe(40);
    });

    it('should return 0 for null or undefined financial impact', () => {
      const result1 = service.calculateImpact({ estimatedFinancialImpact: null });
      const result2 = service.calculateImpact({});
      expect(result1).toBe(0);
      expect(result2).toBe(0);
    });
  });

  describe('calculateRelevance', () => {
    it('should return 90 for BUSINESS related decisions', () => {
      const result = service.calculateRelevance('BUSINESS', {});
      expect(result).toBe(90);
    });

    it('should return 95 if focus matches related entity', () => {
      const result = service.calculateRelevance('PRODUCT', { focus: 'PRODUCT' });
      expect(result).toBe(95);
    });

    it('should return 95 if focus matches related entity (case insensitive)', () => {
      const result = service.calculateRelevance('PRODUCT', { focus: 'product' });
      expect(result).toBe(95);
    });

    it('should return 80 for default relevance', () => {
      const result = service.calculateRelevance('PRODUCT', {});
      expect(result).toBe(80);
    });

    it('should return 80 when no context provided', () => {
      const result = service.calculateRelevance('PRODUCT', null);
      expect(result).toBe(80);
    });
  });

  describe('getPriorityOrder', () => {
    it('should return priority order mapping', () => {
      const order = service.getPriorityOrder();
      expect(order.CRITICAL).toBe(0);
      expect(order.HIGH).toBe(1);
      expect(order.MEDIUM).toBe(2);
      expect(order.LOW).toBe(3);
    });
  });

  describe('sortByPriority', () => {
    it('should sort decisions by priority (highest first)', () => {
      const decisions = [
        { priority: 'LOW', id: 1 },
        { priority: 'CRITICAL', id: 2 },
        { priority: 'HIGH', id: 3 },
        { priority: 'MEDIUM', id: 4 }
      ];

      const sorted = service.sortByPriority(decisions);
      expect(sorted[0].priority).toBe('CRITICAL');
      expect(sorted[1].priority).toBe('HIGH');
      expect(sorted[2].priority).toBe('MEDIUM');
      expect(sorted[3].priority).toBe('LOW');
    });

    it('should not mutate original array', () => {
      const decisions = [
        { priority: 'MEDIUM', id: 1 },
        { priority: 'LOW', id: 2 },
        { priority: 'HIGH', id: 3 }
      ];

      const sorted = service.sortByPriority(decisions);
      expect(sorted).not.toBe(decisions);
      expect(decisions[0].priority).toBe('MEDIUM');
    });
  });

  describe('getPriorityLabel', () => {
    it('should return labels with emojis', () => {
      expect(service.getPriorityLabel('CRITICAL')).toBe('🔴 Critical');
      expect(service.getPriorityLabel('HIGH')).toBe('🟠 High');
      expect(service.getPriorityLabel('MEDIUM')).toBe('🟡 Medium');
      expect(service.getPriorityLabel('LOW')).toBe('🟢 Low');
    });

    it('should return unknown priority as-is', () => {
      expect(service.getPriorityLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getPriorityEmoji', () => {
    it('should return emojis for each priority', () => {
      expect(service.getPriorityEmoji('CRITICAL')).toBe('🔴');
      expect(service.getPriorityEmoji('HIGH')).toBe('🟠');
      expect(service.getPriorityEmoji('MEDIUM')).toBe('🟡');
      expect(service.getPriorityEmoji('LOW')).toBe('🟢');
    });

    it('should return white circle for unknown priority', () => {
      expect(service.getPriorityEmoji('UNKNOWN')).toBe('⚪');
    });
  });

  describe('getExpiryDays', () => {
    it('should return correct days for each priority', () => {
      expect(service.getExpiryDays('CRITICAL')).toBe(3);
      expect(service.getExpiryDays('HIGH')).toBe(7);
      expect(service.getExpiryDays('MEDIUM')).toBe(14);
      expect(service.getExpiryDays('LOW')).toBe(30);
    });

    it('should return 14 days for unknown priority', () => {
      expect(service.getExpiryDays('UNKNOWN')).toBe(14);
    });
  });

  describe('clamp', () => {
    it('should clamp values between min and max', () => {
      expect(service.clamp(150, 0, 100)).toBe(100);
      expect(service.clamp(-10, 0, 100)).toBe(0);
      expect(service.clamp(50, 0, 100)).toBe(50);
    });
  });
});