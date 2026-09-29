'use strict';

const DecisionScoringService = require('../../../src/application/services/decision/DecisionScoringService');
const DecisionConfidenceService = require('../../../src/application/services/decision/DecisionConfidenceService');
const DecisionPriorityService = require('../../../src/application/services/decision/DecisionPriorityService');

describe('DecisionScoringService', () => {
  let service;

  beforeEach(() => {
    service = new DecisionScoringService();
  });

  describe('constructor', () => {
    it('should create with default services', () => {
      const svc = new DecisionScoringService();
      expect(svc.confidenceService).toBeInstanceOf(DecisionConfidenceService);
      expect(svc.priorityService).toBeInstanceOf(DecisionPriorityService);
    });

    it('should accept custom services', () => {
      const mockConfidence = { calculate: jest.fn() };
      const mockPriority = { calculate: jest.fn() };
      const svc = new DecisionScoringService({
        confidenceService: mockConfidence,
        priorityService: mockPriority,
      });
      expect(svc.confidenceService).toBe(mockConfidence);
      expect(svc.priorityService).toBe(mockPriority);
    });
  });

  describe('score', () => {
    it('should return complete scoring result', () => {
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          timeframe: 'SHORT_TERM',
          severity: 'WARNING',
          impact: { financialImpact: 1000000 },
          relatedEntity: 'BUSINESS',
        },
        { businessSize: 10000000 }
      );

      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('impact');
      expect(result).toHaveProperty('relevance');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('shouldGenerate');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('quality');
    });

    it('should handle missing data with defaults', () => {
      const result = service.score({});

      expect(result.confidence.score).toBe(70);
      expect(result.urgency.score).toBe(60);
      expect(result.impact.score).toBe(0);
      expect(result.relevance.score).toBe(80);
      // priority is a full payload object
      expect(result.priority.priority).toBe('LOW');
      expect(result.overall.confidence).toBe(70);
      expect(result.overall.priority).toBe('LOW');
    });

    it('should include confidence breakdown', () => {
      const result = service.score({
        evidence: { transactionCount: 20, lastUpdated: new Date() },
      });

      expect(result.confidence).toHaveProperty('score');
      expect(result.confidence).toHaveProperty('level');
      expect(result.confidence).toHaveProperty('emoji');
      expect(result.confidence).toHaveProperty('message');
      expect(result.confidence).toHaveProperty('isSufficient');
      expect(result.confidence).toHaveProperty('breakdown');
    });

    it('should include urgency breakdown', () => {
      const result = service.score({
        timeframe: 'IMMEDIATE',
        severity: 'CRITICAL',
      });

      expect(result.urgency).toHaveProperty('score');
      expect(result.urgency).toHaveProperty('timeframe');
      // 95 * 1.4 = 133 → clamped to 100
      expect(result.urgency.score).toBe(100);
    });

    it('should include impact breakdown', () => {
      // 5_000_000 / 10_000_000 = 0.5 → band score 95
      const result = service.score(
        {
          impact: {
            financialImpact: 5000000,
            description: 'Significant impact',
          },
        },
        { businessSize: 10000000 }
      );

      expect(result.impact).toHaveProperty('score');
      expect(result.impact).toHaveProperty('financialImpact');
      expect(result.impact).toHaveProperty('description');
      expect(result.impact.score).toBe(95);
      expect(result.impact.financialImpact).toBe(5000000);
      expect(result.impact.description).toBe('Significant impact');
    });

    it('should include relevance breakdown', () => {
      const result = service.score(
        { relatedEntity: 'PRODUCT' },
        { focus: 'PRODUCT' }
      );

      expect(result.relevance).toHaveProperty('score');
      expect(result.relevance).toHaveProperty('relatedEntity');
      expect(result.relevance.score).toBe(95);
    });

    it('should include priority breakdown', () => {
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          impact: { financialImpact: 1000000 },
          timeframe: 'SHORT_TERM',
          severity: 'WARNING',
        },
        { businessSize: 10000000 }
      );

      expect(result.priority).toHaveProperty('score');
      expect(result.priority).toHaveProperty('impact');
      expect(result.priority).toHaveProperty('urgency');
      expect(result.priority).toHaveProperty('confidence');
      expect(result.priority).toHaveProperty('relevance');
      expect(result.priority).toHaveProperty('priority');
      expect(result.priority).toHaveProperty('label');
      expect(result.priority).toHaveProperty('emoji');
      expect(result.priority).toHaveProperty('expiryDays');
      expect(result.priority).toHaveProperty('breakdown');
    });

    it('should include overall score', () => {
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          impact: { financialImpact: 1000000 },
          timeframe: 'SHORT_TERM',
        },
        { businessSize: 10000000 }
      );

      expect(result.overall).toHaveProperty('score');
      expect(result.overall).toHaveProperty('confidence');
      expect(result.overall).toHaveProperty('priority');
      expect(result.overall).toHaveProperty('level');
    });
  });

  describe('shouldGenerate logic', () => {
    it('should allow generation for high quality decisions', () => {
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          impact: { financialImpact: 1000000 },
          timeframe: 'SHORT_TERM',
        },
        { businessSize: 10000000 }
      );

      expect(result.shouldGenerate).toBe(true);
    });

    it('should block generation for low confidence', () => {
      const result = service.score(
        {
          evidence: {
            transactionCount: 1,
            lastUpdated: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
            historicalVariance: 0.9,
          },
          impact: { financialImpact: 1000000 },
          timeframe: 'SHORT_TERM',
        },
        { businessSize: 10000000 }
      );

      expect(result.shouldGenerate).toBe(false);
    });

    it('should block generation for low impact', () => {
      // impactScore becomes 0 → blocked by minImpactThreshold (default 10)
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          impact: { financialImpact: 0 },
          timeframe: 'SHORT_TERM',
        },
        { businessSize: 10000000 }
      );

      expect(result.shouldGenerate).toBe(false);
    });

    it('should block generation for low priority', () => {
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          impact: { financialImpact: 1000 },
          timeframe: 'LONG_TERM',
        },
        { businessSize: 10000000 },
        { minPriority: 'HIGH' }
      );

      expect(result.shouldGenerate).toBe(false);
    });

    it('should respect confidence threshold option', () => {
      const result = service.score(
        {
          evidence: {
            transactionCount: 5,
            lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          },
          impact: { financialImpact: 1000000 },
          timeframe: 'SHORT_TERM',
        },
        { businessSize: 10000000 },
        { confidenceThreshold: 80 }
      );

      expect(result.shouldGenerate).toBe(false);
    });

    it('should respect minImpactThreshold option', () => {
      // impactScore for 50k / 10M ≈ 30; threshold 30 → allowed
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          impact: { financialImpact: 50000 },
          timeframe: 'SHORT_TERM',
        },
        { businessSize: 10000000 },
        { minImpactThreshold: 30 }
      );

      expect(result.shouldGenerate).toBe(true);
    });
  });

  describe('calculateCompositeScore', () => {
    it('should calculate weighted score correctly', () => {
      // weights: impact 0.30, urgency 0.30, confidence 0.25, relevance 0.15
      // 90*0.30 + 80*0.30 + 70*0.25 + 60*0.15 = 27+24+17.5+9 = 77.5 → 78
      const score = service.calculateCompositeScore(90, 80, 70, 60);
      expect(score).toBe(78);
    });

    it('should handle edge cases', () => {
      expect(service.calculateCompositeScore(0, 0, 0, 0)).toBe(0);
      expect(service.calculateCompositeScore(100, 100, 100, 100)).toBe(100);
    });

    it('should round to nearest integer', () => {
      const score = service.calculateCompositeScore(33, 33, 33, 33);
      expect(score).toBe(33);
    });
  });

  describe('getQualitySummary', () => {
    it('should return GOOD quality for high quality decision', () => {
      // Default baseConfidence is 70 → FAIR. Raise it so we can actually reach GOOD.
      const highConfService = new DecisionScoringService({
        confidence: { baseConfidence: 85 },
      });

      const result = highConfService.score(
        {
          evidence: {
            transactionCount: 30,
            lastUpdated: new Date(),
            dataSource: 'verified',
            sampleSize: 40,
            trendConsistency: 0.9,
          },
          impact: { financialImpact: 2000000 }, // 0.2 → impact score 80
          timeframe: 'SHORT_TERM',
          severity: 'WARNING',
        },
        { businessSize: 10000000 }
      );

      const summary = highConfService.getQualitySummary(result);
      expect(summary.quality).toBe('GOOD');
      expect(summary.recommendations).toHaveLength(0);
      expect(summary.score).toBeDefined();
      expect(summary.confidence).toBeDefined();
      expect(summary.priority).toBeDefined();
    });

    it('should return FAIR quality for moderate confidence', () => {
      const result = service.score(
        {
          evidence: {
            transactionCount: 8,
            lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
          impact: { financialImpact: 1000000 },
          timeframe: 'MEDIUM_TERM',
        },
        { businessSize: 10000000 }
      );

      const summary = service.getQualitySummary(result);
      expect(summary.quality).toBe('FAIR');
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it('should return POOR quality for low confidence', () => {
      const result = service.score(
        {
          evidence: {
            transactionCount: 2,
            lastUpdated: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
          },
          impact: { financialImpact: 50000 },
          timeframe: 'LONG_TERM',
        },
        { businessSize: 10000000 }
      );

      const summary = service.getQualitySummary(result);
      expect(summary.quality).toBe('POOR');
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it('should include recommendations for improvements', () => {
      const result = service.score(
        {
          evidence: {
            transactionCount: 3,
            lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          },
          impact: { financialImpact: 100000 },
          timeframe: 'MEDIUM_TERM',
        },
        { businessSize: 10000000 }
      );

      const summary = service.getQualitySummary(result);
      expect(summary.recommendations).toContain('Improve data quality and recency');
    });

    it('should include impact recommendations', () => {
      // impactScore = 0 triggers the recommendation
      const result = service.score(
        {
          evidence: { transactionCount: 20, lastUpdated: new Date() },
          impact: { financialImpact: 0 },
          timeframe: 'SHORT_TERM',
        },
        { businessSize: 10000000 }
      );

      const summary = service.getQualitySummary(result);
      expect(summary.recommendations).toContain('Decision impact may be limited');
    });
  });
});