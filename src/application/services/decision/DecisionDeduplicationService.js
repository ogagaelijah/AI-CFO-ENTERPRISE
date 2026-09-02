'use strict';

/**
 * DecisionDeduplicationService
 * Fingerprints + cooldowns + worsen-override. SSOT compliant.
 * Supports injectable history for multi-instance / DB-backed scale.
 * @version 1.2.0-prod
 */

const {
  DECISION_STATUS,
  DECISION_PRIORITY,
  DECISION_SEVERITY,
  PRIORITY_ORDER,
  PRIORITY_EXPIRY_DAYS,
  ACTIVE_STATUSES,
  Validators,
} = require('./contracts/DecisionContracts');

const MS_DAY = 24 * 60 * 60 * 1000;

const COOLDOWN_MS = Object.freeze({
  // CRITICAL: 1 day (1/3 of 3-day expiry)
  [DECISION_PRIORITY.CRITICAL]:
    (PRIORITY_EXPIRY_DAYS[DECISION_PRIORITY.CRITICAL] * MS_DAY) / 3,
  [DECISION_PRIORITY.HIGH]: 3 * MS_DAY,
  [DECISION_PRIORITY.MEDIUM]: 7 * MS_DAY,
  [DECISION_PRIORITY.LOW]: 14 * MS_DAY,
});

const DEFAULT_COOLDOWN = COOLDOWN_MS[DECISION_PRIORITY.MEDIUM];
const MAX_HISTORY = 5000;
const WORSEN_THRESHOLD = 0.2; // 20% metric degradation

class DecisionDeduplicationService {
  /**
   * @param {object} [options]
   * @param {Array} [options.decisionHistory] Seed history (in-memory)
   * @param {object} [options.cooldownOverrides]
   * @param {number} [options.maxHistory]
   * @param {object} [options.logger]
   * @param {{ getHistory?: Function, add?: Function, clear?: Function }} [options.store]
   * Optional external store for horizontal scale / persistence.
   * getHistory(): Promise|Array, add(decision): Promise|void, clear(): Promise|void
   */
  constructor(options = {}) {
    this.cooldownMap = Object.freeze({
     ...COOLDOWN_MS,
     ...(options.cooldownOverrides && typeof options.cooldownOverrides === 'object'
       ? options.cooldownOverrides
        : {}),
    });
    this.maxHistory = Number(options.maxHistory) > 0? Number(options.maxHistory) : MAX_HISTORY;
    this.logger = options.logger || console;
    this.store = options.store || null;

    // In-memory fallback (capped)
    this._history = Array.isArray(options.decisionHistory)
     ? options.decisionHistory.slice(-this.maxHistory)
      : [];
  }

  /** @returns {Array} */
  get decisionHistory() {
    return this._history;
  }

  set decisionHistory(val) {
    this._history = Array.isArray(val)? val.slice(-this.maxHistory) : [];
  }

  /**
   * Format: {type}:{entity}:{entityId}
   */
  getFingerprint(decisionData = {}) {
    const type = decisionData.type || 'UNKNOWN';
    const entity = decisionData.relatedEntity || 'BUSINESS';
    const entityId =
      decisionData.relatedEntityId!= null
       ? String(decisionData.relatedEntityId)
        : 'global';
    return `${type}:${entity}:${entityId}`;
  }

  /**
   * Format: {type}:{entity}:{entityId}:{severity}
   */
  getDetailedFingerprint(decisionData = {}) {
    const base = this.getFingerprint(decisionData);
    const severity = decisionData.severity || DECISION_SEVERITY.INFO;
    return `${base}:${severity}`;
  }

  /**
   * Active duplicate on base fingerprint
   */
  isDuplicate(fingerprint, existingDecisions = []) {
    if (!Array.isArray(existingDecisions) ||!fingerprint) return false;
    return existingDecisions.some((d) => {
      if (!d) return false;
      const dFp = this.getFingerprint(d);
      const status = d.status || DECISION_STATUS.ACTIVE;
      const isActive =
        (ACTIVE_STATUSES && ACTIVE_STATUSES.includes(status)) ||
        status === DECISION_STATUS.ACTIVE ||
        status === DECISION_STATUS.ACKNOWLEDGED;
      return dFp === fingerprint && isActive;
    });
  }

