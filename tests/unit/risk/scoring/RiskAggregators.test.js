'use strict';

const RiskScoreCalculator = require('../../../../src/application/services/risk/scoring/RiskScoreCalculator');
const RiskSeverityCalculator = require('../../../../src/application/services/risk/scoring/RiskSeverityCalculator');
const RiskRules = require('../../../../src/application/services/risk/rules/RiskRules');

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

describe('Risk Aggregators Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // RiskScoreCalculator
  // ──────────────────────────────────────────────
  describe('RiskScoreCalculator', () => {
    let calculator;

    beforeEach(() => {
      calculator = new RiskScoreCalculator({ logger: mockLogger });
    });

    test('empty risks → perfect health', () => {
      const result = calculator.calculate({ risks: [] });
      expect(result.overallScore).toBe(0);
      expect(result.businessHealthScore).toBe(100);
      expect(result.scoreBand).toBe('LOW');
      expect(result.totalRisks).toBe(0);
    });

    test('aggregates multiple risks correctly', () => {
      const risks = [
        { score: 80, trend: { direction: 'WORSENING' }, impact: { financial: 2_000_000 }, ageInDays: 45 },
        { score: 40, trend: { direction: 'STABLE' }, impact: { financial: 200_000 }, ageInDays: 10 },
        { score: 15, trend: { direction: 'IMPROVING' }, impact: { financial: 0 }, ageInDays: 5 },
      ];

      const result = calculator.calculate({ risks });
      expect(result.overallScore).toBeGreaterThan(30);
      expect(result.overallScore).toBeLessThan(80);
      expect(result.totalRisks).toBe(3);
      expect(result.breakdown).toHaveLength(3);
      expect(result.riskCounts.critical + result.riskCounts.high).toBeGreaterThan(0);
      expect(result.meta.calculator).toBe('RiskScoreCalculator');
    });

    test('null/undefined input → treated as empty', () => {
      const result = calculator.calculate(null);
      expect(result.overallScore).toBe(0);
      expect(result.businessHealthScore).toBe(100);
      expect(result.totalRisks).toBe(0);
      expect(result.meta.error).toBeUndefined();
    });

    test('returns fallback only on calculation error', () => {
      const result = calculator.calculate({ risks: [{ score: Symbol('bad') }] });
      expect(result.overallScore).toBe(75);
      expect(result.scoreBand).toBe('HIGH');
      expect(result.meta.error).toBe(true);
    });

    test('weights must sum to 1.0', () => {
      expect(() => {
        new RiskScoreCalculator({ weights: { currentCondition: 0.5, trend: 0.6 } });
      }).toThrow(/sum to 1.0/);
    });
  });

  // ──────────────────────────────────────────────
  // RiskSeverityCalculator
  // ──────────────────────────────────────────────
  describe('RiskSeverityCalculator', () => {
    let calculator;

    beforeEach(() => {
      calculator = new RiskSeverityCalculator({ logger: mockLogger });
    });

    test('basic severity mapping', () => {
      expect(calculator.calculate({ score: 10 }).severity).toBe('LOW');
      expect(calculator.calculate({ score: 30 }).severity).toBe('MEDIUM');
      expect(calculator.calculate({ score: 60 }).severity).toBe('HIGH');
      expect(calculator.calculate({ score: 90 }).severity).toBe('CRITICAL');
    });

    test('worsening trend increases score', () => {
      const base = calculator.calculate({ score: 40, trend: 'STABLE' });
      const worse = calculator.calculate({ score: 40, trend: 'WORSENING' });
      expect(worse.score).toBeGreaterThan(base.score);
    });

    test('critical + worsening → escalation', () => {
      const result = calculator.calculate({ score: 80, trend: 'WORSENING' });
      expect(result.severity).toBe('CRITICAL');
      expect(result.needsEscalation).toBe(true);
      expect(result.urgency).toBe('IMMEDIATE');
    });

    test('calculateMultiple works', () => {
      const risks = [
        { id: 'r1', score: 85, trend: { direction: 'WORSENING' } },
        { id: 'r2', score: 20, trend: { direction: 'IMPROVING' } },
      ];
      const result = calculator.calculateMultiple(risks);
      expect(result.results).toHaveLength(2);
      expect(result.highestSeverity).toBe('CRITICAL');
      expect(result.criticalCount).toBe(1);
    });

    test('never throws', () => {
      const result = calculator.calculate({ score: null });
      expect(result.severity).toBeDefined();
      expect(result.meta).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // RiskRules v1.3.0 SSOT
  // ──────────────────────────────────────────────
  describe('RiskRules', () => {
    let rules;

    beforeEach(() => {
      rules = new RiskRules({ logger: mockLogger });
    });

    test('default thresholds are present', () => {
      expect(rules.getThresholds('cash')).toBeDefined();
      expect(rules.getThresholds('revenue')).toBeDefined();
      expect(rules.getThresholds('receivables')).toBeDefined();
      expect(rules.getThresholds('anomaly')).toBeDefined();
    });

    test('anomaly thresholds match SSOT', () => {
      const t = rules.getThresholds('anomaly');
      expect(t.minDataPoints).toBe(10);
      expect(t.zScoreThreshold).toBe(2.5);
      expect(t.robustZScoreThreshold).toBe(3.5);
      expect(t.defaultMethod).toBe('robust_zscore');
    });

    test('cash thresholds structure', () => {
      const t = rules.getThresholds('cash');
      expect(t.runwayMonths).toBeDefined();
      expect(t.runwayMonths.critical).toBeDefined();
    });

    test('revenue thresholds structure', () => {
      const t = rules.getThresholds('revenue');
      expect(t.revenueGrowth).toBeDefined();
      expect(t.revenueGrowth.critical).toBeDefined();
    });

    test('unknown domain returns empty object', () => {
      expect(rules.getThresholds('unknown_domain')).toEqual({});
    });

    test('contract version is exposed', () => {
      expect(rules.version).toBe('1.3.0');
    });
  });
});