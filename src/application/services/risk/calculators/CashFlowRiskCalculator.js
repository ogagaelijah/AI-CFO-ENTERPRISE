// src/application/services/risk/calculators/CashFlowRiskCalculator.js
'use strict';

const BaseRiskCalculator = require('./BaseRiskCalculator');
const { RiskContracts, RISK_TYPES } = require('../contracts');

/**
 * CashFlowRiskCalculator - Production v1.1.0
 * Detects: low runway, negative cash, high burn, runway deterioration
 */
class CashFlowRiskCalculator extends BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.1.0';
  static CALCULATOR_TYPE = RISK_TYPES.CASH_FLOW;

  async calculate({
    userId,
    businessId,
    cashData = [],
    burnData = [],
    currentCash = null,
    averageMonthlyBurn = null,
    previousRisk = null,
  }) {
    const startedAt = Date.now();

    try {
      if (!userId || !businessId) {
        throw new Error('userId and businessId are required');
      }

      const cashValues = this._extractValues(cashData, ['value', 'cash', 'balance', 'amount']);
      const burnValues = this._extractValues(burnData, ['value', 'burn', 'amount']);

      const metrics = this._calculateMetrics(
        cashValues,
        burnValues,
        currentCash,
        averageMonthlyBurn
      );
      const score = this._calculateScore(metrics);

      let risk = RiskContracts.createCashRisk({
        score,
        currentCash: metrics.currentCash,
        averageMonthlyBurn: metrics.averageMonthlyBurn,
        cashRunwayMonths: metrics.cashRunwayMonths,
        status: this._mapToStatus(score, previousRisk),
        previousScore: previousRisk?.score ?? null,
        confidence: this._calculateConfidence(
          cashValues.length,
          metrics.hasBurnData ? 0.12 : 0
        ),
      });

      risk = this._enrichMetrics(risk, {
        cashGrowth: metrics.cashGrowth,
        burnVolatility: metrics.burnVolatility,
        dataPoints: cashValues.length,
        runwayCategory: metrics.runwayCategory,
      });

      if (cashValues.length >= this.config.trendMinPoints) {
        risk = this._enrichWithTrend(risk, cashValues);
      }

      risk = this._enrichEvidence(risk, this._generateWarnings(metrics));
      risk = this._enrichMeta(risk, {
        userId,
        businessId,
        durationMs: Date.now() - startedAt,
      });

      this.logger.debug?.(`[CashFlowRisk] ${risk.id} → ${score} (${Date.now() - startedAt}ms)`);
      return risk;
    } catch (error) {
      this.logger.error?.('[CashFlowRisk] failed', { error: error.message, userId, businessId });
      return this._createFallbackRisk({
        type: RISK_TYPES.CASH_FLOW,
        title: 'Cash Flow Risk Assessment Failed',
        userId,
        businessId,
        error,
      });
    }
  }

  _calculateMetrics(cashValues, burnValues, currentCashOverride, burnOverride) {
    const dataPoints = cashValues.length;
    const currentCash =
      currentCashOverride != null
        ? this._safeNumber(currentCashOverride)
        : dataPoints > 0
          ? cashValues[dataPoints - 1]
          : 0;

    const previousCash = dataPoints > 1 ? cashValues[dataPoints - 2] : currentCash;

    const cashGrowth =
      previousCash !== 0
        ? ((currentCash - previousCash) / Math.abs(previousCash)) * 100
        : 0;

    let averageMonthlyBurn = 0;
    let hasBurnData = false;
    let burnVolatility = 0;

    if (burnOverride != null) {
      averageMonthlyBurn = this._safeNumber(burnOverride);
      hasBurnData = true;
    } else if (burnValues.length > 0) {
      hasBurnData = true;
      averageMonthlyBurn =
        burnValues.reduce((a, b) => a + b, 0) / burnValues.length;
      const vol = this.volatilityAnalyzer.analyze(burnValues);
      burnVolatility = vol?.available ? this._safeNumber(vol.volatility) : 0;
    } else if (dataPoints >= 2) {
      const declines = [];
      for (let i = 1; i < cashValues.length; i++) {
        const diff = cashValues[i - 1] - cashValues[i];
        if (diff > 0) declines.push(diff);
      }
      if (declines.length > 0) {
        averageMonthlyBurn =
          declines.reduce((a, b) => a + b, 0) / declines.length;
        hasBurnData = true;
      }
    }

    let cashRunwayMonths = null;
    if (averageMonthlyBurn > 0) {
      cashRunwayMonths = currentCash / averageMonthlyBurn;
    } else if (currentCash > 0) {
      cashRunwayMonths = Infinity;
    } else {
      cashRunwayMonths = 0;
    }

    let runwayCategory = 'healthy';
    if (cashRunwayMonths === Infinity) runwayCategory = 'unlimited';
    else if (cashRunwayMonths < 1) runwayCategory = 'critical';
    else if (cashRunwayMonths < 2) runwayCategory = 'low';
    else if (cashRunwayMonths < 3) runwayCategory = 'watch';
    else if (cashRunwayMonths < 6) runwayCategory = 'adequate';

    return {
      currentCash,
      previousCash,
      cashGrowth,
      averageMonthlyBurn,
      cashRunwayMonths,
      runwayCategory,
      burnVolatility,
      hasBurnData,
      dataPoints,
    };
  }

  _calculateScore(metrics) {
    let score = 0;
    const runway = metrics.cashRunwayMonths;

    if (runway === null || runway < 0) score += 50;
    else if (runway < 1) score += 50;
    else if (runway < 2) score += 40;
    else if (runway < 3) score += 28;
    else if (runway < 6) score += 12;

    if (metrics.currentCash <= 0) score += 20;
    else if (metrics.currentCash < 50_000) score += 10;

    if (metrics.cashGrowth < -30) score += 15;
    else if (metrics.cashGrowth < -15) score += 10;
    else if (metrics.cashGrowth < -5) score += 5;

    if (metrics.dataPoints < 3) score += 15;
    else if (metrics.dataPoints < 6) score += 8;

    return this._clamp(score, 0, 100);
  }

  _generateWarnings(metrics) {
    const warnings = [];
    const runway = metrics.cashRunwayMonths;

    if (runway !== null && runway !== Infinity) {
      if (runway < 1) {
        warnings.push(
          `🔴 Critical: cash runway < 1 month (${runway.toFixed(1)} months)`
        );
      } else if (runway < 2) {
        warnings.push(
          `⚠️ Low cash runway: ${runway.toFixed(1)} months`
        );
      } else if (runway < 3) {
        warnings.push(
          `📊 Cash runway under 3 months: ${runway.toFixed(1)} months`
        );
      }
    }

    if (metrics.currentCash <= 0) {
      warnings.push('🔴 Cash balance is zero or negative');
    }

    if (metrics.cashGrowth < -20) {
      warnings.push(
        `📉 Cash declined ${Math.abs(metrics.cashGrowth).toFixed(1)}% vs previous period`
      );
    }

    if (metrics.averageMonthlyBurn > 0 && metrics.currentCash > 0) {
      warnings.push(
        `Average monthly burn: ₦${metrics.averageMonthlyBurn.toLocaleString('en-NG')}`
      );
    }

    if (metrics.dataPoints < 3) {
      warnings.push('⚠️ Insufficient cash history for reliable assessment');
    }

    return warnings;
  }
}

module.exports = CashFlowRiskCalculator;