  /**
   * Active duplicate on detailed (type+entity+severity) fingerprint
   */
  isDetailedDuplicate(detailedFingerprint, existingDecisions = []) {
    if (!Array.isArray(existingDecisions) ||!detailedFingerprint) return false;
    return existingDecisions.some((d) => {
      if (!d) return false;
      const dFp = this.getDetailedFingerprint(d);
      const status = d.status || DECISION_STATUS.ACTIVE;
      const isActive =
        (ACTIVE_STATUSES && ACTIVE_STATUSES.includes(status)) ||
        status === DECISION_STATUS.ACTIVE ||
        status === DECISION_STATUS.ACKNOWLEDGED;
      return dFp === detailedFingerprint && isActive;
    });
  }

  getMostRecent(fingerprint, decisionHistory = this._history) {
    if (!Array.isArray(decisionHistory) ||!fingerprint) return null;
    let best = null;
    let bestTs = -Infinity;
    for (const d of decisionHistory) {
      if (!d || this.getFingerprint(d)!== fingerprint) continue;
      const ts = new Date(d.createdAt || 0).getTime();
      if (Number.isFinite(ts) && ts > bestTs) {
        bestTs = ts;
        best = d;
      }
    }
    return best;
  }

  getAllInstances(fingerprint, decisionHistory = this._history) {
    if (!Array.isArray(decisionHistory) ||!fingerprint) return [];
    return decisionHistory
     .filter((d) => d && this.getFingerprint(d) === fingerprint)
     .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
  }

  getCooldownPeriod(decisionData = {}) {
    const priority = Validators.isValidPriority(decisionData.priority)
     ? decisionData.priority
      : DECISION_PRIORITY.MEDIUM;
    return this.cooldownMap[priority] || DEFAULT_COOLDOWN;
  }

  isInCooldown(fingerprint, lastGenerated) {
    if (!lastGenerated) return false;
    const lastDate = new Date(lastGenerated.createdAt || lastGenerated);
    if (Number.isNaN(lastDate.getTime())) return false;
    const elapsed = Date.now() - lastDate.getTime();
    return elapsed < this.getCooldownPeriod(lastGenerated);
  }

  getCooldownRemaining(fingerprint, lastGenerated) {
    if (!lastGenerated) return 0;
    const lastDate = new Date(lastGenerated.createdAt || lastGenerated);
    if (Number.isNaN(lastDate.getTime())) return 0;
    const elapsed = Date.now() - lastDate.getTime();
    const cooldown = this.getCooldownPeriod(lastGenerated);
    return Math.max(0, cooldown - elapsed);
  }

