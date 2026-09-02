'use strict';

/**
 * DecisionLifecycleService
 * Status transitions, expiry, and lifecycle queries.
 * Immutable-safe: never mutates Decision entities.
 * SSOT: DecisionContracts
 * @version 1.2.1-prod
 */

const {
  DECISION_STATUS,
  ACTIVE_STATUSES,
  Validators,
} = require('./contracts/DecisionContracts');

const VALID_TRANSITIONS = Object.freeze({
  [DECISION_STATUS.ACTIVE]: Object.freeze([
    DECISION_STATUS.ACKNOWLEDGED,
    DECISION_STATUS.DISMISSED,
    DECISION_STATUS.EXPIRED,
  ]),
  [DECISION_STATUS.ACKNOWLEDGED]: Object.freeze([
    DECISION_STATUS.ACTIONED,
    DECISION_STATUS.DISMISSED,
    DECISION_STATUS.EXPIRED,
  ]),
  [DECISION_STATUS.ACTIONED]: Object.freeze([
    DECISION_STATUS.RESOLVED,
    DECISION_STATUS.EXPIRED,
  ]),
  [DECISION_STATUS.DISMISSED]: Object.freeze([]),
  [DECISION_STATUS.RESOLVED]: Object.freeze([]),
  [DECISION_STATUS.EXPIRED]: Object.freeze([]),
});

const TERMINAL_STATUSES = Object.freeze([
  DECISION_STATUS.DISMISSED,
  DECISION_STATUS.RESOLVED,
  DECISION_STATUS.EXPIRED,
]);

const STATUS_LABELS = Object.freeze({
  [DECISION_STATUS.ACTIVE]: '🟢 Active',
  [DECISION_STATUS.ACKNOWLEDGED]: '📖 Acknowledged',
  [DECISION_STATUS.ACTIONED]: '🔧 Actioned',
  [DECISION_STATUS.RESOLVED]: '✅ Resolved',
  [DECISION_STATUS.DISMISSED]: '❌ Dismissed',
  [DECISION_STATUS.EXPIRED]: '⏰ Expired',
});

const MS_DAY = 24 * 60 * 60 * 1000;

class DecisionLifecycleService {
  /**
   * @param {object} [options]
   * @param {object} [options.logger]
   * @param {(event: object) => void} [options.onTransition] Optional observability hook
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.onTransition =
      typeof options.onTransition === 'function'? options.onTransition : null;
  }

  getValidTransitions() {
    return VALID_TRANSITIONS;
  }

  getTerminalStatuses() {
    return TERMINAL_STATUSES;
  }

  canTransition(from, to) {
    if (!Validators.isValidStatus(from) ||!Validators.isValidStatus(to)) {
      return false;
    }
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    return Array.isArray(allowed) && allowed.includes(to);
  }

  isTerminal(status) {
    return TERMINAL_STATUSES.includes(status);
  }

  /**
   * Transition without mutating the input decision.
   * Supports:
   * - Decision entity with withStatus()
   * - Plain objects (returns a new shallow copy)
   *
   * @param {object} decision
   * @param {string} newStatus
   * @param {object} [metadata]
   * @returns {Readonly<{ success: boolean, decision: object|null, message: string, previousStatus?: string, validTransitions?: string[] }>}
   */
  transition(decision, newStatus, metadata = {}) {
    if (!decision || typeof decision!== 'object') {
      return Object.freeze({
        success: false,
        decision: null,
        message: 'Invalid decision object',
      });
    }

    const currentStatus = decision.status;
    if (!Validators.isValidStatus(currentStatus)) {
      return Object.freeze({
        success: false,
        decision,
        message: `Invalid current status: ${currentStatus}`,
      });
    }

    if (!Validators.isValidStatus(newStatus)) {
      return Object.freeze({
        success: false,
        decision,
        message: `Invalid target status: ${newStatus}`,
        validTransitions: VALID_TRANSITIONS[currentStatus] || [],
      });
    }

    if (currentStatus === newStatus) {
      return Object.freeze({
        success: true,
        decision,
        previousStatus: currentStatus,
        message: 'Status already set to target.',
      });
    }

    if (!this.canTransition(currentStatus, newStatus)) {
      return Object.freeze({
        success: false,
        decision,
        previousStatus: currentStatus,
        message: `Cannot transition from ${currentStatus} to ${newStatus}.`,
        validTransitions: VALID_TRANSITIONS[currentStatus] || [],
      });
    }

    const now = new Date();
    const patch = this._buildTransitionPatch(newStatus, metadata, now);

    let next;
    try {
      if (typeof decision.withStatus === 'function') {
        // Immutable Decision entity
        next = decision.withStatus(newStatus, {
         ...patch,
          updatedAt: now.toISOString(),
        });
      } else if (typeof decision.toJSON === 'function') {
        // Entity-like: rebuild as plain object
        next = Object.freeze({
         ...decision.toJSON(),
          status: newStatus,
          updatedAt: now.toISOString(),
         ...this._serializePatch(patch),
        });
      } else {
        // Plain object — never mutate input
        next = Object.freeze({
         ...decision,
          status: newStatus,
          updatedAt: now,
         ...patch,
        });
      }
    } catch (err) {
      this.logger.error?.('[DecisionLifecycle] transition failed', {
        id: decision.id,
        from: currentStatus,
        to: newStatus,
        error: err?.message,
      });
      return Object.freeze({
        success: false,
        decision,
        previousStatus: currentStatus,
        message: `Transition failed: ${err?.message || 'unknown error'}`,
      });
    }

    this.logger.debug?.(
      `[DecisionLifecycle] ${decision.id || 'unknown'}: ${currentStatus} -> ${newStatus}`
    );

    if (this.onTransition) {
      try {
        this.onTransition({
          decisionId: decision.id,
          from: currentStatus,
          to: newStatus,
          metadata,
          at: now.toISOString(),
        });
      } catch (_) {
        /* never break lifecycle on hook failure */
      }
    }

    return Object.freeze({
      success: true,
      decision: next,
      previousStatus: currentStatus,
      message: `Successfully transitioned from ${currentStatus} to ${newStatus}.`,
    });
  }

