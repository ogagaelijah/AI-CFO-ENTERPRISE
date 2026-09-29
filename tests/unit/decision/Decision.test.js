'use strict';

const Decision = require('../../../src/domain/entities/Decision');

/**
 * Factory – always supplies required fields with a valid type.
 */
function makeDecision(overrides = {}) {
  return new Decision({
    type: 'CASH_FLOW_WARNING',
    category: 'CASH_FLOW',
    title: 'Test Decision',
    recommendation: 'Take appropriate action',
    ...overrides,
  });
}

describe('Decision Entity', () => {
  describe('constructor', () => {
    it('should create a decision with default values', () => {
      const decision = makeDecision();

      expect(decision.id).toMatch(/^dec_[a-z0-9]+_[a-z0-9]+$/);
      expect(decision.type).toBe('CASH_FLOW_WARNING');
      expect(decision.category).toBe('CASH_FLOW');
      expect(decision.priority).toBe('MEDIUM');
      expect(decision.status).toBe('ACTIVE');
      expect(decision.confidence).toBe(0);
      expect(decision.expiresAt).toBeDefined();
      expect(decision.relatedEntity).toBe('BUSINESS');
      expect(decision.relatedEntityId).toBe('global');
    });

    it('should set all provided values', () => {
      const now = new Date();
      const decision = new Decision({
        id: 'test_123',
        type: 'LOW_STOCK',
        category: 'INVENTORY',
        title: 'Low Stock Alert',
        summary: 'Inventory running low',
        priority: 'HIGH',
        severity: 'WARNING',
        confidence: 85,
        trigger: { ruleId: 'LOW_STOCK_RULE' },
        evidence: { currentStock: 5, reorderLevel: 10 },
        currentState: { stock: 5 },
        expectedImpact: 'Avoid stock-out',
        recommendation: 'Order more stock',
        alternatives: ['Find alternative supplier'],
        risks: ['Lost sales'],
        assumptions: ['Demand continues'],
        timeframe: 'SHORT_TERM',
        relatedEntity: 'PRODUCT',
        relatedEntityId: 'prod_123',
        status: 'ACTIVE',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        updatedAt: now,
        actionTaken: null,
        actionedAt: null,
        dismissReason: null,
      });

      expect(decision.id).toBe('test_123');
      expect(decision.type).toBe('LOW_STOCK');
      expect(decision.category).toBe('INVENTORY');
      expect(decision.priority).toBe('HIGH');
      expect(decision.confidence).toBe(85);
      expect(decision.relatedEntity).toBe('PRODUCT');
      expect(decision.relatedEntityId).toBe('prod_123');
      expect(decision.title).toBe('Low Stock Alert');
      expect(decision.recommendation).toBe('Order more stock');
    });

    it('should reject invalid type', () => {
      expect(() => new Decision({ type: 'TEST', title: 't', recommendation: 'r' }))
        .toThrow(/Invalid type/);
    });

    it('should reject missing title', () => {
      expect(() => new Decision({ type: 'CASH_FLOW_WARNING', recommendation: 'r' }))
        .toThrow(/title is required/);
    });

    it('should reject missing recommendation', () => {
      expect(() => new Decision({ type: 'CASH_FLOW_WARNING', title: 't' }))
        .toThrow(/recommendation is required/);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const d1 = makeDecision();
      const d2 = makeDecision();
      expect(d1.id).not.toBe(d2.id);
      expect(d1.id).toMatch(/^dec_[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  describe('calculateExpiry', () => {
    it('should calculate expiry based on priority', () => {
      const critical = makeDecision({ priority: 'CRITICAL' });
      const high = makeDecision({ priority: 'HIGH' });
      const medium = makeDecision({ priority: 'MEDIUM' });
      const low = makeDecision({ priority: 'LOW' });

      const now = Date.now();
      expect(critical.expiresAt.getTime()).toBeGreaterThan(now + 2 * 24 * 60 * 60 * 1000);
      expect(critical.expiresAt.getTime()).toBeLessThan(now + 4 * 24 * 60 * 60 * 1000);
      expect(high.expiresAt.getTime()).toBeGreaterThan(now + 6 * 24 * 60 * 60 * 1000);
      expect(medium.expiresAt.getTime()).toBeGreaterThan(now + 13 * 24 * 60 * 60 * 1000);
      expect(low.expiresAt.getTime()).toBeGreaterThan(now + 29 * 24 * 60 * 60 * 1000);
    });
  });

  describe('getFingerprint', () => {
    it('should generate consistent fingerprint', () => {
      const decision = makeDecision({
        type: 'CASH_FLOW_WARNING',
        relatedEntity: 'BUSINESS',
        relatedEntityId: '1',
      });
      expect(decision.getFingerprint()).toBe('CASH_FLOW_WARNING:BUSINESS:1');
    });

    it('should use default values for missing fields', () => {
      const decision = makeDecision({ type: 'CASH_FLOW_WARNING' });
      expect(decision.getFingerprint()).toBe('CASH_FLOW_WARNING:BUSINESS:global');
    });
  });

  describe('isExpired', () => {
    it('should return true if expired', () => {
      const expired = makeDecision({
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(expired.isExpired()).toBe(true);
    });

    it('should return false if not expired', () => {
      const valid = makeDecision({
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      expect(valid.isExpired()).toBe(false);
    });
  });

  describe('isActionable', () => {
    it('should return true for active and not expired', () => {
      const decision = makeDecision({
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      expect(decision.isActionable()).toBe(true);
    });

    it('should return false if expired', () => {
      const decision = makeDecision({
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(decision.isActionable()).toBe(false);
    });

    it('should return false if not active', () => {
      const decision = makeDecision({
        status: 'RESOLVED',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      expect(decision.isActionable()).toBe(false);
    });
  });

  describe('getPriorityLabel', () => {
    it('should return labels with emojis', () => {
      expect(makeDecision({ priority: 'CRITICAL' }).getPriorityLabel()).toBe('🔴 Critical');
      expect(makeDecision({ priority: 'HIGH' }).getPriorityLabel()).toBe('🟠 High');
      expect(makeDecision({ priority: 'MEDIUM' }).getPriorityLabel()).toBe('🟡 Medium');
      expect(makeDecision({ priority: 'LOW' }).getPriorityLabel()).toBe('🟢 Low');
    });
  });

  describe('getSeverityLabel', () => {
    it('should return labels with emojis', () => {
      expect(makeDecision({ severity: 'CRITICAL' }).getSeverityLabel()).toBe('🚨 Critical');
      expect(makeDecision({ severity: 'WARNING' }).getSeverityLabel()).toBe('⚠️ Warning');
      expect(makeDecision({ severity: 'INFO' }).getSeverityLabel()).toBe('ℹ️ Info');
      expect(makeDecision({ severity: 'OPPORTUNITY' }).getSeverityLabel()).toBe('💡 Opportunity');
    });
  });

  describe('toDisplay', () => {
    it('should return display object', () => {
      const decision = makeDecision({
        title: 'Test Decision',
        summary: 'Test Summary',
        recommendation: 'Take action',
      });

      const display = decision.toDisplay();
      expect(display.id).toBe(decision.id);
      expect(display.title).toBe('Test Decision');
      expect(display.summary).toBe('Test Summary');
      expect(display.recommendation).toBe('Take action');
      expect(display.isExpired).toBe(false);
      expect(display.priorityLabel).toBe('🟡 Medium');
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      const original = makeDecision({
        type: 'LOW_STOCK',
        category: 'INVENTORY',
        title: 'Low Stock',
        recommendation: 'Reorder now',
        priority: 'HIGH',
        status: 'ACTIVE',
        actionTaken: 'Ordered more stock',
        actionedAt: new Date(),
      });

      const json = original.toJSON();
      const restored = Decision.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.type).toBe(original.type);
      expect(restored.category).toBe(original.category);
      expect(restored.title).toBe(original.title);
      expect(restored.recommendation).toBe(original.recommendation);
      expect(restored.priority).toBe(original.priority);
      expect(restored.status).toBe(original.status);
      expect(restored.actionTaken).toBe(original.actionTaken);
      expect(restored.actionedAt.toISOString()).toBe(original.actionedAt.toISOString());
    });
  });
});