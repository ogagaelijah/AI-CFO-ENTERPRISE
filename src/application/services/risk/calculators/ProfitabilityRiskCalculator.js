'use strict';

const BaseRiskCalculator = require('./BaseRiskCalculator');
const { RiskContracts, RISK_TYPES } = require('../contracts');

/**
 * ProfitabilityRiskCalculator - Production v1.1.0
 * Detects: margin compression, negative profit, volatility
 * Supports: gross | operating | net
 */
class ProfitabilityRiskCalculator extends BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.1.0';
  static CALCULATOR_TYPE = RISK_TYPES.PROFITABILITY;
  static VALID_MARGIN_TYPES = Object.freeze(['gross', 'operating', 'net']);

  async calculate({
    userId,
    businessId,
    marginData = [],
    marginType = 'gross',
    previousRisk = null,
  }) {
    const startedAt = Date.now();

    try {
      if (!userId || !businessId) {
        throw new Error('userId and businessId are required');
      }

      const validatedMarginType = this._validateMarginType(marginType);
      const values = this._extractValues(marginData, ['value', 'margin', 'percentage']);
      const metrics = this._calculateMetrics(values, validatedMarginType);
      const score = this._calculateScore(metrics);

      let risk = RiskContracts.createProfitabilityRisk({
        score,
        currentMargin: metrics.currentMargin,
        previousMargin: metrics.previousMargin,
        marginChange: metrics.marginChange,
        marginType: validatedMarginType,
        status: this._mapToStatus(score, previousRisk),
        previousScore: previousRisk?.score ?? null,
        confidence: this._calculateConfidence(
          values.length,
          metrics.marginVolatility < 0.25 ? 0.08 : 0
        ),
      });

      risk = this._enrichMetrics(risk, {
        marginVolatility: metrics.marginVolatility,
        isNegative: metrics.isNegative,
        averageMargin: metrics.averageMargin,
        dataPoints: values.length,
      });

      if (values.length >= this.config.trendMinPoints) {
        // Rising margin = IMPROVING
        risk = this._enrichWithTrend(risk, values);
      }

      const warnings = this._generateWarnings(metrics, validatedMarginType);
      risk = this._enrichWarnings(risk, warnings);
      risk = this._enrichEvidence(risk, warnings);

      risk = this._enrichMeta(risk, {
        userId,
        businessId,
        durationMs: Date.now() - startedAt,
        marginType: validatedMarginType,
      });

      this.logger.debug?.(`[ProfitabilityRisk] ${risk.id} → ${score} (${Date.now() - startedAt}ms)`);
      return risk;
    } catch (error) {
      this.logger.error?.('[ProfitabilityRisk] failed', { error: error.message, userId, businessId });
      return this._createFallbackRisk({
        type: RISK_TYPES.PROFITABILITY,
        title: 'Profitability Risk Assessment Failed',
        userId,
        businessId,
        error,
        extra: { marginType },
      });
    }
  }

  _validateMarginType(type) {
    const normalized = String(type || 'gross').toLowerCase();
    return ProfitabilityRiskCalculator.VALID_MARGIN_TYPES.includes(normalized)
      ? normalized
      : 'gross';
  }

  _calculateMetrics(values, marginType) {
    const dataPoints = values.length;
    const currentMargin = dataPoints > 0 ? values[dataPoints - 1] : 0;
    const previousMargin = dataPoints > 1 ? values[dataPoints - 2] : 0;
    const marginChange = currentMargin - previousMargin; // percentage points

    const volatility = this.volatilityAnalyzer.analyze(values);
    const marginVolatility = volatility?.available
      ? this._safeNumber(volatility.volatility)
      : 0;

    const averageMargin = dataPoints > 0
      ? values.reduce((a, b) => a + b, 0) / dataPoints
      : 0;

    return {
      currentMargin,
      previousMargin,
      marginChange,
      marginVolatility,
      averageMargin,
      dataPoints,
      isNegative: currentMargin < 0,
      marginType,
    };
  }

  _calculateScore(metrics) {
    let score = 0;

    // 1. Absolute margin level (30%)
    if (metrics.isNegative) score += 30;
    else if (metrics.currentMargin < 5) score += 25;
    else if (metrics.currentMargin < 10) score += 18;
    else if (metrics.currentMargin < 20) score += 10;

    // 2. Margin change (30%)
    if (metrics.marginChange < -10) score += 30;
    else if (metrics.marginChange < -5) score += 20;
    else if (metrics.marginChange < -2) score += 10;
    else if (metrics.marginChange < 0) score += 5;

    // 3. Volatility (20%)
    if (metrics.marginVolatility > 0.5) score += 20;
    else if (metrics.marginVolatility > 0.3) score += 12;
    else if (metrics.marginVolatility > 0.15) score += 6;

    // 4. Data quality (20%)
    if (metrics.dataPoints < 3) score += 20;
    else if (metrics.dataPoints < 6) score += 10;

    return this._clamp(score, 0, 100);
  }

  _generateWarnings(metrics, marginType) {
    const warnings = [];
    const label = marginType.charAt(0).toUpperCase() + marginType.slice(1);

    if (metrics.isNegative) {
      warnings.push(`🔴 ${label} margin is negative: ${metrics.currentMargin.toFixed(1)}%`);
    }

    if (metrics.marginChange < -10) {
      warnings.push(`🔴 ${label} margin dropped ${Math.abs(metrics.marginChange).toFixed(1)} pp`);
    } else if (metrics.marginChange < -5) {
      warnings.push(`📉 ${label} margin declined ${Math.abs(metrics.marginChange).toFixed(1)} pp`);
    }

    if (metrics.currentMargin < 5 && !metrics.isNegative) {
      warnings.push(`⚠️ ${label} margin critically low: ${metrics.currentMargin.toFixed(1)}%`);
    } else if (metrics.currentMargin < 10 && !metrics.isNegative) {
      warnings.push(`⚠️ ${label} margin is low: ${metrics.currentMargin.toFixed(1)}%`);
    }

    if (metrics.marginVolatility > 0.5) {
      warnings.push('📊 High profitability volatility detected');
    }

    if (metrics.dataPoints < 3) {
      warnings.push('⚠️ Insufficient data for reliable profitability assessment');
    }

    return warnings;
  }
}

module.exports = ProfitabilityRiskCalculator;