  acknowledge(decision) {
    return this.transition(decision, DECISION_STATUS.ACKNOWLEDGED);
  }

  action(decision, actionTaken) {
    return this.transition(decision, DECISION_STATUS.ACTIONED, {
      actionTaken: actionTaken || 'Action taken',
    });
  }

  resolve(decision, actionTaken) {
    return this.transition(decision, DECISION_STATUS.RESOLVED, {
      actionTaken,
    });
  }

  dismiss(decision, reason) {
    return this.transition(decision, DECISION_STATUS.DISMISSED, {
      reason: reason || 'Dismissed by user',
    });
  }

  expire(decision) {
    return this.transition(decision, DECISION_STATUS.EXPIRED);
  }

  isExpired(decision, now = new Date()) {
    if (!decision) return false;
    if (decision.status === DECISION_STATUS.EXPIRED) return true;
    if (!decision.expiresAt) return false;
    const exp = new Date(decision.expiresAt);
    if (Number.isNaN(exp.getTime())) return false;
    return now > exp;
  }

  /**
   * Bulk auto-expire. Does not mutate inputs.
   * @returns {ReadonlyArray<{ decisionId: *, success: boolean, previousStatus: string, decision: object|null }>}
   */
  autoExpire(decisions = [], now = new Date()) {
    if (!Array.isArray(decisions)) return Object.freeze([]);

    const results = [];
    for (const decision of decisions) {
      if (!decision) continue;
      if (decision.status === DECISION_STATUS.EXPIRED) continue;
      if (!this.isExpired(decision, now)) continue;

      const previousStatus = decision.status;
      const result = this.expire(decision);
      results.push(
        Object.freeze({
          decisionId: decision.id,
          success: result.success,
          previousStatus,
          decision: result.decision,
        })
      );
    }
    return Object.freeze(results);
  }

  filterByStatus(decisions = [], status) {
    if (!Array.isArray(decisions)) return [];
    const statuses = Array.isArray(status)? status : [status];
    return decisions.filter((d) => d && statuses.includes(d.status));
  }

  getActionable(decisions = [], now = new Date()) {
    if (!Array.isArray(decisions)) return [];
    const activeSet =
      Array.isArray(ACTIVE_STATUSES) && ACTIVE_STATUSES.length
       ? ACTIVE_STATUSES
        : [DECISION_STATUS.ACTIVE, DECISION_STATUS.ACKNOWLEDGED];

    return decisions.filter(
      (d) =>
        d &&
        activeSet.includes(d.status) &&
       !this.isExpired(d, now)
    );
  }

  getActive(decisions = []) {
    return this.filterByStatus(decisions, DECISION_STATUS.ACTIVE);
  }

  getAcknowledged(decisions = []) {
    return this.filterByStatus(decisions, DECISION_STATUS.ACKNOWLEDGED);
  }

  getActioned(decisions = []) {
    return this.filterByStatus(decisions, DECISION_STATUS.ACTIONED);
  }

  getResolved(decisions = []) {
    return this.filterByStatus(decisions, DECISION_STATUS.RESOLVED);
  }

  getDismissed(decisions = []) {
    return this.filterByStatus(decisions, DECISION_STATUS.DISMISSED);
  }

  getExpired(decisions = []) {
    return this.filterByStatus(decisions, DECISION_STATUS.EXPIRED);
  }

