'use strict';

const BaseRiskCalculator = require('./BaseRiskCalculator');
const { RiskContracts, RISK_TYPES } = require('../contracts');

class ReceivablesRiskCalculator extends BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.1.0';
  static CALCULATOR_TYPE = RISK_TYPES.RECEIVABLES;

  async calculate({
    userId,
    businessId,
    receivablesData = [],
    agingData = null,
    previousRisk = null,
  }) {
    const startedAt = Date.now();

    try {
      if (!userId || !businessId) throw new Error('userId and businessId are required');

      const values = this._extractValues(receivablesData, ['value', 'receivables', 'amount']);
      const metrics = this._calculateMetrics(values, agingData);
      const score = this._calculateScore(metrics);

      let risk = RiskContracts.createReceivablesRisk({
        score,
        totalReceivables: metrics.totalReceivables,
        overdueReceivables: metrics.overdueReceivables,
        overduePercentage: metrics.overduePercentage,
        status: this._mapToStatus(score, previousRisk),
        previousScore: previousRisk?.score ?? null,
        confidence: this._calculateConfidence(
          values.length,
          metrics.hasAgingData ? 0.15 : 0
        ),
      });

      risk = this._enrichMetrics(risk, {
        receivablesGrowth: metrics.receivablesGrowth,
        collectionRate: metrics.collectionRate,
        agingBuckets: metrics.agingBuckets,
        dataPoints: values.length,
      });

      if (values.length >= this.config.trendMinPoints) {
        // Rising receivables = WORSENING
        risk = this._enrichWithTrend(risk, values, true);
      }

      const warnings = this._generateWarnings(metrics);
      risk = this._enrichWarnings(risk, warnings);
      risk = this._enrichEvidence(risk, warnings);

      risk = this._enrichMeta(risk, {
        userId,
        businessId,
        durationMs: Date.now() - startedAt,
      });

      this.logger.debug?.(`[ReceivablesRisk] ${risk.id} → ${score} (${Date.now() - startedAt}ms)`);
      return risk;
    } catch (error) {
      this.logger.error?.('[ReceivablesRisk] failed', { error: error.message, userId, businessId });
      return this._createFallbackRisk({
        type: RISK_TYPES.RECEIVABLES,
        title: 'Receivables Risk Assessment Failed',
        userId,
        businessId,
        error,
      });
    }
  }

  // Override to support invert flag
  _enrichWithTrend(risk, values, invert = false) {
    if (values.length < this.config.trendMinPoints) return risk;
    const trend = this.trendAnalyzer.analyze(values);
    if (!trend?.available) return risk;

    const direction = this._mapTrendDirection(trend, invert);

    return Object.freeze({
      ...risk,
      trend: Object.freeze({ ...risk.trend, direction, slope: trend.slope, strength: trend.strength }),
      metrics: Object.freeze({
        ...risk.metrics,
        trendSlope: trend.slope,
        trendStrength: trend.strength,
      }),
    });
  }

  _calculateMetrics(values, agingData) {
    const dataPoints = values.length;
    const totalReceivables = dataPoints > 0 ? values[dataPoints - 1] : 0;
    const previousReceivables = dataPoints > 1 ? values[dataPoints - 2] : 0;

    const receivablesGrowth = previousReceivables > 0
      ? ((totalReceivables - previousReceivables) / previousReceivables) * 100
      : (totalReceivables > 0 ? 100 : 0);

    let overdueReceivables = 0;
    let overduePercentage = 0;
    let agingBuckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, daysOver90: 0 };
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
      overdueReceivables =
        agingBuckets.days1to30 +
        agingBuckets.days31to60 +
        agingBuckets.days61to90 +
        agingBuckets.daysOver90;

      const total = Object.values(agingBuckets).reduce((a, b) => a + b, 0);
      overduePercentage = total > 0 ? (overdueReceivables / total) * 100 : 0;
    }

    const collectionRate = totalReceivables > 0
      ? ((totalReceivables - overdueReceivables) / totalReceivables) * 100
      : 100;

    return {
      totalReceivables,
      previousReceivables,
      receivablesGrowth,
      overdueReceivables,
      overduePercentage,
      collectionRate,
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
    if (metrics.overdueReceivables > 1_000_000) score += 20;
    else if (metrics.overdueReceivables > 500_000) score += 12;
    else if (metrics.overdueReceivables > 100_000) score += 6;

    // Growth (20%)
    if (metrics.receivablesGrowth > 30) score += 20;
    else if (metrics.receivablesGrowth > 20) score += 12;
    else if (metrics.receivablesGrowth > 10) score += 6;

    // Collection rate (20%)
    if (metrics.collectionRate < 50) score += 20;
    else if (metrics.collectionRate < 65) score += 12;
    else if (metrics.collectionRate < 80) score += 6;

    if (metrics.dataPoints < 3) score += 10;

    return this._clamp(score, 0, 100);
  }

  _generateWarnings(metrics) {
    const warnings = [];
    if (metrics.overduePercentage > 60) {
      warnings.push(`🔴 Critical: ${metrics.overduePercentage.toFixed(1)}% of receivables overdue`);
    } else if (metrics.overduePercentage > 40) {
      warnings.push(`⚠️ High: ${metrics.overduePercentage.toFixed(1)}% of receivables overdue`);
    }
    if (metrics.overdueReceivables > 1_000_000) {
      warnings.push(`⚠️ Large overdue balance: ₦${metrics.overdueReceivables.toLocaleString('en-NG')}`);
    }
    if (metrics.receivablesGrowth > 30) {
      warnings.push(`📈 Receivables grew ${metrics.receivablesGrowth.toFixed(1)}% vs last period`);
    }
    if (metrics.collectionRate < 50) {
      warnings.push('🔴 Collection rate below 50%');
    }
    if (metrics.dataPoints < 3) {
      warnings.push('⚠️ Insufficient data for reliable AR assessment');
    }
    return warnings;
  }
}

module.exports = ReceivablesRiskCalculator;