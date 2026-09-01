// src/application/services/risk/calculators/PayablesRiskCalculator.js
'use strict';

const BaseRiskCalculator = require('./BaseRiskCalculator');
const { RiskContracts, RISK_TYPES } = require('../contracts');

/**
 * PayablesRiskCalculator - Production v1.1.0
 * Detects: overdue AP, payment delays, supplier risk, rapid growth
 */
class PayablesRiskCalculator extends BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.1.0';
  static CALCULATOR_TYPE = RISK_TYPES.PAYABLES;

  async calculate({
    userId,
    businessId,
    payablesData = [],
    agingData = null,
    previousRisk = null,
  }) {
    const startedAt = Date.now();

    try {
      if (!userId || !businessId) {
        throw new Error('userId and businessId are required');
      }

      const values = this._extractValues(payablesData, ['value', 'payables', 'amount']);
      const metrics = this._calculateMetrics(values, agingData);
      const score = this._calculateScore(metrics);

      let risk = RiskContracts.createPayablesRisk({
        score,
        totalPayables: metrics.totalPayables,
        overduePayables: metrics.overduePayables,
        overduePercentage: metrics.overduePercentage,
        status: this._mapToStatus(score, previousRisk),
        previousScore: previousRisk?.score ?? null,
        confidence: this._calculateConfidence(
          values.length,
          metrics.hasAgingData ? 0.15 : 0
        ),
      });

      risk = this._enrichMetrics(risk, {
        payablesGrowth: metrics.payablesGrowth,
        agingBuckets: metrics.agingBuckets,
        dataPoints: values.length,
      });

      if (values.length >= this.config.trendMinPoints) {
        // Rising payables = WORSENING
        risk = this._enrichWithTrend(risk, values, true);
      }

      risk = this._enrichEvidence(risk, this._generateWarnings(metrics));
      risk = this._enrichMeta(risk, {
        userId,
        businessId,
        durationMs: Date.now() - startedAt,
      });

      this.logger.debug?.(`[PayablesRisk] ${risk.id} → ${score} (${Date.now() - startedAt}ms)`);
      return risk;
    } catch (error) {
      this.logger.error?.('[PayablesRisk] failed', { error: error.message, userId, businessId });
      return this._createFallbackRisk({
        type: RISK_TYPES.PAYABLES,
        title: 'Payables Risk Assessment Failed',
        userId,
        businessId,
        error,
      });
    }
  }

  // Support invert flag for trend
  _enrichWithTrend(risk, values, invert = false) {
    if (values.length < this.config.trendMinPoints) return risk;
    const trend = this.trendAnalyzer.analyze(values);
    if (!trend?.available) return risk;

    const direction = this._mapTrendDirection(trend, invert);

    return Object.freeze({
      ...risk,
      trend: Object.freeze({
        ...risk.trend,
        direction,
        slope: trend.slope,
        strength: trend.strength,
      }),
      metrics: Object.freeze({
        ...risk.metrics,
        trendSlope: trend.slope,
        trendStrength: trend.strength,
      }),
    });
  }

  _calculateMetrics(values, agingData) {
    const dataPoints = values.length;
    const totalPayables = dataPoints > 0 ? values[dataPoints - 1] : 0;
    const previousPayables = dataPoints > 1 ? values[dataPoints - 2] : 0;

    const payablesGrowth = previousPayables > 0
      ? ((totalPayables - previousPayables) / previousPayables) * 100
      : (totalPayables > 0 ? 100 : 0);

    let overduePayables = 0;
    let overduePercentage = 0;
    let agingBuckets = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      daysOver90: 0,
    };
    let hasAgingData = false;

    if (agingData && typeof agingData === 'object') {
      hasAgingData = true;
      agingBuckets = {
        current: this._safeNumber(agingData.current),
        days1to30: this._safeNumber(agingData.days1to30),
        days31to60: this._safeNumber(agingData.days31to60),
        days61to90: this._safeNumber(agingData.days61to90),
        daysOver90: this._safeNumber(agingData.daysOver90),
      };
      overduePayables =
        agingBuckets.days1to30 +
        agingBuckets.days31to60 +
        agingBuckets.days61to90 +
        agingBuckets.daysOver90;

      const total = Object.values(agingBuckets).reduce((a, b) => a + b, 0);
      overduePercentage = total > 0 ? (overduePayables / total) * 100 : 0;
    }

    return {
      totalPayables,
      previousPayables,
      payablesGrowth,
      overduePayables,
      overduePercentage,
      agingBuckets,
      hasAgingData,
      dataPoints,
    };
  }

  _calculateScore(metrics) {
    let score = 0;

    // Overdue % (40%)
    if (metrics.overduePercentage > 60) score += 40;
    else if (metrics.overduePercentage > 40) score += 30;
    else if (metrics.overduePercentage > 25) score += 20;
    else if (metrics.overduePercentage > 10) score += 10;

    // Absolute overdue (20%)
    if (metrics.overduePayables > 1_000_000) score += 20;
    else if (metrics.overduePayables > 500_000) score += 12;
    else if (metrics.overduePayables > 100_000) score += 6;

    // Growth (20%)
    if (metrics.payablesGrowth > 30) score += 20;
    else if (metrics.payablesGrowth > 20) score += 12;
    else if (metrics.payablesGrowth > 10) score += 6;

    // Data quality (20%)
    if (metrics.dataPoints < 3) score += 20;
    else if (metrics.dataPoints < 6) score += 10;

    return this._clamp(score, 0, 100);
  }

  _generateWarnings(metrics) {
    const warnings = [];

    if (metrics.overduePercentage > 60) {
      warnings.push(`🔴 Critical: ${metrics.overduePercentage.toFixed(1)}% of payables overdue`);
    } else if (metrics.overduePercentage > 40) {
      warnings.push(`⚠️ High: ${metrics.overduePercentage.toFixed(1)}% of payables overdue`);
    } else if (metrics.overduePercentage > 25) {
      warnings.push(`📊 ${metrics.overduePercentage.toFixed(1)}% of payables overdue`);
    }

    if (metrics.overduePayables > 1_000_000) {
      warnings.push(`⚠️ Large overdue balance: ₦${metrics.overduePayables.toLocaleString('en-NG')}`);
    }

    if (metrics.payablesGrowth > 30) {
      warnings.push(`📈 Payables grew ${metrics.payablesGrowth.toFixed(1)}% vs last period`);
    }

    if (metrics.dataPoints < 3) {
      warnings.push('⚠️ Insufficient data for reliable payables assessment');
    }

    return warnings;
  }
}

module.exports = PayablesRiskCalculator;