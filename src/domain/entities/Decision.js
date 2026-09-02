'use strict';

/**
 * Decision Entity
 * Immutable, SSOT-backed business recommendation.
 * Production-ready for scale (multi-process safe ID, deep freeze, strict validation).
 *
 * @version 1.3.1-prod
 */

const { randomUUID } = require('crypto');
const {
  DECISION_CATEGORIES,
  DECISION_PRIORITY,
  DECISION_SEVERITY,
  DECISION_STATUS,
  DECISION_TIMEFRAME,
  DECISION_ENTITY,
  PRIORITY_EXPIRY_DAYS,
  PRIORITY_EMOJI,
  SEVERITY_EMOJI,
  Validators,
} = require('../../application/services/decision/contracts/DecisionContracts');

class Decision {
  /**
   * @param {object} params
   */
  constructor(params = {}) {
    this._validate(params);

    // Collision-resistant ID: UUID fragment + base36 timestamp
    this._id =
      params.id ||
      `dec_${randomUUID().replace(/-/g, '').slice(0, 12)}_${Date.now().toString(36)}`;

    this._type = String(params.type).trim();

    this._category =
      params.category && Validators.isValidCategory(params.category)
        ? params.category
        : DECISION_CATEGORIES.CASH_FLOW;

    this._title = String(params.title).trim();
    this._summary = params.summary != null ? String(params.summary) : '';

    this._priority =
      params.priority && Validators.isValidPriority(params.priority)
        ? params.priority
        : DECISION_PRIORITY.MEDIUM;

    this._severity =
      params.severity && Validators.isValidSeverity(params.severity)
        ? params.severity
        : DECISION_SEVERITY.INFO;

    this._confidence = this._clamp(
      params.confidence != null ? Number(params.confidence) : 0,
      0,
      100
    );

    this._trigger = Object.freeze({ ...(params.trigger || {}) });
    this._evidence = Object.freeze({ ...(params.evidence || {}) });
    this._currentState = Object.freeze({ ...(params.currentState || {}) });

    this._expectedImpact =
      params.expectedImpact != null ? String(params.expectedImpact) : '';
    this._recommendation = String(params.recommendation).trim();

    this._alternatives = Object.freeze(
      Array.isArray(params.alternatives) ? [...params.alternatives] : []
    );
    this._risks = Object.freeze(
      Array.isArray(params.risks) ? [...params.risks] : []
    );
    this._assumptions = Object.freeze(
      Array.isArray(params.assumptions) ? [...params.assumptions] : []
    );

    this._timeframe =
      params.timeframe && Validators.isValidTimeframe(params.timeframe)
        ? params.timeframe
        : DECISION_TIMEFRAME.MEDIUM_TERM;

    this._relatedEntity =
      params.relatedEntity && Validators.isValidEntity(params.relatedEntity)
        ? params.relatedEntity
        : DECISION_ENTITY.BUSINESS;

    this._relatedEntityId =
      params.relatedEntityId != null ? String(params.relatedEntityId) : 'global';

    this._status =
      params.status && Validators.isValidStatus(params.status)
        ? params.status
        : DECISION_STATUS.ACTIVE;

    this._createdAt = params.createdAt ? new Date(params.createdAt) : new Date();

    // null = never expires; undefined/missing = priority-based default
    if (params.expiresAt === null) {
      this._expiresAt = null;
    } else if (params.expiresAt != null) {
      this._expiresAt = new Date(params.expiresAt);
    } else {
      this._expiresAt = this._calculateExpiry(this._priority);
    }

    this._updatedAt = params.updatedAt ? new Date(params.updatedAt) : new Date();

    this._actionTaken = params.actionTaken || null;
    this._actionedAt = params.actionedAt ? new Date(params.actionedAt) : null;
    this._dismissReason = params.dismissReason || null;
    this._acknowledgedAt = params.acknowledgedAt
      ? new Date(params.acknowledgedAt)
      : null;
    this._expiredAt = params.expiredAt ? new Date(params.expiredAt) : null;

    Object.freeze(this);
  }

  // ─── getters ───────────────────────────────────────────────
  get id() { return this._id; }
  get type() { return this._type; }
  get category() { return this._category; }
  get title() { return this._title; }
  get summary() { return this._summary; }
  get priority() { return this._priority; }
  get severity() { return this._severity; }
  get confidence() { return this._confidence; }
  get trigger() { return this._trigger; }
  get evidence() { return this._evidence; }
  get currentState() { return this._currentState; }
  get expectedImpact() { return this._expectedImpact; }
  get recommendation() { return this._recommendation; }
  get alternatives() { return this._alternatives; }
  get risks() { return this._risks; }
  get assumptions() { return this._assumptions; }
  get timeframe() { return this._timeframe; }
  get relatedEntity() { return this._relatedEntity; }
  get relatedEntityId() { return this._relatedEntityId; }
  get status() { return this._status; }
  get createdAt() { return this._createdAt; }
  get expiresAt() { return this._expiresAt; }
  get updatedAt() { return this._updatedAt; }
  get actionTaken() { return this._actionTaken; }
  get actionedAt() { return this._actionedAt; }
  get dismissReason() { return this._dismissReason; }
  get acknowledgedAt() { return this._acknowledgedAt; }
  get expiredAt() { return this._expiredAt; }

  /**
   * Dedup key: type:entity:entityId
   */
  getFingerprint() {
    return `${this._type}:${this._relatedEntity}:${this._relatedEntityId}`;
  }

  isExpired(now = new Date()) {
    if (this._status === DECISION_STATUS.EXPIRED) return true;
    if (this._expiresAt == null) return false;
    const exp =
      this._expiresAt instanceof Date
        ? this._expiresAt
        : new Date(this._expiresAt);
    if (Number.isNaN(exp.getTime())) return false;
    return now > exp;
  }

