'use strict';

/**
 * DecisionPriorityService
 * @version 1.2.2-prod
 */

const {
  DECISION_PRIORITY,
  PRIORITY_ORDER,
  PRIORITY_EXPIRY_DAYS,
  PRIORITY_EMOJI,
  DECISION_TIMEFRAME,
  DECISION_SEVERITY,
  DECISION_ENTITY,
  Validators,
} = require('./contracts/DecisionContracts');

const DEFAULT_WEIGHTS = Object.freeze({
  impact: 0.35,
  urgency: 0.3,
  confidence: 0.2,
  relevance: 0.15,
});

const PRIORITY_THRESHOLDS = Object.freeze({
  [DECISION_PRIORITY.CRITICAL]: 85,
  [DECISION_PRIORITY.HIGH]: 70,
  [DECISION_PRIORITY.MEDIUM]: 50,
  [DECISION_PRIORITY.LOW]: 0,
});

const TIMEFRAME_URGENCY = Object.freeze({
  [DECISION_TIMEFRAME.IMMEDIATE]: 95,
  [DECISION_TIMEFRAME.SHORT_TERM]: 80,
  [DECISION_TIMEFRAME.MEDIUM_TERM]: 60,
  [DECISION_TIMEFRAME.LONG_TERM]: 30,
});

const SEVERITY_MULTIPLIER = Object.freeze({
  [DECISION_SEVERITY.CRITICAL]: 1.4,
  [DECISION_SEVERITY.WARNING]: 1.2,
  [DECISION_SEVERITY.INFO]: 1.0,
  [DECISION_SEVERITY.OPPORTUNITY]: 0.8,
});

const IMPACT_BANDS = Object.freeze([
  Object.freeze({ ratio: 0.5, score: 95 }),
  Object.freeze({ ratio: 0.2, score: 80 }),
  Object.freeze({ ratio: 0.1, score: 70 }),
  Object.freeze({ ratio: 0.05, score: 60 }),
  Object.freeze({ ratio: 0.02, score: 50 }),
  Object.freeze({ ratio: 0.01, score: 40 }),
  Object.freeze({ ratio: 0.0, score: 30 }),
]);

const DEFAULT_BUSINESS_SIZE = 10_000_000;

class DecisionPriorityService {
  constructor(options = {}) {
    this.weights = Object.freeze({
      ...DEFAULT_WEIGHTS,
      ...(options.weights && typeof options.weights === 'object' ? options.weights : {}),
    });
    this.defaultBusinessSize =
      Number(options.defaultBusinessSize) > 0
        ? Number(options.defaultBusinessSize)
        : DEFAULT_BUSINESS_SIZE;
    this.logger = options.logger || console;
  }

  calculate({
    impactScore,
    urgencyScore,
    confidence,
    relevanceScore = 80,
    weights = {},
  } = {}) {
    const w = {
      ...this.weights,
      ...(weights && typeof weights === 'object' ? weights : {}),
    };

    const impact = this.clamp(this._toNumber(impactScore, 50), 0, 100);
    const urgency = this.clamp(this._toNumber(urgencyScore, 50), 0, 100);
    const conf = this.clamp(this._toNumber(confidence, 50), 0, 100);
    const relevance = this.clamp(this._toNumber(relevanceScore, 80), 0, 100);

    const score = Math.round(
      impact * w.impact +
        urgency * w.urgency +
        conf * w.confidence +
        relevance * w.relevance
    );

    const priority = this.scoreToPriority(score);

    return {
      priority,
      score,
      breakdown: { impact, urgency, confidence: conf, relevance, weights: w },
      label: this.getPriorityLabel(priority),
      emoji: this.getPriorityEmoji(priority),
      expiryDays: this.getExpiryDays(priority),
    };
  }

  scoreToPriority(score) {
    const s = this.clamp(this._toNumber(score, 0), 0, 100);
    if (s >= PRIORITY_THRESHOLDS[DECISION_PRIORITY.CRITICAL]) return DECISION_PRIORITY.CRITICAL;
    if (s >= PRIORITY_THRESHOLDS[DECISION_PRIORITY.HIGH]) return DECISION_PRIORITY.HIGH;
    if (s >= PRIORITY_THRESHOLDS[DECISION_PRIORITY.MEDIUM]) return DECISION_PRIORITY.MEDIUM;
    return DECISION_PRIORITY.LOW;
  }