  getCooldownRemainingHuman(fingerprint, lastGenerated) {
    const ms = this.getCooldownRemaining(fingerprint, lastGenerated);
    if (ms <= 0) return 'Not in cooldown';
    const days = Math.floor(ms / MS_DAY);
    const hours = Math.floor((ms % MS_DAY) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }

  /**
   * Gate for generation
   * @returns {Readonly<object>}
   */
  shouldGenerate(
    decisionData = {},
    existingDecisions = [],
    history = this._history
  ) {
    const fingerprint = this.getFingerprint(decisionData);
    const detailedFingerprint = this.getDetailedFingerprint(decisionData);

    // 1. Active duplicate (base)
    if (this.isDuplicate(fingerprint, existingDecisions)) {
      return this._deny(
        'DUPLICATE_ACTIVE',
        fingerprint,
        detailedFingerprint,
        'An active decision of this type already exists.'
      );
    }

    // 2. Active duplicate (same severity)
    if (this.isDetailedDuplicate(detailedFingerprint, existingDecisions)) {
      return this._deny(
        'DUPLICATE_ACTIVE_SAME_SEVERITY',
        fingerprint,
        detailedFingerprint,
        'An active decision with the same severity already exists.'
      );
    }

    // 3. Cooldown
    const mostRecent = this.getMostRecent(fingerprint, history);
    if (mostRecent && this.isInCooldown(fingerprint, mostRecent)) {
      // 4. Worsened → allow re-alert through cooldown
      if (this.checkSituationWorsened(decisionData, mostRecent)) {
        return Object.freeze({
          shouldGenerate: true,
          fingerprint,
          detailedFingerprint,
          reason: 'SITUATION_WORSENED',
          message: 'Situation has materially worsened. Re-alerting allowed.',
        });
      }

      return Object.freeze({
        shouldGenerate: false,
        reason: 'COOLDOWN_ACTIVE',
        fingerprint,
        detailedFingerprint,
        cooldownRemaining: this.getCooldownRemaining(fingerprint, mostRecent),
        cooldownRemainingHuman: this.getCooldownRemainingHuman(
          fingerprint,
          mostRecent
        ),
        lastGenerated: mostRecent.createdAt,
        message: `Decision is in cooldown for ${this.getCooldownRemainingHuman(
          fingerprint,
          mostRecent
        )}`,
      });
    }

    return Object.freeze({
      shouldGenerate: true,
      fingerprint,
      detailedFingerprint,
      reason: 'ALLOWED',
      message: 'Decision generation allowed.',
    });
  }

  /**
   * >20% metric degradation or priority escalation
   */
  checkSituationWorsened(decisionData = {}, mostRecent) {
    if (!mostRecent) return true;

    const currentValue =
      decisionData.evidence?.currentValue??
      decisionData.currentState?.value??
      null;
    const previousValue =
      mostRecent.evidence?.currentValue??
      mostRecent.currentState?.value??
      null;

    if (
      typeof currentValue === 'number' &&
      typeof previousValue === 'number' &&
      previousValue!== 0 &&
      Number.isFinite(currentValue) &&
      Number.isFinite(previousValue)
    ) {
      const degradation = (previousValue - currentValue) / Math.abs(previousValue);
      if (degradation > WORSEN_THRESHOLD) return true;
    }

    const currentPriority = decisionData.priority;
    const previousPriority = mostRecent.priority;
    if (
      Validators.isValidPriority(currentPriority) &&
      Validators.isValidPriority(previousPriority)
    ) {
      // Lower order number = higher priority
      if (
        (PRIORITY_ORDER[currentPriority]?? 99) <
        (PRIORITY_ORDER[previousPriority]?? 99)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Append to history (memory + optional store)
   */
  async addToHistory(decision) {
    if (!decision) return;

    this._history.push(decision);
    if (this._history.length > this.maxHistory) {
      this._history = this._history.slice(-this.maxHistory);
    }

    if (this.store && typeof this.store.add === 'function') {
      try {
        await this.store.add(decision);
      } catch (err) {
        this.logger.warn?.('[DecisionDeduplication] store.add failed', {
          error: err?.message,
        });
      }
    }
  }

  async clearHistory() {
    this._history = [];
    if (this.store && typeof this.store.clear === 'function') {
      try {
        await this.store.clear();
      } catch (err) {
        this.logger.warn?.('[DecisionDeduplication] store.clear failed', {
          error: err?.message,
        });
      }
    }
  }

  /**
   * Optionally hydrate from external store
   */
  async loadFromStore() {
    if (!this.store || typeof this.store.getHistory!== 'function') {
      return this._history;
    }
    try {
      const rows = await this.store.getHistory();
      if (Array.isArray(rows)) {
        this._history = rows.slice(-this.maxHistory);
      }
    } catch (err) {
      this.logger.warn?.('[DecisionDeduplication] store.getHistory failed', {
        error: err?.message,
      });
    }
    return this._history;
  }

  getStats(decisions = this._history) {
    const list = Array.isArray(decisions)? decisions : [];
    const fingerprints = new Set();
    let duplicateCount = 0;

    for (const decision of list) {
      if (!decision) continue;
      const fp = this.getFingerprint(decision);
      if (fingerprints.has(fp)) duplicateCount += 1;
      else fingerprints.add(fp);
    }

    return Object.freeze({
      total: list.length,
      unique: fingerprints.size,
      duplicates: duplicateCount,
      duplicateRate:
        list.length > 0? Math.round((duplicateCount / list.length) * 100) : 0,
    });
  }

  _deny(reason, fingerprint, detailedFingerprint, message) {
    return Object.freeze({
      shouldGenerate: false,
      reason,
      fingerprint,
      detailedFingerprint,
      message,
    });
  }
}

module.exports = DecisionDeduplicationService;