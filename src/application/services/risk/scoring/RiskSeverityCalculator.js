// src/application/services/risk/scoring/RiskSeverityCalculator.js
'use strict';

const { RiskContracts } = require('../contracts');

/**
 * RiskSeverityCalculator - SSOT v1.2.1 / Production v1.1.0
 * Derives severity, urgency and escalation flags from score + context.
 */
class RiskSeverityCalculator {
  static CALCULATOR_VERSION = '1.1.0';

  static DEFAULT_THRESHOLDS = Object.freeze({
    LOW_MAX: 24,
    MEDIUM_MAX: 49,
    HIGH_MAX: 74,
    CRITICAL_MAX: 100,
  });

  constructor({ thresholds = null, logger = console } = {}) {
    this.logger = logger;
    this.thresholds = Object.freeze({
      ...RiskSeverityCalculator.DEFAULT_THRESHOLDS,
      ...thresholds,
    });
    this._validateThresholds();
  }

  calculate({
    score,
    trend = 'STABLE',
    impact = null,
    persistence = 0,
    riskId = null,
    riskType = null,
  } = {}) {
    const startedAt = Date.now();

    try {
      const baseScore = this._clamp(this._safeNumber(score), 0, 100);
      const modifiers = this._calculateModifiers({ baseScore, trend, impact, persistence });
      const adjustedScore = this._clamp(baseScore + modifiers.total, 0, 100);
      const severity = this._getSeverityBand(adjustedScore);

      return Object.freeze({
        riskId,
        riskType,
        baseScore: Math.round(baseScore),
        score: Math.round(adjustedScore),
        severity,
        isCritical: severity === 'CRITICAL',
        needsEscalation: this.needsEscalation(severity, trend),
        urgency: this.getUrgency(severity, trend),
        modifiers: Object.freeze({
          trend: modifiers.trend,
          impact: modifiers.impact,
          persistence: modifiers.persistence,
          total: modifiers.total,
        }),
        recommendation: this._getRecommendation(severity, trend),
        ui: Object.freeze({
          label: RiskContracts.getSeverityLabel(severity),
          color: RiskContracts.getSeverityColor(severity),
          icon: RiskContracts.getSeverityIcon(severity),
        }),
        meta: Object.freeze({
          calculator: 'RiskSeverityCalculator',
          calculatorVersion: RiskSeverityCalculator.CALCULATOR_VERSION,
          durationMs: Date.now() - startedAt,
          thresholds: this.thresholds,
        }),
      });
    } catch (error) {
      this.logger.error?.('[RiskSeverity] calculate failed', { error: error.message, score });
      return this._createFallback(score, error);
    }
  }

  calculateMultiple(risks = []) {
    const results = [];
    let maxScore = 0;
    let highestSeverity = 'LOW';

    for (const risk of this._safeArray(risks)) {
      const result = this.calculate({
        score: risk.score,
        trend: risk.trend?.direction || risk.trend || 'STABLE',
        impact: risk.impact?.financial,
        persistence: risk.ageInDays,
        riskId: risk.id,
        riskType: risk.type,
      });
      results.push(result);

      if (result.score > maxScore) {
        maxScore = result.score;
        highestSeverity = result.severity;
      }
    }

    return Object.freeze({
      results: Object.freeze(results),
      maxScore: Math.round(maxScore),
      highestSeverity,
      criticalCount: results.filter((r) => r.severity === 'CRITICAL').length,
      summary: `Highest severity: ${RiskContracts.getSeverityLabel(highestSeverity)} (${Math.round(maxScore)}/100)`,
      meta: Object.freeze({
        total: results.length,
        calculator: 'RiskSeverityCalculator',
        calculatorVersion: RiskSeverityCalculator.CALCULATOR_VERSION,
      }),
    });
  }

  _calculateModifiers({ trend, impact, persistence }) {
    let trendMod = 0;
    if (trend === 'WORSENING') trendMod = 10;
    else if (trend === 'IMPROVING') trendMod = -5;

    const impactMod =
      impact > 0 ? Math.min(20, (this._safeNumber(impact) / 5_000_000) * 20) : 0;

    const persistenceMod = Math.min(10, this._safeNumber(persistence) / 9);

    return {
      trend: trendMod,
      impact: Math.round(impactMod),
      persistence: Math.round(persistenceMod),
      total: trendMod + impactMod + persistenceMod,
    };
  }