  calculateUrgency(timeframe, severity) {
    const tf = Validators.isValidTimeframe(timeframe)
      ? timeframe
      : DECISION_TIMEFRAME.MEDIUM_TERM;
    const sev = Validators.isValidSeverity(severity)
      ? severity
      : DECISION_SEVERITY.WARNING;

    const base = TIMEFRAME_URGENCY[tf] ?? 60;
    const mult = SEVERITY_MULTIPLIER[sev] ?? 1;
    return this.clamp(Math.round(base * mult), 0, 100);
  }

  /**
   * @param {number|object} financialImpactOrOpts
   * @param {number} [businessSize]
   * @param {object} [options] e.g. { minImpact: 5000 }
   */
  calculateImpact(financialImpactOrOpts, businessSize, options = {}) {
    let impactRaw;
    let size = businessSize;
    let opts = options && typeof options === 'object' ? { ...options } : {};

    if (
      financialImpactOrOpts != null &&
      typeof financialImpactOrOpts === 'object' &&
      !Array.isArray(financialImpactOrOpts)
    ) {
      impactRaw =
        financialImpactOrOpts.estimatedFinancialImpact ??
        financialImpactOrOpts.financialImpact ??
        financialImpactOrOpts.impact ??
        0;
      if (size == null) {
        size =
          financialImpactOrOpts.businessSize ??
          financialImpactOrOpts.business_size ??
          this.defaultBusinessSize;
      }
      if (financialImpactOrOpts.minImpact != null) {
        opts.minImpact = financialImpactOrOpts.minImpact;
      }
    } else {
      impactRaw = financialImpactOrOpts;
    }

    const impact = Math.abs(this._toNumber(impactRaw, 0));
    const bizSize = this._toNumber(size, this.defaultBusinessSize);
    const minImpact = this._toNumber(opts.minImpact, 0);

    if (impact <= 0 || bizSize <= 0) return 0;
    if (minImpact > 0 && impact < minImpact) return 0;

    const impactRatio = impact / bizSize;

    // Inclusive lower bound: 1% of business (0.01) → 40, not 30
    for (const band of IMPACT_BANDS) {
      if (band.ratio > 0 && impactRatio >= band.ratio) return band.score;
    }
    if (impactRatio > 0) return 30;
    return 0;
  }

  calculateRelevance(relatedEntity, context = {}) {
    if (!Validators.isValidEntity(relatedEntity)) return 80;

    if (relatedEntity === DECISION_ENTITY.BUSINESS) return 90;

    if (!context || context.focus == null || context.focus === '') return 80;

    const focus = String(context.focus).toLowerCase();
    if (focus === String(relatedEntity).toLowerCase()) return 95;

    return 80;
  }

  getPriorityOrder() {
    return PRIORITY_ORDER;
  }

  sortByPriority(decisions = []) {
    if (!Array.isArray(decisions)) return [];
    return [...decisions].sort((a, b) => {
      const pa = a && a.priority != null ? a.priority : DECISION_PRIORITY.LOW;
      const pb = b && b.priority != null ? b.priority : DECISION_PRIORITY.LOW;
      return (PRIORITY_ORDER[pa] ?? 99) - (PRIORITY_ORDER[pb] ?? 99);
    });
  }

  getPriorityLabel(priority) {
    if (!Validators.isValidPriority(priority)) {
      return priority == null ? 'UNKNOWN' : String(priority);
    }
    const title =
      priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    return `${PRIORITY_EMOJI[priority] || ''} ${title}`.trim();
  }

  getPriorityEmoji(priority) {
    if (!Validators.isValidPriority(priority)) return '⚪';
    return PRIORITY_EMOJI[priority] || '⚪';
  }

  getExpiryDays(priority) {
    if (!Validators.isValidPriority(priority)) {
      return PRIORITY_EXPIRY_DAYS[DECISION_PRIORITY.MEDIUM];
    }
    return PRIORITY_EXPIRY_DAYS[priority];
  }

  clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  _toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
}

module.exports = DecisionPriorityService;