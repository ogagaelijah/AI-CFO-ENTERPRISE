'use strict';

const RiskTrendAnalyzer = require('../../../../src/application/services/risk/intelligence/RiskTrendAnalyzer');
const RiskPersistenceAnalyzer = require('../../../../src/application/services/risk/intelligence/RiskPersistenceAnalyzer');

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

describe('RiskTrendAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new RiskTrendAnalyzer({
      minSnapshots: 3,
      improvementThreshold: -5,
      worseningThreshold: 5,
      logger: mockLogger,
    });
    jest.clearAllMocks();
  });

  describe('analyze()', () => {
    test('should detect improving trend', () => {
      const history = [
        { score: 80, timestamp: '2026-08-01' },
        { score: 70, timestamp: '2026-08-08' },
        { score: 55, timestamp: '2026-08-15' },
        { score: 40, timestamp: '2026-08-22' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.direction).toBe('IMPROVING');
      expect(result.strength).toBe('STRONG');
      expect(result.currentScore).toBe(40);
      expect(result.totalChange).toBeLessThan(-40);
      expect(result.message).toContain('improving');
      expect(result.meta.calculator).toBe('RiskTrendAnalyzer');
      expect(Object.isFrozen(result)).toBe(true);
    });

    test('should detect worsening trend', () => {
      const history = [
        { score: 20, timestamp: '2026-08-01' },
        { score: 35, timestamp: '2026-08-08' },
        { score: 55, timestamp: '2026-08-15' },
        { score: 75, timestamp: '2026-08-22' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.direction).toBe('WORSENING');
      expect(result.strength).toBe('STRONG');
      expect(result.currentScore).toBe(75);
      expect(result.totalChange).toBeGreaterThan(200);
      expect(result.message).toContain('worsening');
    });

    test('should detect stable trend', () => {
      const history = [
        { score: 50, timestamp: '2026-08-01' },
        { score: 52, timestamp: '2026-08-08' },
        { score: 48, timestamp: '2026-08-15' },
        { score: 51, timestamp: '2026-08-22' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.direction).toBe('STABLE');
      expect(result.strength).toBe('WEAK');
      expect(result.message).toContain('stable');
    });

    test('should handle insufficient history', () => {
      const history = [
        { score: 50, timestamp: '2026-08-01' },
        { score: 55, timestamp: '2026-08-08' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_HISTORY');
      expect(result.direction).toBe('UNKNOWN');
      expect(result.meta.version).toBe('1.3.0');
    });

    test('should handle empty history', () => {
      const result = analyzer.analyze({
        history: [],
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_HISTORY');
    });

    test('should never throw on invalid input', () => {
      const result = analyzer.analyze({
        history: [{ score: Symbol('bad') }],
      });
      expect(result.available).toBe(false);
      expect(result.meta.error).toBe(true);
    });
  });

  describe('analyzeMultiple()', () => {
    test('should analyze multiple risks', () => {
      const risks = [
        {
          id: 'risk-1',
          type: 'CASH_FLOW',
          history: [
            { score: 80, timestamp: '2026-08-01' },
            { score: 60, timestamp: '2026-08-08' },
            { score: 40, timestamp: '2026-08-15' },
          ],
        },
        {
          id: 'risk-2',
          type: 'REVENUE',
          history: [
            { score: 30, timestamp: '2026-08-01' },
            { score: 50, timestamp: '2026-08-08' },
            { score: 70, timestamp: '2026-08-15' },
          ],
        },
        {
          id: 'risk-3',
          type: 'INVENTORY',
          history: [
            { score: 50, timestamp: '2026-08-01' },
            { score: 52, timestamp: '2026-08-08' },
            { score: 49, timestamp: '2026-08-15' },
          ],
        },
      ];
      const result = analyzer.analyzeMultiple(risks);
      expect(result.results).toBeDefined();
      expect(Object.isFrozen(result.results)).toBe(true);
      expect(result.summary.improving).toBe(1);
      expect(result.summary.worsening).toBe(1);
      expect(result.summary.stable).toBe(1);
      expect(result.summary.total).toBe(3);
      expect(result.summary.overallDirection).toBe('STABLE');
      expect(result.summary.message).toContain('Overall risk trend');
    });
  });

  describe('Trend score calculation', () => {
    test('should calculate trend score correctly for improving', () => {
      const history = [
        { score: 90, timestamp: '2026-08-01' },
        { score: 70, timestamp: '2026-08-08' },
        { score: 50, timestamp: '2026-08-15' },
        { score: 30, timestamp: '2026-08-22' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.score).toBeLessThan(50);
      expect(result.score).toBeGreaterThan(0);
    });

    test('should calculate trend score correctly for worsening', () => {
      const history = [
        { score: 20, timestamp: '2026-08-01' },
        { score: 40, timestamp: '2026-08-08' },
        { score: 60, timestamp: '2026-08-15' },
        { score: 80, timestamp: '2026-08-22' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.score).toBeGreaterThan(50);
      expect(result.score).toBeLessThan(100);
    });
  });
});

describe('RiskPersistenceAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new RiskPersistenceAnalyzer({
      minSnapshots: 2,
      daysToConsiderPersistent: 14,
      daysToConsiderEntrenched: 30,
      logger: mockLogger,
    });
    jest.clearAllMocks();
  });

  describe('analyze()', () => {
    test('should detect persistent risk', () => {
      const history = [
        { score: 70, timestamp: '2026-07-15', status: 'ACTIVE' },
        { score: 75, timestamp: '2026-07-22', status: 'ACTIVE' },
        { score: 80, timestamp: '2026-07-29', status: 'ACTIVE' },
        { score: 85, timestamp: '2026-08-05', status: 'ACTIVE' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.daysActive).toBeGreaterThanOrEqual(21);
      expect(result.isPersistent).toBe(true);
      expect(result.isEntrenched).toBe(false);
      expect(result.persistenceScore).toBeGreaterThan(50);
      expect(result.status).toBe('PERSISTENT');
      expect(result.message).toContain('persistent');
      expect(Object.isFrozen(result.data)).toBe(true);
    });

    test('should detect entrenched risk', () => {
      const history = [
        { score: 70, timestamp: '2026-06-15', status: 'ACTIVE' },
        { score: 75, timestamp: '2026-06-29', status: 'ACTIVE' },
        { score: 80, timestamp: '2026-07-13', status: 'ACTIVE' },
        { score: 85, timestamp: '2026-07-27', status: 'ACTIVE' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.daysActive).toBeGreaterThan(40);
      expect(result.isEntrenched).toBe(true);
      expect(result.status).toBe('ENTRENCHED');
    });

    test('should detect emerging risk', () => {
      const history = [
        { score: 40, timestamp: '2026-08-01', status: 'ACTIVE' },
        { score: 45, timestamp: '2026-08-02', status: 'ACTIVE' },
        { score: 50, timestamp: '2026-08-03', status: 'ACTIVE' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.daysActive).toBeLessThan(14);
      expect(result.isPersistent).toBe(false);
      expect(result.isEntrenched).toBe(false);
      expect(result.status).toBe('EMERGING');
      expect(result.message).toContain('emerging');
    });

    test('should detect improving risk', () => {
      const history = [
        { score: 80, timestamp: '2026-08-01', status: 'ACTIVE' },
        { score: 70, timestamp: '2026-08-08', status: 'IMPROVING' },
        { score: 60, timestamp: '2026-08-15', status: 'IMPROVING' },
        { score: 50, timestamp: '2026-08-22', status: 'IMPROVING' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.status).toBe('IMPROVING');
      expect(result.message).toContain('improving');
    });

    test('should handle insufficient history', () => {
      const history = [
        { score: 50, timestamp: '2026-08-01', status: 'ACTIVE' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_HISTORY');
      expect(result.daysActive).toBe(0);
      expect(result.isPersistent).toBe(false);
    });

    test('should handle empty history', () => {
      const result = analyzer.analyze({
        history: [],
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_HISTORY');
    });

    test('should handle resolving risk', () => {
      const history = [
        { score: 80, timestamp: '2026-08-01', status: 'ACTIVE' },
        { score: 70, timestamp: '2026-08-08', status: 'ACTIVE' },
        { score: 50, timestamp: '2026-08-15', status: 'IMPROVING' },
        { score: 30, timestamp: '2026-08-22', status: 'RESOLVED' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.available).toBe(true);
      expect(result.status).toBe('RESOLVING');
    });

    test('should never throw on invalid dates', () => {
      const result = analyzer.analyze({
        history: [{ score: 50, timestamp: 'invalid' }],
      });
      expect(result.available).toBe(false);
    });
  });

  describe('analyzeMultiple()', () => {
    test('should analyze multiple risks', () => {
      const risks = [
        {
          id: 'risk-1',
          type: 'CASH_FLOW',
          history: [
            { score: 80, timestamp: '2026-07-01' },
            { score: 85, timestamp: '2026-07-15' },
            { score: 90, timestamp: '2026-07-29' },
          ],
        },
        {
          id: 'risk-2',
          type: 'REVENUE',
          history: [
            { score: 40, timestamp: '2026-08-01' },
            { score: 45, timestamp: '2026-08-08' },
            { score: 50, timestamp: '2026-08-15' },
          ],
        },
      ];
      const result = analyzer.analyzeMultiple(risks);
      expect(result.results).toBeDefined();
      expect(Object.isFrozen(result.results)).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.persistent).toBeGreaterThan(0);
      expect(result.summary.message).toContain('persistent');
    });
  });

  describe('needsEscalation()', () => {
    test('should return true for entrenched risk', () => {
      const history = [
        { score: 70, timestamp: '2026-07-01' },
        { score: 75, timestamp: '2026-07-15' },
        { score: 80, timestamp: '2026-07-29' },
        { score: 85, timestamp: '2026-08-12' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(analyzer.needsEscalation(result)).toBe(true);
    });

    test('should return true for high persistence score', () => {
      const history = [
        { score: 90, timestamp: '2026-07-01' },
        { score: 92, timestamp: '2026-07-15' },
        { score: 95, timestamp: '2026-07-29' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(result.persistenceScore).toBeGreaterThan(70);
      expect(analyzer.needsEscalation(result)).toBe(true);
    });

    test('should return false for emerging risk', () => {
      const history = [
        { score: 40, timestamp: '2026-08-01' },
        { score: 45, timestamp: '2026-08-02' },
        { score: 50, timestamp: '2026-08-03' },
      ];
      const result = analyzer.analyze({
        history,
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(analyzer.needsEscalation(result)).toBe(false);
    });

    test('should return false for unavailable data', () => {
      const result = analyzer.analyze({
        history: [],
        riskId: 'risk-1',
        riskType: 'CASH_FLOW',
      });
      expect(analyzer.needsEscalation(result)).toBe(false);
    });
  });
});