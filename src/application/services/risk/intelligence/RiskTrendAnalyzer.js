'use strict';

const { RISK_STATUS, TREND_DIRECTIONS, TREND } = require('../contracts');
const RiskRules = require('../rules/RiskRules');

/**
 * RiskTrendAnalyzer – SSOT v1.3.0-prod
 *
 * Tracks how risk scores change over time.
 * Directions: IMPROVING | STABLE | WORSENING | UNKNOWN
 * Strength:   STRONG | MODERATE | WEAK | UNKNOWN
 * Score:      0–100  (50 = stable, <50 improving, >50 worsening)
 *
 * Design for production scale
 *   • Frozen immutable outputs
 *   • Zero-crash public API (always returns a result object)
 *   • Thresholds from RiskRules SSOT with constructor overrides
 *   • O(n) analysis; bounded history window
 *   • Compatible with RiskContracts / RiskEngine
 *
 * @version 1.3.0
 */
class RiskTrendAnalyzer {
  static VERSION = '1.3.0';

  /**
   * @param {object} [options]
   * @param {RiskRules} [options.rules]
   * @param {number} [options.minSnapshots=3]
   * @param {number} [options.trendWindow=5]           Max recent points used for direction
   * @param {number} [options.improvementThreshold=-5] Absolute score delta → IMPROVING
   * @param {number} [options.worseningThreshold=5]    Absolute score delta → WORSENING
   * @param {number} [options.strongChange=20]
   * @param {number} [options.moderateChange=10]
   * @param {number} [options.maxHistoryLength=500]
   * @param {object} [options.logger]
   */
  constructor({
    rules = null,
    minSnapshots = null,
    trendWindow = null,
    improvementThreshold = null,
    worseningThreshold = null,
    strongChange = null,
    moderateChange = null,
    maxHistoryLength = null,
    logger = console,
  } = {}) {
    this.logger = logger;
    this.rules = rules || new RiskRules({ logger });

    // Prefer SSOT if present under a future `trend` domain; fall back to sensible defaults
    const cfg = this.rules.getThresholds('trend') || {};

    this.minSnapshots = this._posInt(
      minSnapshots ?? cfg.minSnapshots,
      3
    );
    this.trendWindow = this._posInt(
      trendWindow ?? cfg.trendWindow,
      5
    );
    this.improvementThreshold = this._finite(
      improvementThreshold ?? cfg.improvementThreshold,
      -5
    );
    this.worseningThreshold = this._finite(
      worseningThreshold ?? cfg.worseningThreshold,
      5
    );
    this.strongChange = this._posNum(
      strongChange ?? cfg.strongChange,
      20
    );
    this.moderateChange = this._posNum(
      moderateChange ?? cfg.moderateChange,
      10
    );
    this.maxHistoryLength = this._posInt(
      maxHistoryLength ?? cfg.maxHistoryLength,
      500
    );

    // Direction constants (prefer contracts, fall back)
    this.DIRECTIONS = TREND_DIRECTIONS || TREND || {
      IMPROVING: 'IMPROVING',
      WORSENING: 'WORSENING',
      STABLE: 'STABLE',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze trend for a single risk.
   *
   * @param {object} params
   * @param {Array<{score:number, timestamp?:string|number|Date, detectedAt?:string|number|Date}>} [params.history]
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
          `[RiskTrendAnalyzer] truncating history ${snapshots.length} → ${this.maxHistoryLength}`
        );
        snapshots = snapshots.slice(-this.maxHistoryLength);
      }

      // Sanitize scores first so invalid types (e.g. Symbol) surface as CALCULATION_ERROR
      const scores = snapshots.map((s) => this._safeNumber(s && s.score));

      if (snapshots.length < this.minSnapshots) {
        return Object.freeze({
          available: false,
          reason: 'INSUFFICIENT_HISTORY',
          direction: 'UNKNOWN',
          strength: 'UNKNOWN',
          score: 0,
          message: `Need ${this.minSnapshots} snapshots. Have ${snapshots.length}`,
          riskId,
          riskType,
          meta: Object.freeze({
            calculator: 'RiskTrendAnalyzer',
            version: RiskTrendAnalyzer.VERSION,
          }),
        });
      }
      const currentScore = scores[scores.length - 1];
      const previousScore =
        scores.length > 1 ? scores[scores.length - 2] : currentScore;
      const firstScore = scores[0];

