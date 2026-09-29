'use strict';

const Decision = require('../../../src/domain/entities/Decision');
const DecisionDeduplicationService = require('../../../src/application/services/decision/DecisionDeduplicationService');

function makeDecision(overrides = {}) {
  return new Decision({
    type: 'CASH_FLOW_WARNING',
    category: 'CASH_FLOW',
    title: 'Test decision',
    recommendation: 'Take appropriate action',
    relatedEntity: 'BUSINESS',
    relatedEntityId: '1',
    ...overrides,
  });
}

describe('DecisionDeduplicationService', () => {
  let service;
  let mockHistory;

  beforeEach(() => {
    service = new DecisionDeduplicationService();
    mockHistory = [];
  });

  describe('constructor', () => {
    it('should use default cooldown map', () => {
      const svc = new DecisionDeduplicationService();
      expect(svc.getCooldownPeriod({ priority: 'MEDIUM' })).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should use custom cooldown overrides', () => {
      const svc = new DecisionDeduplicationService({
        cooldownOverrides: { HIGH: 5 * 24 * 60 * 60 * 1000 },
      });
      expect(svc.getCooldownPeriod({ priority: 'HIGH' })).toBe(5 * 24 * 60 * 60 * 1000);
    });

    it('should use critical cooldown as 1/3 of expiry', () => {
      const svc = new DecisionDeduplicationService();
      expect(svc.getCooldownPeriod({ priority: 'CRITICAL' })).toBe(1 * 24 * 60 * 60 * 1000);
    });

    it('should accept decision history', () => {
      const history = [{ id: 'test1' }, { id: 'test2' }];
      const svc = new DecisionDeduplicationService({ decisionHistory: history });
      expect(svc.decisionHistory).toEqual(history);
    });
  });

  describe('getFingerprint', () => {
    it('should generate consistent fingerprint', () => {
      const fp1 = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      const fp2 = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprints for different types', () => {
      const fp1 = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      const fp2 = service.getFingerprint({
        type: 'LOW_STOCK',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(fp1).not.toBe(fp2);
    });

    it('should generate different fingerprints for different entities', () => {
      const fp1 = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      const fp2 = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'PRODUCT',
        relatedEntityId: 'prod_123',
      });
      expect(fp1).not.toBe(fp2);
    });

    it('should use default values for missing fields', () => {
      const fp = service.getFingerprint({ type: 'CASH_FLOW_WARNING' });
      expect(fp).toBe('CASH_FLOW_WARNING:BUSINESS:global');
    });
  });

  describe('getDetailedFingerprint', () => {
    it('should include severity in fingerprint', () => {
      const fp = service.getDetailedFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
        severity: 'CRITICAL',
      });
      expect(fp).toBe('CASH_FLOW_WARNING:BUSINESS:1:CRITICAL');
    });

    it('should default to INFO severity', () => {
      const fp = service.getDetailedFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(fp).toBe('CASH_FLOW_WARNING:BUSINESS:1:INFO');
    });
  });

  describe('isDuplicate', () => {
    it('should detect duplicate decisions', () => {
      const existing = [makeDecision({ status: 'ACTIVE' })];
      const fp = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(service.isDuplicate(fp, existing)).toBe(true);
    });

    it('should ignore resolved decisions', () => {
      const existing = [makeDecision({ status: 'RESOLVED' })];
      const fp = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(service.isDuplicate(fp, existing)).toBe(false);
    });

    it('should ignore dismissed decisions', () => {
      const existing = [makeDecision({ status: 'DISMISSED' })];
      const fp = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(service.isDuplicate(fp, existing)).toBe(false);
    });

    it('should ignore expired decisions', () => {
      const existing = [makeDecision({ status: 'EXPIRED' })];
      const fp = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(service.isDuplicate(fp, existing)).toBe(false);
    });

    it('should detect ACKNOWLEDGED as active', () => {
      const existing = [makeDecision({ status: 'ACKNOWLEDGED' })];
      const fp = service.getFingerprint({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(service.isDuplicate(fp, existing)).toBe(true);
    });
  });

  describe('getMostRecent', () => {
    it('should return most recent decision', () => {
      const older = makeDecision({ createdAt: new Date(Date.now() - 10000) });
      const newer = makeDecision({ createdAt: new Date() });
      mockHistory = [older, newer];
      const result = service.getMostRecent('CASH_FLOW_WARNING:BUSINESS:1', mockHistory);
      expect(result.createdAt).toEqual(newer.createdAt);
    });

    it('should return null if no matching decisions', () => {
      const result = service.getMostRecent('NONEXISTENT:BUSINESS:1', []);
      expect(result).toBeNull();
    });

    it('should return the most recent among many', () => {
      const d1 = makeDecision({ createdAt: new Date(Date.now() - 5000) });
      const d2 = makeDecision({ createdAt: new Date(Date.now() - 3000) });
      const d3 = makeDecision({ createdAt: new Date() });
      mockHistory = [d1, d2, d3];
      const result = service.getMostRecent('CASH_FLOW_WARNING:BUSINESS:1', mockHistory);
      expect(result.createdAt).toEqual(d3.createdAt);
    });
  });

  describe('getAllInstances', () => {
    it('should return all matching instances', () => {
      const d1 = makeDecision();
      const d2 = makeDecision();
      const d3 = makeDecision({
        type: 'LOW_STOCK',
        category: 'INVENTORY',
        title: 'Low stock',
        recommendation: 'Reorder',
      });
      mockHistory = [d1, d2, d3];
      const result = service.getAllInstances('CASH_FLOW_WARNING:BUSINESS:1', mockHistory);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('CASH_FLOW_WARNING');
      expect(result[1].type).toBe('CASH_FLOW_WARNING');
    });
  });

  describe('getCooldownPeriod', () => {
    it('should return critical cooldown for CRITICAL priority', () => {
      expect(service.getCooldownPeriod({ priority: 'CRITICAL' })).toBe(24 * 60 * 60 * 1000);
    });

    it('should return normal cooldown for non-critical', () => {
      expect(service.getCooldownPeriod({ priority: 'HIGH' })).toBe(3 * 24 * 60 * 60 * 1000);
    });
  });

  describe('isInCooldown', () => {
    it('should return true if within cooldown period', () => {
      const lastGenerated = {
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
      };
      expect(service.isInCooldown('CASH_FLOW_WARNING:BUSINESS:1', lastGenerated)).toBe(true);
    });

    it('should return false if past cooldown period', () => {
      const lastGenerated = {
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
      };
      expect(service.isInCooldown('CASH_FLOW_WARNING:BUSINESS:1', lastGenerated)).toBe(false);
    });

    it('should return false if no last generated', () => {
      expect(service.isInCooldown('CASH_FLOW_WARNING:BUSINESS:1', null)).toBe(false);
    });
  });

  describe('getCooldownRemaining', () => {
    it('should return remaining cooldown time in ms', () => {
      const lastGenerated = {
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
      };
      const remaining = service.getCooldownRemaining('CASH_FLOW_WARNING:BUSINESS:1', lastGenerated);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(2 * 24 * 60 * 60 * 1000);
    });

    it('should return 0 if no cooldown', () => {
      const lastGenerated = {
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
      };
      expect(service.getCooldownRemaining('CASH_FLOW_WARNING:BUSINESS:1', lastGenerated)).toBe(0);
    });
  });

  describe('getCooldownRemainingHuman', () => {
    it('should return human readable format', () => {
      const lastGenerated = {
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
      };
      expect(service.getCooldownRemainingHuman('CASH_FLOW_WARNING:BUSINESS:1', lastGenerated)).toMatch(
        /\d+d \d+h remaining/
      );
    });

    it('should return "Not in cooldown" when no cooldown', () => {
      const lastGenerated = {
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
      };
      expect(service.getCooldownRemainingHuman('CASH_FLOW_WARNING:BUSINESS:1', lastGenerated)).toBe(
        'Not in cooldown'
      );
    });
  });

  describe('shouldGenerate', () => {
    it('should allow generation when no duplicates exist', () => {
      const result = service.shouldGenerate(
        { type: 'CASH_FLOW_WARNING', category: 'CASH_FLOW', relatedEntity: 'BUSINESS', relatedEntityId: '1' },
        [],
        []
      );
      expect(result.shouldGenerate).toBe(true);
      expect(result.reason).toBe('ALLOWED');
    });

    it('should block generation when active duplicate exists', () => {
      const existing = [makeDecision({ status: 'ACTIVE' })];
      const result = service.shouldGenerate(
        { type: 'CASH_FLOW_WARNING', category: 'CASH_FLOW', relatedEntity: 'BUSINESS', relatedEntityId: '1' },
        existing,
        []
      );
      expect(result.shouldGenerate).toBe(false);
      expect(result.reason).toBe('DUPLICATE_ACTIVE');
    });

    it('should block generation when same severity duplicate exists', () => {
      const existing = [makeDecision({ severity: 'CRITICAL', status: 'ACTIVE' })];
      const result = service.shouldGenerate(
        {
          type: 'CASH_FLOW_WARNING',
          category: 'CASH_FLOW',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
          severity: 'CRITICAL',
        },
        existing,
        []
      );
      expect(result.shouldGenerate).toBe(false);
      // Same type+entity is always a base duplicate first when ACTIVE
      expect(['DUPLICATE_ACTIVE', 'DUPLICATE_ACTIVE_SAME_SEVERITY']).toContain(result.reason);
    });

    it('should block generation when in cooldown', () => {
      const history = [
        makeDecision({
          priority: 'HIGH',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        }),
      ];
      const result = service.shouldGenerate(
        {
          type: 'CASH_FLOW_WARNING',
          category: 'CASH_FLOW',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
          priority: 'HIGH',
        },
        [],
        history
      );
      expect(result.shouldGenerate).toBe(false);
      expect(result.reason).toBe('COOLDOWN_ACTIVE');
      expect(result.cooldownRemaining).toBeGreaterThan(0);
    });

    it('should allow generation after cooldown period', () => {
      const history = [
        makeDecision({
          priority: 'HIGH',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        }),
      ];
      const result = service.shouldGenerate(
        {
          type: 'CASH_FLOW_WARNING',
          category: 'CASH_FLOW',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
          priority: 'HIGH',
        },
        [],
        history
      );
      expect(result.shouldGenerate).toBe(true);
      expect(result.reason).toBe('ALLOWED');
    });

    it('should allow generation if situation has worsened', () => {
      const history = [
        makeDecision({
          priority: 'HIGH',
          evidence: { currentValue: 100 },
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        }),
      ];
      const result = service.shouldGenerate(
        {
          type: 'CASH_FLOW_WARNING',
          category: 'CASH_FLOW',
          relatedEntity: 'BUSINESS',
          relatedEntityId: '1',
          priority: 'HIGH',
          evidence: { currentValue: 50 },
        },
        [],
        history
      );
      expect(result.shouldGenerate).toBe(true);
      expect(result.reason).toBe('SITUATION_WORSENED');
    });
  });

  describe('checkSituationWorsened', () => {
    it('should return true if no previous decision', () => {
      expect(service.checkSituationWorsened({}, null)).toBe(true);
    });

    it('should return true if value dropped >20%', () => {
      const history = makeDecision({ evidence: { currentValue: 100 } });
      expect(service.checkSituationWorsened({ evidence: { currentValue: 70 } }, history)).toBe(true);
    });

    it('should return false if value not dropped >20%', () => {
      const history = makeDecision({ evidence: { currentValue: 100 } });
      expect(service.checkSituationWorsened({ evidence: { currentValue: 85 } }, history)).toBe(false);
    });

    it('should handle missing values', () => {
      const history = makeDecision({ evidence: { currentValue: 100 } });
      expect(service.checkSituationWorsened({ evidence: {} }, history)).toBe(false);
    });
  });

  describe('addToHistory', () => {
    it('should add decision to history', async () => {
      const decision = makeDecision();
      await service.addToHistory(decision);
      expect(service.decisionHistory).toContain(decision);
    });

    it('should limit history to 5000 items', async () => {
      for (let i = 0; i < 5001; i++) {
        await service.addToHistory(makeDecision({ id: `test_${i}` }));
      }
      expect(service.decisionHistory.length).toBe(5000);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', async () => {
      await service.addToHistory(makeDecision());
      await service.addToHistory(makeDecision());
      expect(service.decisionHistory.length).toBe(2);
      await service.clearHistory();
      expect(service.decisionHistory.length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return deduplication statistics', () => {
      const decisions = [
        { type: 'CASH_FLOW_WARNING', relatedEntity: 'BUSINESS', relatedEntityId: '1' },
        { type: 'CASH_FLOW_WARNING', relatedEntity: 'BUSINESS', relatedEntityId: '1' },
        { type: 'LOW_STOCK', relatedEntity: 'BUSINESS', relatedEntityId: '1' },
      ];
      const stats = service.getStats(decisions);
      expect(stats.total).toBe(3);
      expect(stats.unique).toBe(2);
      expect(stats.duplicates).toBe(1);
      expect(stats.duplicateRate).toBeCloseTo(33, 0);
    });

    it('should handle empty array', () => {
      const stats = service.getStats([]);
      expect(stats.total).toBe(0);
      expect(stats.unique).toBe(0);
      expect(stats.duplicates).toBe(0);
      expect(stats.duplicateRate).toBe(0);
    });
  });
});