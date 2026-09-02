'use strict';

const { RISK_STATUS } = require('../contracts');
const RiskRules = require('../rules/RiskRules');

/**
 * RiskPersistenceAnalyzer – SSOT v1.3.0-prod
 *
 * Measures how long risks have been active and whether they are becoming
 * entrenched. Statuses: EMERGING | PERSISTENT | ENTRENCHED | RESOLVING | IMPROVING | UNKNOWN
 *
 * Design for production scale
 *   • Frozen immutable outputs
 *   • Zero-crash public API
 *   • Thresholds from RiskRules SSOT with constructor overrides
 *   • O(n) analysis; bounded history
 *   • Compatible with RiskContracts / RiskEngine
 *
 * @version 1.3.0
 */
class RiskPersistenceAnalyzer {
  static VERSION = '1.3.0';

  static STATUS = Object.freeze({
    EMERGING: 'EMERGING',
    PERSISTENT: 'PERSISTENT',
    ENTRENCHED: 'ENTRENCHED',
    RESOLVING: 'RESOLVING',
    IMPROVING: 'IMPROVING',
    UNKNOWN: 'UNKNOWN',
  });

  /**
   * @param {object} [options]
   * @param {RiskRules} [options.rules]
   * @param {number} [options.minSnapshots=2]
   * @param {number} [options.daysToConsiderPersistent=14]
   * @param {number} [options.daysToConsiderEntrenched=30]
   * @param {number} [options.escalationScore=70]
   * @param {number} [options.maxHistoryLength=500]
   * @param {object} [options.logger]
   */
  constructor({
    rules = null,
    minSnapshots = null,
    daysToConsiderPersistent = null,
    daysToConsiderEntrenched = null,
    escalationScore = null,
    maxHistoryLength = null,
    logger = console,
  } = {}) {
    this.logger = logger;
    this.rules = rules || new RiskRules({ logger });

    const cfg = this.rules.getThresholds('persistence') || {};

    this.minSnapshots = this._posInt(
      minSnapshots ?? cfg.minSnapshots,
      2
    );
    this.daysToConsiderPersistent = this._posInt(
      daysToConsiderPersistent ?? cfg.daysToConsiderPersistent,
      14
    );
    this.daysToConsiderEntrenched = this._posInt(
      daysToConsiderEntrenched ?? cfg.daysToConsiderEntrenched,
      30
    );
    this.escalationScore = this._posNum(
      escalationScore ?? cfg.escalationScore,
      70
    );
    this.maxHistoryLength = this._posInt(
      maxHistoryLength ?? cfg.maxHistoryLength,
      500
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze persistence for a single risk.
   *
   * @param {object} params
   * @param {Array<object>} [params.history]
   * @param {string} [params.riskId]
   * @param {string} [params.riskType]
   * @returns {Readonly<object>}
   */
  analyze({
    history = [],
    riskId = 'unknown',
    riskType = 'unknown',
  } = {}) {
    try {
      let snapshots = this._safeArray(history);

      if (snapshots.length > this.maxHistoryLength) {
        this.logger.warn?.(
          `[RiskPersistenceAnalyzer] truncating history ${snapshots.length} → ${this.maxHistoryLength}`
        );
        snapshots = snapshots.slice(-this.maxHistoryLength);
      }

      if (snapshots.length < this.minSnapshots) {
        return Object.freeze({
          available: false,
          reason: 'INSUFFICIENT_HISTORY',
          persistenceScore: 0,
          daysActive: 0,
          isPersistent: false,
          isEntrenched: false,
          status: RiskPersistenceAnalyzer.STATUS.UNKNOWN,
          message: `Need ${this.minSnapshots} snapshots. Have ${snapshots.length}`,
          riskId,
          riskType,
          meta: Object.freeze({
            calculator: 'RiskPersistenceAnalyzer',
            version: RiskPersistenceAnalyzer.VERSION,
          }),
        });
      }

      const firstTimestamp = this._parseDate(snapshots[0]);
      const lastTimestamp = this._parseDate(snapshots[snapshots.length - 1]);
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysActive = Math.max(
        1,
        Math.round((lastTimestamp - firstTimestamp) / msPerDay)
      );

      const isPersistent = daysActive >= this.daysToConsiderPersistent;
      const isEntrenched =
        daysActive >= this.daysToConsiderEntrenched &&
        this._isWorseningTrend(snapshots);

      const persistenceScore = this._calculatePersistenceScore(
        snapshots,
        daysActive
      );
      const status = this._determineStatus(
        snapshots,
        isPersistent,
        isEntrenched
      );
      const message = this._generateMessage(
        daysActive,
        isPersistent,
        isEntrenched,
        status,
        snapshots
      );

      return Object.freeze({
        available: true,
        persistenceScore: Number(persistenceScore.toFixed(2)),
        daysActive,
        isPersistent,
        isEntrenched,
        status,
        riskId,
        riskType,
        snapshotsCount: snapshots.length,
        message,
        data: Object.freeze(
          snapshots.map((s, i) =>
            Object.freeze({
              index: i,
              score: this._safeNumber(s.score),
              timestamp: s.timestamp || s.detectedAt || s.date || null,
              status: s.status || RISK_STATUS.ACTIVE,
            })
          )
        ),
        meta: Object.freeze({
          calculator: 'RiskPersistenceAnalyzer',
          version: RiskPersistenceAnalyzer.VERSION,
        }),
      });
    } catch (error) {
      this.logger.error?.('[RiskPersistenceAnalyzer] analyze failed', {
        riskId,
        error: error?.message,
      });
      return Object.freeze({
        available: false,
        reason: 'CALCULATION_ERROR',
        persistenceScore: 0,
        daysActive: 0,
        isPersistent: false,
        isEntrenched: false,
        status: RiskPersistenceAnalyzer.STATUS.UNKNOWN,
        message: 'Persistence analysis failed',
        riskId,
        riskType,
        meta: Object.freeze({
          error: true,
          calculator: 'RiskPersistenceAnalyzer',
          version: RiskPersistenceAnalyzer.VERSION,
        }),
      });
    }
  }

  /**
   * Analyze persistence for multiple risks.
   * @param {Array<object>} risks
   * @returns {Readonly<object>}
   */
  analyzeMultiple(risks = []) {
    try {
      const list = this._safeArray(risks);
      const results = {};

      for (const risk of list) {
        if (!risk || typeof risk !== 'object') continue;
        const result = this.analyze({
          history: risk.history || [],
          riskId: risk.id || risk.riskId || 'unknown',
          riskType: risk.type || risk.riskType || 'unknown',
        });
        const key =
          risk.id ||
          risk.riskId ||
          risk.type ||
          `risk_${Object.keys(results).length}`;
        results[key] = result;
      }

      const resultArray = Object.values(results);
      const persistentRisks = resultArray.filter((r) => r.isPersistent);
      const entrenchedRisks = resultArray.filter((r) => r.isEntrenched);
      const highPersistence = resultArray.filter(
        (r) => r.persistenceScore > this.escalationScore
      );
      const maxDaysActive = resultArray.reduce(
        (max, r) => Math.max(max, r.daysActive || 0),
        0
      );

      return Object.freeze({
        results: Object.freeze(results),
        summary: Object.freeze({
          total: Object.keys(results).length,
          persistent: persistentRisks.length,
          entrenched: entrenchedRisks.length,
          highPersistence: highPersistence.length,
          maxDaysActive,
          message: `${persistentRisks.length} persistent, ${entrenchedRisks.length} entrenched`,
        }),
        meta: Object.freeze({
          calculator: 'RiskPersistenceAnalyzer',
          version: RiskPersistenceAnalyzer.VERSION,
        }),
      });
    } catch (error) {
      this.logger.error?.('[RiskPersistenceAnalyzer] analyzeMultiple failed', {
        error: error?.message,
      });
      return Object.freeze({
        results: Object.freeze({}),
        summary: Object.freeze({
          total: 0,
          persistent: 0,
          entrenched: 0,
          highPersistence: 0,
          maxDaysActive: 0,
        }),
        meta: Object.freeze({
          error: true,
          calculator: 'RiskPersistenceAnalyzer',
          version: RiskPersistenceAnalyzer.VERSION,
        }),
      });
    }
  }

  /**
   * Whether a persistence result warrants escalation.
   * @param {object} persistenceResult
   * @returns {boolean}
   */
  needsEscalation(persistenceResult) {
    if (!persistenceResult || !persistenceResult.available) return false;
    return (
      persistenceResult.isEntrenched === true ||
      (Number(persistenceResult.persistenceScore) || 0) > this.escalationScore
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * persistenceScore [0–100]
   * 50% days active + 30% worsening consistency + 20% recent severity
   */
  _calculatePersistenceScore(snapshots, daysActive) {
    let score = 0;

    // 1. Days active (cap 50)
    score += Math.min(50, daysActive * 1.5);

    // 2. Worsening consistency (up to 30)
    if (snapshots.length > 1) {
      let worseningCount = 0;
      for (let i = 1; i < snapshots.length; i++) {
        if (
          this._safeNumber(snapshots[i].score) >
          this._safeNumber(snapshots[i - 1].score)
        ) {
          worseningCount += 1;
        }
      }
      score += (worseningCount / (snapshots.length - 1)) * 30;
    }

    // 3. Recent severity (up to 20)
    const recent = snapshots.slice(-3).map((s) => this._safeNumber(s.score));
    const avgRecent =
      recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length);
    score += Math.min(20, avgRecent / 5);

    return Math.min(100, Math.round(score));
  }

  _isWorseningTrend(snapshots) {
    if (snapshots.length < 3) return false;
    const recent = snapshots.slice(-3).map((s) => this._safeNumber(s.score));
    return recent[2] > recent[0];
  }

  _determineStatus(snapshots, isPersistent, isEntrenched) {
    const lastSnap = snapshots[snapshots.length - 1] || {};
    const recentStatus = lastSnap.status || RISK_STATUS.ACTIVE;

    // Lifecycle signals on the latest snapshot take priority over age flags.
    // A risk that is resolving or improving should not be labelled PERSISTENT
    // solely because it has been open > 14 days.
    if (recentStatus === RISK_STATUS.RESOLVED) {
      return RiskPersistenceAnalyzer.STATUS.RESOLVING;
    }
    if (recentStatus === 'IMPROVING') {
      return RiskPersistenceAnalyzer.STATUS.IMPROVING;
    }

    if (isEntrenched) return RiskPersistenceAnalyzer.STATUS.ENTRENCHED;
    if (isPersistent) return RiskPersistenceAnalyzer.STATUS.PERSISTENT;

    return RiskPersistenceAnalyzer.STATUS.EMERGING;
  }

  _generateMessage(daysActive, isPersistent, isEntrenched, status, snapshots) {
    const statusMap = {
      ENTRENCHED: 'entrenched',
      PERSISTENT: 'persistent',
      RESOLVING: 'resolving',
      IMPROVING: 'improving',
      EMERGING: 'emerging',
      UNKNOWN: 'unknown',
    };

    let msg = `Risk is ${statusMap[status] || 'unknown'} (${daysActive}d)`;

    const currentScore = this._safeNumber(
      snapshots[snapshots.length - 1]?.score
    );
    const firstScore = this._safeNumber(snapshots[0]?.score);
    const change = currentScore - firstScore;

    if (daysActive > 30) {
      msg += ' - long-standing risk requires attention';
    } else if (daysActive > 14) {
      msg += ' - risk requires monitoring';
    } else {
      msg += ' - recent risk';
    }

    if (Math.abs(change) > 10) {
      msg += ` (${change > 0 ? '+' : ''}${change.toFixed(1)} score change)`;
    }

    return msg;
  }

  _parseDate(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return Date.now();
    const ts =
      snapshot.timestamp || snapshot.detectedAt || snapshot.date || Date.now();
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
  }

  _safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  _safeNumber(val) {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }

  _posInt(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }

  _posNum(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
}

module.exports = RiskPersistenceAnalyzer;