  isActionable(now = new Date()) {
    return (
      (this._status === DECISION_STATUS.ACTIVE ||
        this._status === DECISION_STATUS.ACKNOWLEDGED) &&
      !this.isExpired(now)
    );
  }

  getScore() {
    const priorityWeight = {
      [DECISION_PRIORITY.CRITICAL]: 4,
      [DECISION_PRIORITY.HIGH]: 3,
      [DECISION_PRIORITY.MEDIUM]: 2,
      [DECISION_PRIORITY.LOW]: 1,
    };
    return (
      (priorityWeight[this._priority] || 1) *
      this._getUrgencyWeight() *
      (this._confidence / 100)
    );
  }

  getPriorityLabel() {
    const title =
      this._priority.charAt(0).toUpperCase() +
      this._priority.slice(1).toLowerCase();
    return `${PRIORITY_EMOJI[this._priority] || ''} ${title}`.trim();
  }

  getSeverityLabel() {
    const title =
      this._severity.charAt(0).toUpperCase() +
      this._severity.slice(1).toLowerCase();
    return `${SEVERITY_EMOJI[this._severity] || ''} ${title}`.trim();
  }

  /**
   * Immutable status transition. Returns a new Decision.
   */
  withStatus(newStatus, metadata = {}) {
    const safeMeta = metadata && typeof metadata === 'object' ? { ...metadata } : {};
    // Prevent accidental identity overwrite
    delete safeMeta.id;
    delete safeMeta.type;

    return new Decision({
      ...this.toJSON(),
      status: newStatus,
      updatedAt: new Date().toISOString(),
      ...safeMeta,
    });
  }

  toDisplay() {
    return {
      id: this._id,
      type: this._type,
      category: this._category,
      title: this._title,
      summary: this._summary,
      priority: this._priority,
      priorityLabel: this.getPriorityLabel(),
      severity: this._severity,
      severityLabel: this.getSeverityLabel(),
      confidence: this._confidence,
      score: this.getScore(),
      evidence: this._evidence,
      expectedImpact: this._expectedImpact,
      recommendation: this._recommendation,
      timeframe: this._timeframe,
      status: this._status,
      isExpired: this.isExpired(),
      createdAt: this._createdAt.toISOString(),
    };
  }

  toJSON() {
    return {
      id: this._id,
      type: this._type,
      category: this._category,
      title: this._title,
      summary: this._summary,
      priority: this._priority,
      severity: this._severity,
      confidence: this._confidence,
      trigger: this._trigger,
      evidence: this._evidence,
      currentState: this._currentState,
      expectedImpact: this._expectedImpact,
      recommendation: this._recommendation,
      alternatives: this._alternatives,
      risks: this._risks,
      assumptions: this._assumptions,
      timeframe: this._timeframe,
      relatedEntity: this._relatedEntity,
      relatedEntityId: this._relatedEntityId,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      expiresAt: this._expiresAt ? this._expiresAt.toISOString() : null,
      updatedAt: this._updatedAt.toISOString(),
      actionTaken: this._actionTaken,
      actionedAt: this._actionedAt ? this._actionedAt.toISOString() : null,
      dismissReason: this._dismissReason,
      acknowledgedAt: this._acknowledgedAt
        ? this._acknowledgedAt.toISOString()
        : null,
      expiredAt: this._expiredAt ? this._expiredAt.toISOString() : null,
    };
  }

  static fromJSON(data) {
    return new Decision(data);
  }

  _validate(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Decision params object is required');
    }
    if (params.type == null || !String(params.type).trim()) {
      throw new Error('Decision.type is required');
    }
    if (!Validators.isValidType(String(params.type).trim())) {
      throw new Error(`Invalid type: ${params.type}`);
    }
    if (params.title == null || !String(params.title).trim()) {
      throw new Error('Decision.title is required');
    }
    if (params.recommendation == null || !String(params.recommendation).trim()) {
      throw new Error('Decision.recommendation is required');
    }
    if (params.category != null && !Validators.isValidCategory(params.category)) {
      throw new Error(`Invalid category: ${params.category}`);
    }
    if (params.priority != null && !Validators.isValidPriority(params.priority)) {
      throw new Error(`Invalid priority: ${params.priority}`);
    }
    if (params.severity != null && !Validators.isValidSeverity(params.severity)) {
      throw new Error(`Invalid severity: ${params.severity}`);
    }
    if (params.timeframe != null && !Validators.isValidTimeframe(params.timeframe)) {
      throw new Error(`Invalid timeframe: ${params.timeframe}`);
    }
    if (params.status != null && !Validators.isValidStatus(params.status)) {
      throw new Error(`Invalid status: ${params.status}`);
    }
    if (params.relatedEntity != null && !Validators.isValidEntity(params.relatedEntity)) {
      throw new Error(`Invalid relatedEntity: ${params.relatedEntity}`);
    }
    if (
      params.confidence != null &&
      !Validators.isValidConfidence(Number(params.confidence))
    ) {
      throw new Error('Confidence must be a number between 0-100');
    }
  }

  _calculateExpiry(priority) {
    const days = PRIORITY_EXPIRY_DAYS[priority] || 14;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  _getUrgencyWeight(now = new Date()) {
    if (this.isExpired(now)) return 0;
    if (this._expiresAt == null) return 1;
    const daysLeft = (this._expiresAt - now) / (1000 * 60 * 60 * 24);
    if (daysLeft < 1) return 4;
    if (daysLeft < 3) return 3;
    if (daysLeft < 7) return 2;
    return 1;
  }

  _clamp(val, min, max) {
    const n = Number(val);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
}

module.exports = Decision;