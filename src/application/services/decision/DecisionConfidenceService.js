'use strict';

/**
 * DecisionConfidenceService
 * Data-quality → confidence score (0–100) with full audit trail.
 * SSOT: DecisionContracts.Validators
 * @version 1.2.0-prod
 */

const { Validators } = require('./contracts/DecisionContracts');

const CONFIDENCE_LEVELS = Object.freeze({
  VERY_HIGH: Object.freeze({ min: 90, label: 'VERY_HIGH' }),
  HIGH: Object.freeze({ min: 75, label: 'HIGH' }),
  MODERATE: Object.freeze({ min: 60, label: 'MODERATE' }),
  LOW: Object.freeze({ min: 40, label: 'LOW' }),
  VERY_LOW: Object.freeze({ min: 0, label: 'VERY_LOW' }),
});

const CONFIDENCE_MESSAGES = Object.freeze({
  VERY_HIGH: 'High confidence — based on reliable, recent, and complete data.',
  HIGH: 'Good confidence — data appears reliable.',
  MODERATE: 'Moderate confidence — consider verifying key assumptions.',
  LOW: 'Low confidence — limited or unreliable data.',
  VERY_LOW: 'Very low confidence — should not be used for decisions.',
});

const CONFIDENCE_EMOJI = Object.freeze({
  VERY_HIGH: '✅',
  HIGH: '✅',
  MODERATE: '📊',
  LOW: '⚠️',
  VERY_LOW: '❌',
});

const DATA_SOURCE_PENALTIES = Object.freeze({
  verified: 0,
  system: -5,
  user_input: -10,
  estimate: -15,
  unknown: -20,
});

const DEFAULTS = Object.freeze({
  baseConfidence: 70,
  sufficientThreshold: 60,
  minTransactions: Object.freeze({ critical: 3, low: 10, moderate: 25 }),
  minSampleSize: Object.freeze({ critical: 5, moderate: 15 }),
  maxRecencyDays: Object.freeze({ severe: 30, warning: 14, moderate: 7 }),
});

class DecisionConfidenceService {
  /**
   * @param {object} [options]
   * @param {number} [options.baseConfidence]
   * @param {number} [options.sufficientThreshold]
   * @param {object} [options.logger]
   */
  constructor(options = {}) {
    this.baseConfidence = this._clamp(
      Number(options.baseConfidence) || DEFAULTS.baseConfidence,
      0,
      100
    );
    this.sufficientThreshold = this._clamp(
      Number(options.sufficientThreshold) || DEFAULTS.sufficientThreshold,
      0,
      100
    );
    this.logger = options.logger || console;
  }

