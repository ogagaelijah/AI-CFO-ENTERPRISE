'use strict';

const BaseRiskCalculator = require('./BaseRiskCalculator');
const { RiskContracts, RISK_TYPES } = require('../contracts');

/**
 * RevenueRiskCalculator - Production v1.1.0
 * Detects: decline, stagnation, volatility, data quality
 */
class RevenueRiskCalculator extends BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.1.0';
  static CALCULATOR_TYPE = RISK_TYPES.REVENUE;

  async calculate({
    userId,
    businessId,
    revenueData = [],
    previousRisk = null,
    options = {},
  }) {
    const startedAt = Date.now();

    try {
      if (!userId || !businessId) {
        throw new Error('userId and businessId are required');
      }

      const values = this._extractValues(revenueData, ['value', 'revenue', 'amount']);
      const metrics = this._calculateMetrics(values);
      const score = this._calculateScore(metrics);

      let risk = RiskContracts.createRevenueRisk({
        score,
        currentRevenue: metrics.currentRevenue,
        previousRevenue: metrics.previousRevenue,
        revenueGrowth: metrics.revenueGrowth,
        status: this._mapToStatus(score, previousRisk),
        previousScore: previousRisk?.score ?? null,
        confidence: this._calculateConfidence(values.length, metrics.revenueVolatility < 0.25 ? 0.08 : 0),
      });

      // Enrich
      risk = this._enrichMetrics(risk, {
        revenueVolatility: metrics.revenueVolatility,
        revenueStability: metrics.revenueStability,
        averageRevenue: metrics.averageRevenue,
        dataPoints: values.length,
      });

      if (values.length >= this.config.trendMinPoints) {
        risk = this._enrichWithTrend(risk, values); // rising revenue = IMPROVING
      }

      const warnings = this._generateWarnings(metrics);
      risk = this._enrichWarnings(risk, warnings);
      risk = this._enrichEvidence(risk, warnings);

      risk = this._enrichMeta(risk, {
        userId,
        businessId,
        durationMs: Date.now() - startedAt,
      });

      this.logger.debug?.(`[RevenueRisk] ${risk.id} → ${score} (${Date.now() - startedAt}ms)`);
      return risk;
    } catch (error) {
      this.logger.error?.('[RevenueRisk] calculate failed', { error: error.message, userId, businessId });
      return this._createFallbackRisk({
        type: RISK_TYPES.REVENUE,
        title: 'Revenue Risk Assessment Failed',
        userId,
        businessId,
        error,
      });
    }
  }

  _calculateMetrics(values) {
    const dataPoints = values.length;
    const currentRevenue = dataPoints > 0 ? values[dataPoints - 1] : 0;
    const previousRevenue = dataPoints > 1 ? values[dataPoints - 2] : 0;

    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : (currentRevenue > 0 ? 100 : 0);

    const volatility = this.volatilityAnalyzer.analyze(values);
    const revenueVolatility = volatility?.available ? this._safeNumber(volatility.volatility) : 0;
    const revenueStability = volatility?.available ? this._safeNumber(volatility.stability) : 50;

    const averageRevenue = dataPoints > 0
      ? values.reduce((a, b) => a + b, 0) / dataPoints
      : 0;

    return {
      currentRevenue,
      previousRevenue,
      revenueGrowth,
      revenueVolatility,
      revenueStability,
      averageRevenue,
      dataPoints,
    };
  }

  _calculateScore(metrics) {
    let score = 0;

    // Growth (40%)
    if (metrics.revenueGrowth < -30) score += 40;
    else if (metrics.revenueGrowth < -15) score += 30;
    else if (metrics.revenueGrowth < -5) score += 20;
    else if (metrics.revenueGrowth < 0) score += 10;
    else if (metrics.revenueGrowth < 3) score += 5; // stagnation

    // Absolute level (20%)
    if (metrics.currentRevenue <= 0) score += 20;
    else if (metrics.currentRevenue < 100_000) score += 10;

    // Volatility (20%)
    if (metrics.revenueVolatility > 0.5) score += 20;
    else if (metrics.revenueVolatility > 0.3) score += 12;
    else if (metrics.revenueVolatility > 0.15) score += 6;

    // Data quality (20%)
    if (metrics.dataPoints < 3) score += 20;
    else if (metrics.dataPoints < 6) score += 10;

    return this._clamp(score, 0, 100);
  }

  _generateWarnings(metrics) {
    const warnings = [];

    if (metrics.revenueGrowth < -20) {
      warnings.push(`🔴 Revenue declined ${Math.abs(metrics.revenueGrowth).toFixed(1)}% — critical drop`);
    } else if (metrics.revenueGrowth < -10) {
      warnings.push(`📉 Revenue declined ${Math.abs(metrics.revenueGrowth).toFixed(1)}%`);
    } else if (metrics.revenueGrowth >= 0 && metrics.revenueGrowth < 3) {
      warnings.push('📊 Revenue stagnation detected (growth < 3%)');
    }

    if (metrics.revenueVolatility > 0.5) {
      warnings.push('📊 High revenue volatility detected');
    }
    if (metrics.dataPoints < 3) {
      warnings.push('⚠️ Insufficient data points for reliable assessment');
    }
    if (metrics.currentRevenue <= 0) {
      warnings.push('🔴 No revenue recorded in current period');
    }

    return warnings;
  }
}

module.exports = RevenueRiskCalculator;