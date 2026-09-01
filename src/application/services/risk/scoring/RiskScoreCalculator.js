// src/application/services/risk/scoring/RiskScoreCalculator.js
'use strict';

/**
 * RiskScoreCalculator - SSOT v1.2.1 / Production v1.1.0
 * Aggregates individual risk contracts into one Business Health Score (0-100)
 */
class RiskScoreCalculator {
  static CALCULATOR_VERSION = '1.1.0';

  static DEFAULT_WEIGHTS = Object.freeze({
    currentCondition: 0.30,
    trend: 0.25,
    financialImpact: 0.20,
    persistence: 0.15,
    forecastImpact: 0.10,
  });

  constructor({ weights = null, logger = console } = {}) {
    this.logger = logger;
    this.weights = Object.freeze({ ...RiskScoreCalculator.DEFAULT_WEIGHTS, ...weights });
    this._validateWeights();
  }

  /**
   * Main entry. Never throws. Always returns a frozen result object.
   * Accepts null / undefined safely.
   */
  calculate(input = {}) {
    const { risks = [], metrics = {}, options = {} } = input || {};
    const startedAt = Date.now();
    const riskItems = this._safeArray(risks);

    try {
      if (riskItems.length === 0) {
        return this._createEmptyScore();
      }

      const components = this._calculateComponents(riskItems, metrics);
      const rawScore = this._calculateWeightedScore(components);
      const overallScore = this._clamp(Math.round(rawScore), 0, 100);

      const riskCounts = this._countRisksByScore(riskItems);
      const breakdown = this._buildBreakdown(riskItems);
      const summary = this._generateSummary(overallScore, riskCounts);

      const result = Object.freeze({
        overallScore,
        businessHealthScore: 100 - overallScore,
        scoreBand: this._getScoreBand(overallScore),
        components: Object.freeze(components),
        riskCounts: Object.freeze(riskCounts),
        breakdown: Object.freeze(breakdown),
        summary,
        totalRisks: riskItems.length,
        meta: Object.freeze({
          calculator: 'RiskScoreCalculator',
          calculatorVersion: RiskScoreCalculator.CALCULATOR_VERSION,
          durationMs: Date.now() - startedAt,
          weights: this.weights,
        }),
      });

      this.logger.debug?.(
        `[RiskScore] ${riskItems.length} risks → ${overallScore} (${result.meta.durationMs}ms)`
      );
      return result;
    } catch (error) {
      this.logger.error?.('[RiskScore] calculate failed', { error: error.message });
      return this._createFallbackScore(error);
    }
  }

  _calculateComponents(risks, metrics) {
    const n = risks.length;

    const avgScore =
      risks.reduce((sum, r) => sum + this._safeNumber(r.score), 0) / n;

    let worsening = 0;
    let improving = 0;
    for (const r of risks) {
      const dir = r.trend?.direction;
      if (dir === 'WORSENING') worsening += 1;
      else if (dir === 'IMPROVING') improving += 1;
    }
    const stable = n - worsening - improving;
    const trendScore = (worsening * 80 + stable * 50 + improving * 20) / n;

    const impactValues = risks
      .map((r) => this._safeNumber(r.impact?.financial))
      .filter((v) => v > 0);
    let financialImpact = 0;
    if (impactValues.length > 0) {
      const maxImpact = Math.max(...impactValues);
      financialImpact = Math.min(100, (maxImpact / 5_000_000) * 100);
    }

    const persistent = risks.filter((r) => this._safeNumber(r.ageInDays) > 30).length;
    const persistence = (persistent / n) * 100;

    const forecastImpact = this._safeNumber(metrics.forecastImpact ?? 30);

    return {
      currentCondition: this._clamp(avgScore, 0, 100),
      trend: this._clamp(trendScore, 0, 100),
      financialImpact: this._clamp(financialImpact, 0, 100),
      persistence: this._clamp(persistence, 0, 100),
      forecastImpact: this._clamp(forecastImpact, 0, 100),
    };
  }

  _calculateWeightedScore(components) {
    const w = this.weights;
    return (
      components.currentCondition * w.currentCondition +
      components.trend * w.trend +
      components.financialImpact * w.financialImpact +
      components.persistence * w.persistence +
      components.forecastImpact * w.forecastImpact
    );
  }

  _countRisksByScore(risks) {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const risk of risks) {
      const s = this._safeNumber(risk.score);
      if (s < 25) counts.low += 1;
      else if (s < 50) counts.medium += 1;
      else if (s < 75) counts.high += 1;
      else counts.critical += 1;
    }
    return counts;
  }

  _buildBreakdown(risks) {
    return risks
      .map((risk) =>
        Object.freeze({
          id: risk.id || null,
          type: risk.type || 'UNKNOWN',
          title: risk.title || risk.type || 'Unknown Risk',
          score: this._safeNumber(risk.score),
          trend: risk.trend?.direction || 'STABLE',
          impact: this._safeNumber(risk.impact?.financial) || null,
        })
      )
      .sort((a, b) => b.score - a.score);
  }

  _generateSummary(score, riskCounts) {
    const band = this._getScoreBand(score).toLowerCase();
    const total =
      riskCounts.low + riskCounts.medium + riskCounts.high + riskCounts.critical;

    let detail = '';
    if (riskCounts.critical > 0) detail = `${riskCounts.critical} critical risk(s)`;
    else if (riskCounts.high > 0) detail = `${riskCounts.high} high risk(s)`;
    else if (riskCounts.medium > 0) detail = `${riskCounts.medium} medium risk(s)`;
    else detail = `${riskCounts.low} low risk(s)`;

    return `Business Health: ${100 - score}/100. Risk Level: ${band}. ${detail} across ${total} area(s)`;
  }

  _getScoreBand(score) {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  _createEmptyScore() {
    return Object.freeze({
      overallScore: 0,
      businessHealthScore: 100,
      scoreBand: 'LOW',
      components: Object.freeze({
        currentCondition: 0,
        trend: 0,
        financialImpact: 0,
        persistence: 0,
        forecastImpact: 0,
      }),
      riskCounts: Object.freeze({ low: 0, medium: 0, high: 0, critical: 0 }),
      breakdown: Object.freeze([]),
      summary: 'No risks detected. Business Health: 100/100',
      totalRisks: 0,
      meta: Object.freeze({
        calculator: 'RiskScoreCalculator',
        calculatorVersion: RiskScoreCalculator.CALCULATOR_VERSION,
      }),
    });
  }

  _createFallbackScore(error) {
    return Object.freeze({
      overallScore: 75,
      businessHealthScore: 25,
      scoreBand: 'HIGH',
      components: Object.freeze({}),
      riskCounts: Object.freeze({ low: 0, medium: 0, high: 0, critical: 0 }),
      breakdown: Object.freeze([]),
      summary: `Risk aggregation failed: ${error?.message || 'Unknown error'}`,
      totalRisks: 0,
      meta: Object.freeze({
        calculator: 'RiskScoreCalculator',
        calculatorVersion: RiskScoreCalculator.CALCULATOR_VERSION,
        error: true,
      }),
    });
  }

  _validateWeights() {
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(`Weights must sum to 1.0. Current sum: ${sum}`);
    }
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

  getWeights() {
    return { ...this.weights };
  }

  setWeights(weights) {
    this.weights = Object.freeze({ ...this.weights, ...weights });
    this._validateWeights();
  }
}

module.exports = RiskScoreCalculator;