  /**
   * @param {object} [data]
   * @param {object} [options]
   * @returns {{ score: number, level: string, penalties: Array, breakdown: object, isSufficient: boolean, message: string, emoji: string }}
   */
  calculate(data = {}, options = {}) {
    let score = this.baseConfidence;
    const penalties = [];
    const breakdown = {};

    // 1. Recency
    if (data.lastUpdated!= null) {
      const daysAgo = this._getDaysAgo(data.lastUpdated);
      if (daysAgo > DEFAULTS.maxRecencyDays.severe) {
        score -= 20;
        penalties.push({
          code: 'data_stale',
          impact: -20,
          detail: `${Math.round(daysAgo)} days old`,
        });
      } else if (daysAgo > DEFAULTS.maxRecencyDays.warning) {
        score -= 10;
        penalties.push({
          code: 'data_aging',
          impact: -10,
          detail: `${Math.round(daysAgo)} days old`,
        });
      } else if (daysAgo > DEFAULTS.maxRecencyDays.moderate) {
        score -= 5;
        penalties.push({
          code: 'data_moderately_old',
          impact: -5,
          detail: `${Math.round(daysAgo)} days old`,
        });
      }
      breakdown.recencyDays = Math.round(daysAgo);
    }

    // 2. Transaction volume
    if (typeof data.transactionCount === 'number' && Number.isFinite(data.transactionCount)) {
      const tc = data.transactionCount;
      if (tc < DEFAULTS.minTransactions.critical) {
        score -= 15;
        penalties.push({
          code: 'insufficient_transactions',
          impact: -15,
          detail: `${tc} transactions`,
        });
      } else if (tc < DEFAULTS.minTransactions.low) {
        score -= 5;
        penalties.push({
          code: 'low_transaction_volume',
          impact: -5,
          detail: `${tc} transactions`,
        });
      } else if (tc < DEFAULTS.minTransactions.moderate) {
        score -= 2;
      }
      breakdown.transactionCount = tc;
    }

    // 3. Historical variance
    if (typeof data.historicalVariance === 'number' && Number.isFinite(data.historicalVariance)) {
      if (data.historicalVariance > 0.5) {
        score -= 10;
        penalties.push({ code: 'high_variance', impact: -10 });
      } else if (data.historicalVariance > 0.3) {
        score -= 5;
        penalties.push({ code: 'moderate_variance', impact: -5 });
      }
      breakdown.historicalVariance = data.historicalVariance;
    }

    // 4. Completeness
    const requiredFields = Array.isArray(options.requiredFields)? options.requiredFields : [];
    if (requiredFields.length > 0) {
      const missingFields = requiredFields.filter(
        (field) => data[field] === undefined || data[field] === null
      );
      if (missingFields.length > 0) {
        const penalty = Math.round((missingFields.length / requiredFields.length) * 25);
        score -= penalty;
        penalties.push({
          code: 'incomplete_data',
          impact: -penalty,
          detail: missingFields,
        });
      }
      breakdown.completeness = `${requiredFields.length - missingFields.length}/${requiredFields.length}`;
    }

    // 5. Forecast vs actual
    if (options.isForecast || data.isForecast) {
      score -= 10;
      penalties.push({ code: 'forecast_based', impact: -10 });
      breakdown.dataType = 'forecast';
    } else {
      breakdown.dataType = 'actual';
    }

    // 6. Data source
    if (data.dataSource!= null) {
      const key = String(data.dataSource);
      const penalty =
        Object.prototype.hasOwnProperty.call(DATA_SOURCE_PENALTIES, key)
         ? DATA_SOURCE_PENALTIES[key]
          : DATA_SOURCE_PENALTIES.unknown;
      score += penalty;
      if (penalty!== 0) {
        penalties.push({ code: `source_${key}`, impact: penalty });
      }
      breakdown.dataSource = key;
    }

    // 7. Sample size
    if (typeof data.sampleSize === 'number' && Number.isFinite(data.sampleSize)) {
      if (data.sampleSize < DEFAULTS.minSampleSize.critical) {
        score -= 10;
        penalties.push({
          code: 'small_sample',
          impact: -10,
          detail: `n=${data.sampleSize}`,
        });
      } else if (data.sampleSize < DEFAULTS.minSampleSize.moderate) {
        score -= 5;
        penalties.push({
          code: 'moderate_sample',
          impact: -5,
          detail: `n=${data.sampleSize}`,
        });
      }
      breakdown.sampleSize = data.sampleSize;
    }

    // 8. Trend consistency
    if (typeof data.trendConsistency === 'number' && Number.isFinite(data.trendConsistency)) {
      if (data.trendConsistency < 0.6) {
        score -= 10;
        penalties.push({ code: 'inconsistent_trend', impact: -10 });
      } else if (data.trendConsistency < 0.8) {
        score -= 5;
        penalties.push({ code: 'moderate_trend_consistency', impact: -5 });
      }
      breakdown.trendConsistency = data.trendConsistency;
    }

    score = this._clamp(Math.round(score), 0, 100);
    const level = this.getLevel(score);

    return Object.freeze({
      score,
      level,
      penalties: Object.freeze(penalties.map((p) => Object.freeze({...p }))),
      breakdown: Object.freeze({...breakdown }),
      isSufficient: score >= this.sufficientThreshold,
      message: CONFIDENCE_MESSAGES[level],
      emoji: CONFIDENCE_EMOJI[level],
    });
  }

  getLevel(score) {
    const s = this._clamp(Number(score) || 0, 0, 100);
    if (s >= CONFIDENCE_LEVELS.VERY_HIGH.min) return CONFIDENCE_LEVELS.VERY_HIGH.label;
    if (s >= CONFIDENCE_LEVELS.HIGH.min) return CONFIDENCE_LEVELS.HIGH.label;
    if (s >= CONFIDENCE_LEVELS.MODERATE.min) return CONFIDENCE_LEVELS.MODERATE.label;
    if (s >= CONFIDENCE_LEVELS.LOW.min) return CONFIDENCE_LEVELS.LOW.label;
    return CONFIDENCE_LEVELS.VERY_LOW.label;
  }

  isSufficient(score, threshold = this.sufficientThreshold) {
    const s = Number(score);
    const t = Number(threshold);
    return Validators.isValidConfidence(s) && s >= t;
  }

  toDisplay(data = {}, options = {}) {
    const result = this.calculate(data, options);
    return Object.freeze({
      score: result.score,
      level: result.level,
      emoji: result.emoji,
      message: result.message,
      isSufficient: result.isSufficient,
      penalties: result.penalties,
    });
  }

  _getDaysAgo(date) {
    if (date == null) return 999;
    const d = typeof date === 'string' || typeof date === 'number'? new Date(date) : date;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return 999;
    return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  }

  _clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
}

module.exports = DecisionConfidenceService;