  _getSeverityBand(score) {
    const t = this.thresholds;
    if (score <= t.LOW_MAX) return 'LOW';
    if (score <= t.MEDIUM_MAX) return 'MEDIUM';
    if (score <= t.HIGH_MAX) return 'HIGH';
    return 'CRITICAL';
  }

  _getRecommendation(severity, trend) {
    const map = {
      CRITICAL: {
        WORSENING: 'Immediate action required. Critical and worsening. Escalate to CFO/CEO now.',
        STABLE: 'Immediate action required. Critical risk needs urgent mitigation.',
        IMPROVING: 'Critical risk improving. Maintain mitigation and monitor daily.',
      },
      HIGH: {
        WORSENING: 'High risk worsening. Create mitigation plan within 48 hours.',
        STABLE: 'High risk. Implement mitigation measures this week.',
        IMPROVING: 'High risk improving. Continue mitigation and review weekly.',
      },
      MEDIUM: {
        WORSENING: 'Medium risk worsening. Monitor closely and prepare plan.',
        STABLE: 'Medium risk. Review monthly and monitor KPIs.',
        IMPROVING: 'Medium risk improving. Maintain current controls.',
      },
      LOW: {
        WORSENING: 'Low risk worsening. Monitor for escalation.',
        STABLE: 'Low risk. No immediate action required.',
        IMPROVING: 'Low risk improving. Continue current practices.',
      },
    };
    return map[severity]?.[trend] || map.MEDIUM.STABLE;
  }

  needsEscalation(severity, trend) {
    return severity === 'CRITICAL' || (severity === 'HIGH' && trend === 'WORSENING');
  }

  getUrgency(severity, trend) {
    const map = {
      CRITICAL: { WORSENING: 'IMMEDIATE', STABLE: 'URGENT', IMPROVING: 'HIGH' },
      HIGH: { WORSENING: 'URGENT', STABLE: 'HIGH', IMPROVING: 'MEDIUM' },
      MEDIUM: { WORSENING: 'HIGH', STABLE: 'MEDIUM', IMPROVING: 'LOW' },
      LOW: { WORSENING: 'MEDIUM', STABLE: 'LOW', IMPROVING: 'LOW' },
    };
    return map[severity]?.[trend] || 'MEDIUM';
  }

  _validateThresholds() {
    const t = this.thresholds;
    if (!(t.LOW_MAX < t.MEDIUM_MAX && t.MEDIUM_MAX < t.HIGH_MAX && t.HIGH_MAX <= t.CRITICAL_MAX)) {
      throw new Error('Thresholds must be ascending: LOW_MAX < MEDIUM_MAX < HIGH_MAX ≤ CRITICAL_MAX');
    }
  }

  _createFallback(score, error) {
    return Object.freeze({
      baseScore: Math.round(this._safeNumber(score)),
      score: Math.round(this._safeNumber(score)),
      severity: 'HIGH',
      isCritical: false,
      needsEscalation: false,
      urgency: 'HIGH',
      modifiers: Object.freeze({ trend: 0, impact: 0, persistence: 0, total: 0 }),
      recommendation: 'Severity calculation failed. Review risk manually.',
      ui: Object.freeze({
        label: RiskContracts.getSeverityLabel('HIGH'),
        color: RiskContracts.getSeverityColor('HIGH'),
        icon: RiskContracts.getSeverityIcon('HIGH'),
      }),
      meta: Object.freeze({
        calculator: 'RiskSeverityCalculator',
        calculatorVersion: RiskSeverityCalculator.CALCULATOR_VERSION,
        error: true,
        errorMessage: error?.message,
      }),
    });
  }

  _clamp(val, min, max) {
    return Math.min(max, Math.max(min, this._safeNumber(val)));
  }

  _safeNumber(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }

  _safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  setThresholds(thresholds) {
    this.thresholds = Object.freeze({ ...this.thresholds, ...thresholds });
    this._validateThresholds();
  }
}

module.exports = RiskSeverityCalculator;