  getStats(decisions = [], now = new Date()) {
    const list = Array.isArray(decisions)? decisions : [];
    const byStatus = {
      [DECISION_STATUS.ACTIVE]: 0,
      [DECISION_STATUS.ACKNOWLEDGED]: 0,
      [DECISION_STATUS.ACTIONED]: 0,
      [DECISION_STATUS.RESOLVED]: 0,
      [DECISION_STATUS.DISMISSED]: 0,
      [DECISION_STATUS.EXPIRED]: 0,
    };

    let actionable = 0;
    let expired = 0;

    const activeSet =
      Array.isArray(ACTIVE_STATUSES) && ACTIVE_STATUSES.length
       ? ACTIVE_STATUSES
        : [DECISION_STATUS.ACTIVE, DECISION_STATUS.ACKNOWLEDGED];

    for (const decision of list) {
      if (!decision) continue;
      const status = decision.status;
      if (byStatus[status]!== undefined) byStatus[status] += 1;

      const expiredFlag = this.isExpired(decision, now);
      if (expiredFlag) expired += 1;
      if (activeSet.includes(status) &&!expiredFlag) actionable += 1;
    }

    return Object.freeze({
      total: list.length,
      byStatus: Object.freeze(byStatus),
      actionable,
      expired,
    });
  }

  getStatusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  getLifecycleStage(decision, now = new Date()) {
    if (!decision) return 'UNKNOWN';
    if (
      decision.status === DECISION_STATUS.EXPIRED ||
      this.isExpired(decision, now)
    ) {
      return 'EXPIRED';
    }
    if (
      decision.status === DECISION_STATUS.RESOLVED ||
      decision.status === DECISION_STATUS.DISMISSED
    ) {
      return 'COMPLETED';
    }
    if (decision.status === DECISION_STATUS.ACTIONED) return 'ACTIONED';
    if (decision.status === DECISION_STATUS.ACKNOWLEDGED) return 'ACKNOWLEDGED';
    if (decision.status === DECISION_STATUS.ACTIVE) return 'PENDING';
    return 'UNKNOWN';
  }

  getAgeInDays(decision, now = new Date()) {
    if (!decision?.createdAt) return null;
    const created = new Date(decision.createdAt);
    if (Number.isNaN(created.getTime())) return null;
    return Math.floor((now.getTime() - created.getTime()) / MS_DAY);
  }

  getDaysUntilExpiry(decision, now = new Date()) {
    if (!decision?.expiresAt) return null;
    const exp = new Date(decision.expiresAt);
    if (Number.isNaN(exp.getTime())) return null;
    return Math.ceil((exp.getTime() - now.getTime()) / MS_DAY); // FIXED: ceil instead of floor
  }

  isUrgent(decision, threshold = 2, now = new Date()) {
    if (!decision) return false;
    const daysUntil = this.getDaysUntilExpiry(decision, now);
    if (daysUntil === null) return false;
    if (daysUntil > threshold) return false;

    const activeSet =
      Array.isArray(ACTIVE_STATUSES) && ACTIVE_STATUSES.length
       ? ACTIVE_STATUSES
        : [DECISION_STATUS.ACTIVE, DECISION_STATUS.ACKNOWLEDGED];

    return activeSet.includes(decision.status) &&!this.isExpired(decision, now);
  }

  // ─── internals ───────────────────────────────────────────

  _buildTransitionPatch(newStatus, metadata, now) {
    const patch = {};

    switch (newStatus) {
      case DECISION_STATUS.ACTIONED:
        patch.actionTaken = metadata.actionTaken || 'Action taken';
        patch.actionedAt = now;
        break;
      case DECISION_STATUS.DISMISSED:
        patch.dismissReason = metadata.reason || metadata.dismissReason || 'Dismissed by user';
        break;
      case DECISION_STATUS.RESOLVED:
        if (metadata.actionTaken) patch.actionTaken = metadata.actionTaken;
        patch.actionedAt = metadata.actionedAt
         ? new Date(metadata.actionedAt)
          : now;
        break;
      case DECISION_STATUS.EXPIRED:
        // Domain may not have expiredAt on entity; kept for plain objects / audit
        patch.expiredAt = now;
        break;
      case DECISION_STATUS.ACKNOWLEDGED:
        patch.acknowledgedAt = now;
        break;
      default:
        break;
    }

    // Allow callers to pass through extra metadata fields safely
    if (metadata.notes!= null) patch.notes = metadata.notes;
    return patch;
  }

  _serializePatch(patch) {
    const out = {...patch };
    for (const key of Object.keys(out)) {
      if (out[key] instanceof Date) {
        out[key] = out[key].toISOString();
      }
    }
    return out;
  }
}

module.exports = DecisionLifecycleService;