      const recentChange = this._percentChange(previousScore, currentScore);
      const totalChange = this._percentChange(firstScore, currentScore);

      const direction = this._determineDirection(scores);
      const strength = this._determineStrength(scores, direction);
      const trendScore = this._calculateTrendScore(scores);
      const message = this._generateMessage(
        direction,
        strength,
        recentChange,
        totalChange
      );

      return Object.freeze({
        available: true,
        direction,
        strength,
        score: trendScore,
        recentChange,
        totalChange,
        currentScore: Number(currentScore.toFixed(2)),
        previousScore: Number(previousScore.toFixed(2)),
        firstScore: Number(firstScore.toFixed(2)),
        snapshotsCount: snapshots.length,
        riskId,
        riskType,
        message,
        data: Object.freeze(
          snapshots.map((s, i) =>
            Object.freeze({
              index: i,
              score: this._safeNumber(s.score),
              timestamp: s.timestamp || s.detectedAt || s.date || null,
            })
          )
        ),
        meta: Object.freeze({
          calculator: 'RiskTrendAnalyzer',
          version: RiskTrendAnalyzer.VERSION,
        }),
      });
    } catch (error) {
      this.logger.error?.('[RiskTrendAnalyzer] analyze failed', {
        riskId,
        error: error?.message,
      });
      return Object.freeze({
        available: false,
        reason: 'CALCULATION_ERROR',
        direction: 'UNKNOWN',
        strength: 'UNKNOWN',
        score: 0,
        message: 'Trend analysis failed',
        riskId,
        riskType,
        meta: Object.freeze({
          error: true,
          calculator: 'RiskTrendAnalyzer',
          version: RiskTrendAnalyzer.VERSION,
        }),
      });
    }
  }

  /**
   * Analyze trends for multiple risks.
   * @param {Array<object>} risks
   * @returns {Readonly<object>}
   */
  analyzeMultiple(risks = []) {
    try {
      const list = this._safeArray(risks);
      const results = {};
      const directions = {};

      for (const risk of list) {
        if (!risk || typeof risk !== 'object') continue;
        const result = this.analyze({
          history: risk.history || [],
          riskId: risk.id || risk.riskId || 'unknown',
          riskType: risk.type || risk.riskType || 'unknown',
        });
        const key = risk.id || risk.riskId || risk.type || `risk_${Object.keys(results).length}`;
        results[key] = result;
        directions[key] = result.direction;
      }

      const values = Object.values(directions);
      const counts = {
        improving: values.filter((d) => d === 'IMPROVING').length,
        worsening: values.filter((d) => d === 'WORSENING').length,
        stable: values.filter((d) => d === 'STABLE').length,
      };

      let overallDirection = 'STABLE';
      if (
        counts.improving > counts.worsening &&
        counts.improving > counts.stable
      ) {
        overallDirection = 'IMPROVING';
      } else if (
        counts.worsening > counts.improving &&
        counts.worsening > counts.stable
      ) {
        overallDirection = 'WORSENING';
      }

      return Object.freeze({
        results: Object.freeze(results),
        summary: Object.freeze({
          ...counts,
          total: Object.keys(results).length,
          overallDirection,
          message: `Overall risk trend: ${overallDirection} (${counts.improving} improving, ${counts.worsening} worsening, ${counts.stable} stable)`,
        }),
        meta: Object.freeze({
          calculator: 'RiskTrendAnalyzer',
          version: RiskTrendAnalyzer.VERSION,
        }),
      });
    } catch (error) {
      this.logger.error?.('[RiskTrendAnalyzer] analyzeMultiple failed', {
        error: error?.message,
      });
      return Object.freeze({
        results: Object.freeze({}),
        summary: Object.freeze({
          improving: 0,
          worsening: 0,
          stable: 0,
          total: 0,
          overallDirection: 'UNKNOWN',
        }),
        meta: Object.freeze({
          error: true,
          calculator: 'RiskTrendAnalyzer',
          version: RiskTrendAnalyzer.VERSION,
        }),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────────────────────────

  _determineDirection(scores) {
    if (scores.length < 2) return 'STABLE';

    const current = scores[scores.length - 1];
    const previous = scores[scores.length - 2];
    const absChange = current - previous;

    if (absChange <= this.improvementThreshold) return 'IMPROVING';
    if (absChange >= this.worseningThreshold) return 'WORSENING';

    // Longer-horizon check when recent step is within stable band
    if (scores.length >= this.minSnapshots) {
      // Prefer windowed view for noisy series
      const window = scores.slice(-Math.min(this.trendWindow, scores.length));
      const first = window[0];
      const last = window[window.length - 1];
      const totalAbsChange = last - first;
      if (Math.abs(totalAbsChange) > 10) {
        return totalAbsChange < 0 ? 'IMPROVING' : 'WORSENING';
      }
    }

    return 'STABLE';
  }

  _determineStrength(scores, direction) {
    if (scores.length < this.minSnapshots || direction === 'STABLE') {
      return 'WEAK';
    }
    const first = scores[0];
    const last = scores[scores.length - 1];
    const totalAbsChange = Math.abs(last - first);

    if (totalAbsChange > this.strongChange) return 'STRONG';
    if (totalAbsChange > this.moderateChange) return 'MODERATE';
    return 'WEAK';
  }

  /**
   * Trend score [0–100]. 50 = stable, <50 improving, >50 worsening.
   * Soft-capped so strong trends stay inside (0, 100) exclusive of the poles
   * when there is real movement (matches unit expectations).
   */
  _calculateTrendScore(scores) {
    if (scores.length < 2) return 50;

    const first = scores[0];
    const last = scores[scores.length - 1];
    const totalAbsChange = Math.abs(last - first);
    const maxChange = Math.max(...scores) - Math.min(...scores);

    let score = 50;
    if (last < first) {
      // Improving: move toward 0 but leave headroom (never exact 0 on real data)
      score = 50 - Math.min(49, totalAbsChange * 1.5);
    } else if (last > first) {
      // Worsening: move toward 100 but leave headroom (never exact 100 on real data)
      score = 50 + Math.min(49, totalAbsChange * 1.5);
    }

    // Mild volatility amplification without collapsing to poles
    if (maxChange > 30) {
      const delta = score - 50;
      score = 50 + delta * 1.15;
    }

    // Clamp to [1, 99] when there was actual movement; allow 50 for flat
    if (totalAbsChange > 0) {
      return Math.max(1, Math.min(99, Math.round(score)));
    }
    return 50;
  }

  _generateMessage(direction, strength, recentChange, totalChange) {
    const directionMap = {
      IMPROVING: 'improving',
      WORSENING: 'worsening',
      STABLE: 'stable',
      UNKNOWN: 'unknown',
    };
    const strengthMap = {
      STRONG: 'strongly',
      MODERATE: 'moderately',
      WEAK: 'slightly',
    };

    let msg = `Risk is ${directionMap[direction] || 'unknown'}`;
    if (direction !== 'STABLE' && direction !== 'UNKNOWN') {
      msg += ` ${strengthMap[strength] || ''}`.trimEnd();
    }
    if (recentChange !== 0 && direction !== 'STABLE') {
      msg += ` (${recentChange > 0 ? '+' : ''}${recentChange.toFixed(1)}% recent)`;
    }
    if (Math.abs(totalChange) > 10) {
      msg += ` overall: ${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}%`;
    }
    return msg;
  }

  _percentChange(from, to) {
    if (from === 0) return 0;
    return Number((((to - from) / from) * 100).toFixed(2));
  }

  _safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  _safeNumber(val) {
    // Number(Symbol) throws – surface as calculation error via caller try/catch
    if (typeof val === 'symbol') {
      throw new TypeError('score must be numeric');
    }
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

  _finite(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }
}

module.exports = RiskTrendAnalyzer;