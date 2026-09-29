'use strict';

const Decision = require('../../../src/domain/entities/Decision');
const DecisionLifecycleService = require('../../../src/application/services/decision/DecisionLifecycleService');

function makeDecision(overrides = {}) {
  return new Decision({
    type: 'CASH_FLOW_WARNING',
    category: 'CASH_FLOW',
    title: 'Test decision',
    recommendation: 'Take appropriate action',
    ...overrides,
  });
}

describe('DecisionLifecycleService', () => {
  let service;

  beforeEach(() => {
    service = new DecisionLifecycleService();
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for each status', () => {
      const transitions = service.getValidTransitions();
      expect(transitions.ACTIVE).toEqual(['ACKNOWLEDGED', 'DISMISSED', 'EXPIRED']);
      expect(transitions.ACKNOWLEDGED).toEqual(['ACTIONED', 'DISMISSED', 'EXPIRED']);
      expect(transitions.ACTIONED).toEqual(['RESOLVED', 'EXPIRED']);
      expect(transitions.DISMISSED).toEqual([]);
      expect(transitions.RESOLVED).toEqual([]);
      expect(transitions.EXPIRED).toEqual([]);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transitions', () => {
      expect(service.canTransition('ACTIVE', 'ACKNOWLEDGED')).toBe(true);
      expect(service.canTransition('ACTIVE', 'DISMISSED')).toBe(true);
      expect(service.canTransition('ACKNOWLEDGED', 'ACTIONED')).toBe(true);
      expect(service.canTransition('ACTIONED', 'RESOLVED')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(service.canTransition('ACTIVE', 'RESOLVED')).toBe(false);
      expect(service.canTransition('DISMISSED', 'ACTIVE')).toBe(false);
      expect(service.canTransition('RESOLVED', 'ACKNOWLEDGED')).toBe(false);
      expect(service.canTransition('EXPIRED', 'ACTIVE')).toBe(false);
    });

    it('should return false for unknown statuses', () => {
      expect(service.canTransition('UNKNOWN', 'ACTIVE')).toBe(false);
    });
  });

  describe('transition', () => {
    let decision;

    beforeEach(() => {
      decision = makeDecision({ status: 'ACTIVE' });
    });

    it('should transition to ACKNOWLEDGED', () => {
      const result = service.transition(decision, 'ACKNOWLEDGED');
      expect(result.success).toBe(true);
      expect(result.decision.status).toBe('ACKNOWLEDGED');
      expect(result.message).toContain('Successfully transitioned');
      expect(result.decision.updatedAt.getTime()).toBeGreaterThanOrEqual(
        decision.createdAt.getTime()
      );
    });

    it('should transition to DISMISSED with reason', () => {
      const result = service.transition(decision, 'DISMISSED', { reason: 'Not relevant' });
      expect(result.success).toBe(true);
      expect(result.decision.status).toBe('DISMISSED');
      expect(result.decision.dismissReason).toBe('Not relevant');
    });

    it('should transition to ACTIONED with action taken', () => {
      const acked = service.transition(decision, 'ACKNOWLEDGED');
      const result = service.transition(acked.decision, 'ACTIONED', {
        actionTaken: 'Called customer',
      });
      expect(result.success).toBe(true);
      expect(result.decision.status).toBe('ACTIONED');
      expect(result.decision.actionTaken).toBe('Called customer');
      expect(result.decision.actionedAt).toBeDefined();
    });

    it('should transition to EXPIRED', () => {
      const result = service.transition(decision, 'EXPIRED');
      expect(result.success).toBe(true);
      expect(result.decision.status).toBe('EXPIRED');
    });

    it('should transition to RESOLVED with action', () => {
      const acked = service.transition(decision, 'ACKNOWLEDGED');
      const actioned = service.transition(acked.decision, 'ACTIONED', {
        actionTaken: 'Called customer',
      });
      const result = service.transition(actioned.decision, 'RESOLVED', {
        actionTaken: 'Issue resolved',
      });
      expect(result.success).toBe(true);
      expect(result.decision.status).toBe('RESOLVED');
      expect(result.decision.actionTaken).toBe('Issue resolved');
      expect(result.decision.actionedAt).toBeDefined();
    });

    it('should return success true if already in target status', () => {
      const result = service.transition(decision, 'ACTIVE');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Status already set to target.');
    });

    it('should return success false for invalid transition', () => {
      const result = service.transition(decision, 'RESOLVED');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot transition');
      expect(result.validTransitions).toEqual(['ACKNOWLEDGED', 'DISMISSED', 'EXPIRED']);
    });
  });

  describe('convenience methods', () => {
    let decision;

    beforeEach(() => {
      decision = makeDecision({ status: 'ACTIVE' });
    });

    describe('acknowledge', () => {
      it('should mark decision as acknowledged', () => {
        const result = service.acknowledge(decision);
        expect(result.success).toBe(true);
        expect(result.decision.status).toBe('ACKNOWLEDGED');
      });
    });

    describe('action', () => {
      it('should mark decision as actioned', () => {
        const acked = service.acknowledge(decision);
        const result = service.action(acked.decision, 'Called customer');
        expect(result.success).toBe(true);
        expect(result.decision.status).toBe('ACTIONED');
        expect(result.decision.actionTaken).toBe('Called customer');
      });
    });

    describe('resolve', () => {
      it('should mark decision as resolved', () => {
        const acked = service.acknowledge(decision);
        const actioned = service.action(acked.decision, 'Called customer');
        const result = service.resolve(actioned.decision, 'Issue resolved');
        expect(result.success).toBe(true);
        expect(result.decision.status).toBe('RESOLVED');
        expect(result.decision.actionTaken).toBe('Issue resolved');
      });
    });

    describe('dismiss', () => {
      it('should mark decision as dismissed', () => {
        const result = service.dismiss(decision, 'Not relevant');
        expect(result.success).toBe(true);
        expect(result.decision.status).toBe('DISMISSED');
        expect(result.decision.dismissReason).toBe('Not relevant');
      });
    });

    describe('expire', () => {
      it('should mark decision as expired', () => {
        const result = service.expire(decision);
        expect(result.success).toBe(true);
        expect(result.decision.status).toBe('EXPIRED');
      });
    });
  });

  describe('isExpired', () => {
    it('should return true if status is EXPIRED', () => {
      expect(service.isExpired(makeDecision({ status: 'EXPIRED' }))).toBe(true);
    });

    it('should return true if expiresAt is in the past', () => {
      expect(
        service.isExpired(
          makeDecision({ status: 'ACTIVE', expiresAt: new Date(Date.now() - 1000) })
        )
      ).toBe(true);
    });

    it('should return false if not expired', () => {
      expect(
        service.isExpired(
          makeDecision({
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
        )
      ).toBe(false);
    });
  });

  describe('autoExpire', () => {
    it('should expire decisions that are past expiry date', () => {
      const decisions = [
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() - 1000),
        }),
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Low stock',
          recommendation: 'Reorder',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      ];

      const results = service.autoExpire(decisions);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].decision.status).toBe('EXPIRED');
      expect(decisions[1].status).toBe('ACTIVE'); // immutable
    });

    it('should not expire already expired decisions', () => {
      const decisions = [
        makeDecision({
          status: 'EXPIRED',
          expiresAt: new Date(Date.now() - 1000),
        }),
      ];
      expect(service.autoExpire(decisions)).toHaveLength(0);
    });
  });

  describe('filter methods', () => {
    let decisions;

    beforeEach(() => {
      decisions = [
        makeDecision({ type: 'CASH_FLOW_WARNING', status: 'ACTIVE' }),
        makeDecision({ type: 'CASH_TREND_DECLINE', status: 'ACKNOWLEDGED' }),
        makeDecision({ type: 'NEGATIVE_CASH_FLOW', status: 'ACTIONED' }),
        makeDecision({ type: 'COLLECTION_ACCELERATION', status: 'RESOLVED' }),
        makeDecision({ type: 'SUPPLIER_PAYMENT_REVIEW', status: 'DISMISSED' }),
        makeDecision({ type: 'CASH_BUFFER_EROSION', status: 'EXPIRED' }),
      ];
    });

    describe('filterByStatus', () => {
      it('should filter by single status', () => {
        const result = service.filterByStatus(decisions, 'ACTIVE');
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('ACTIVE');
      });

      it('should filter by multiple statuses', () => {
        const result = service.filterByStatus(decisions, ['ACTIVE', 'ACKNOWLEDGED']);
        expect(result).toHaveLength(2);
      });
    });

    describe('getActionable', () => {
      it('should return active and acknowledged decisions', () => {
        const result = service.getActionable(decisions);
        expect(result).toHaveLength(2);
      });

      it('should exclude expired decisions', () => {
        decisions.push(
          makeDecision({
            type: 'INVESTMENT_OPPORTUNITY',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() - 1000),
          })
        );
        expect(service.getActionable(decisions)).toHaveLength(2);
      });
    });

    describe('getActive', () => {
      it('should return only active decisions', () => {
        expect(service.getActive(decisions)).toHaveLength(1);
      });
    });

    describe('getAcknowledged', () => {
      it('should return only acknowledged decisions', () => {
        expect(service.getAcknowledged(decisions)).toHaveLength(1);
      });
    });

    describe('getActioned', () => {
      it('should return only actioned decisions', () => {
        expect(service.getActioned(decisions)).toHaveLength(1);
      });
    });

    describe('getResolved', () => {
      it('should return only resolved decisions', () => {
        expect(service.getResolved(decisions)).toHaveLength(1);
      });
    });

    describe('getDismissed', () => {
      it('should return only dismissed decisions', () => {
        expect(service.getDismissed(decisions)).toHaveLength(1);
      });
    });

    describe('getExpired', () => {
      it('should return only expired decisions', () => {
        expect(service.getExpired(decisions)).toHaveLength(1);
      });
    });
  });

  describe('getStats', () => {
    it('should return complete statistics', () => {
      const decisions = [
        makeDecision({ type: 'CASH_FLOW_WARNING', status: 'ACTIVE' }),
        makeDecision({ type: 'CASH_TREND_DECLINE', status: 'ACTIVE' }),
        makeDecision({ type: 'NEGATIVE_CASH_FLOW', status: 'ACKNOWLEDGED' }),
        makeDecision({ type: 'COLLECTION_ACCELERATION', status: 'ACTIONED' }),
        makeDecision({ type: 'SUPPLIER_PAYMENT_REVIEW', status: 'RESOLVED' }),
        makeDecision({ type: 'CASH_BUFFER_EROSION', status: 'DISMISSED' }),
        makeDecision({ type: 'INVESTMENT_OPPORTUNITY', status: 'EXPIRED' }),
      ];
      const stats = service.getStats(decisions);
      expect(stats.total).toBe(7);
      expect(stats.byStatus.ACTIVE).toBe(2);
      expect(stats.byStatus.ACKNOWLEDGED).toBe(1);
      expect(stats.byStatus.ACTIONED).toBe(1);
      expect(stats.byStatus.RESOLVED).toBe(1);
      expect(stats.byStatus.DISMISSED).toBe(1);
      expect(stats.byStatus.EXPIRED).toBe(1);
    });

    it('should calculate actionable correctly', () => {
      const decisions = [
        makeDecision({ type: 'CASH_FLOW_WARNING', status: 'ACTIVE' }),
        makeDecision({ type: 'CASH_TREND_DECLINE', status: 'ACKNOWLEDGED' }),
        makeDecision({ type: 'NEGATIVE_CASH_FLOW', status: 'RESOLVED' }),
        makeDecision({ type: 'COLLECTION_ACCELERATION', status: 'EXPIRED' }),
      ];
      expect(service.getStats(decisions).actionable).toBe(2);
    });

    it('should calculate expired correctly', () => {
      const decisions = [
        makeDecision({
          type: 'CASH_FLOW_WARNING',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() - 1000),
        }),
        makeDecision({ type: 'CASH_TREND_DECLINE', status: 'EXPIRED' }),
        makeDecision({
          type: 'NEGATIVE_CASH_FLOW',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 10000),
        }),
      ];
      expect(service.getStats(decisions).expired).toBe(2);
    });
  });

  describe('getStatusLabel', () => {
    it('should return labels with emojis', () => {
      expect(service.getStatusLabel('ACTIVE')).toBe('🟢 Active');
      expect(service.getStatusLabel('ACKNOWLEDGED')).toBe('📖 Acknowledged');
      expect(service.getStatusLabel('ACTIONED')).toBe('🔧 Actioned');
      expect(service.getStatusLabel('RESOLVED')).toBe('✅ Resolved');
      expect(service.getStatusLabel('DISMISSED')).toBe('❌ Dismissed');
      expect(service.getStatusLabel('EXPIRED')).toBe('⏰ Expired');
    });

    it('should return unknown status as-is', () => {
      expect(service.getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getLifecycleStage', () => {
    it('should return correct stage for each status', () => {
      expect(service.getLifecycleStage(makeDecision({ status: 'ACTIVE' }))).toBe('PENDING');
      expect(service.getLifecycleStage(makeDecision({ status: 'ACKNOWLEDGED' }))).toBe('ACKNOWLEDGED');
      expect(service.getLifecycleStage(makeDecision({ status: 'ACTIONED' }))).toBe('ACTIONED');
      expect(service.getLifecycleStage(makeDecision({ status: 'RESOLVED' }))).toBe('COMPLETED');
      expect(service.getLifecycleStage(makeDecision({ status: 'DISMISSED' }))).toBe('COMPLETED');
      expect(service.getLifecycleStage(makeDecision({ status: 'EXPIRED' }))).toBe('EXPIRED');
    });

    it('should treat expired decisions as EXPIRED', () => {
      const decision = makeDecision({
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(service.getLifecycleStage(decision)).toBe('EXPIRED');
    });
  });

  describe('getAgeInDays', () => {
    it('should calculate days since creation', () => {
      const decision = makeDecision({
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });
      expect(service.getAgeInDays(decision)).toBe(5);
    });
  });

  describe('getDaysUntilExpiry', () => {
    it('should calculate days until expiry', () => {
      const decision = makeDecision({
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });
      expect(service.getDaysUntilExpiry(decision)).toBe(5);
    });

    it('should return negative if expired', () => {
      // Math.floor + real clock can produce -5 or -6; accept either
      const decision = makeDecision({
        expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });
      const days = service.getDaysUntilExpiry(decision);
      expect(days).toBeLessThanOrEqual(-5);
      expect(days).toBeGreaterThanOrEqual(-6);
    });

    it('should return null if no expiry', () => {
      const decision = makeDecision({ expiresAt: null });
      expect(service.getDaysUntilExpiry(decision)).toBeNull();
    });
  });

  describe('isUrgent', () => {
    it('should return true for decisions expiring within threshold', () => {
      const decision = makeDecision({
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });
      expect(service.isUrgent(decision, 2)).toBe(true);
    });

    it('should return false for decisions not expiring soon', () => {
      const decision = makeDecision({
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });
      expect(service.isUrgent(decision, 2)).toBe(false);
    });

    it('should return false for non-actionable decisions', () => {
      const decision = makeDecision({
        status: 'RESOLVED',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });
      expect(service.isUrgent(decision, 2)).toBe(false);
    });

    it('should use default threshold of 2 days', () => {
      const decision = makeDecision({
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      });
      expect(service.isUrgent(decision)).toBe(true);
    });
  });
});