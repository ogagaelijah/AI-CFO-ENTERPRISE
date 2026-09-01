// src/application/services/risk/calculators/ExpenseRiskCalculator.js
'use strict';

const BaseRiskCalculator = require('./BaseRiskCalculator');
const { RiskContracts, RISK_TYPES } = require('../contracts');

/**
 * ExpenseRiskCalculator - Production v1.1.0
 * Detects: expenses growing faster than revenue, cost inflation, volatility
 */
class ExpenseRiskCalculator extends BaseRiskCalculator {
  static CALCULATOR_VERSION = '1.1.0';
  static CALCULATOR_TYPE = RISK_TYPES.EXPENSE;

  async calculate({
    userId,
    businessId,
    expenseData = [],
    revenueGrowth = 0,
    previousRisk = null,
  }) {
    const startedAt = Date.now();

    try {
      if (!userId || !businessId) {
        throw new Error('userId and businessId are required');
      }

      const values = this._extractValues(expenseData, ['value', 'expense', 'amount', 'cost']);
      const metrics = this._calculateMetrics(values, revenueGrowth);
      const score = this._calculateScore(metrics);

      let risk = RiskContracts.createExpenseRisk({
        score,
        currentExpenses: metrics.currentExpenses,
        previousExpenses: metrics.previousExpenses,
        expenseGrowth: metrics.expenseGrowth,
        revenueGrowth: metrics.revenueGrowth,
        status: this._mapToStatus(score, previousRisk),
        previousScore: previousRisk?.score ?? null,
        confidence: this._calculateConfidence(
          values.length,
          metrics.expenseVolatility < 0.25 ? 0.08 : 0
        ),
      });

      risk = this._enrichMetrics(risk, {
        expenseVolatility: metrics.expenseVolatility,
        expenseToRevenueGap: metrics.expenseToRevenueGap,
        averageExpenses: metrics.averageExpenses,
        dataPoints: values.length,
      });

      if (values.length >= this.config.trendMinPoints) {
        risk = this._enrichWithTrend(risk, values, true);
      }

      risk = this._enrichEvidence(risk, this._generateWarnings(metrics));
      risk = this._enrichMeta(risk, {
        userId,
        businessId,
        durationMs: Date.now() - startedAt,
      });

      this.logger.debug?.(`[ExpenseRisk] ${risk.id} → ${score} (${Date.now() - startedAt}ms)`);
      return risk;
    } catch (error) {
      this.logger.error?.('[ExpenseRisk] failed', { error: error.message, userId, businessId });
      return this._createFallbackRisk({
        type: RISK_TYPES.EXPENSE,
        title: 'Expense Risk Assessment Failed',
        userId,
        businessId,
        error,
      });
    }
  }

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

  _calculateMetrics(values, revenueGrowth) {
    const dataPoints = values.length;
    const currentExpenses = dataPoints > 0 ? values[dataPoints - 1] : 0;
    const previousExpenses = dataPoints > 1 ? values[dataPoints - 2] : 0;

    const expenseGrowth = previousExpenses > 0
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
      : (currentExpenses > 0 ? 100 : 0);

    const volatility = this.volatilityAnalyzer.analyze(values);
    const expenseVolatility = volatility?.available
      ? this._safeNumber(volatility.volatility)
      : 0;

    const averageExpenses = dataPoints > 0
      ? values.reduce((a, b) => a + b, 0) / dataPoints
      : 0;

    const safeRevenueGrowth = this._safeNumber(revenueGrowth);
    const expenseToRevenueGap = expenseGrowth - safeRevenueGrowth;

    return {
      currentExpenses,
      previousExpenses,
      expenseGrowth,
      revenueGrowth: safeRevenueGrowth,
      expenseToRevenueGap,
      expenseVolatility,
      averageExpenses,
      dataPoints,
    };
  }

  _calculateScore(metrics) {
    let score = 0;

    const gap = metrics.expenseToRevenueGap;
    if (gap > 25) score += 40;
    else if (gap > 15) score += 30;
    else if (gap > 8) score += 20;
    else if (gap > 3) score += 10;

    if (metrics.expenseGrowth > 40) score += 25;
    else if (metrics.expenseGrowth > 25) score += 18;
    else if (metrics.expenseGrowth > 15) score += 10;
    else if (metrics.expenseGrowth > 8) score += 5;

    if (metrics.expenseVolatility > 0.5) score += 20;
    else if (metrics.expenseVolatility > 0.3) score += 12;
    else if (metrics.expenseVolatility > 0.15) score += 6;

    if (metrics.dataPoints < 3) score += 15;
    else if (metrics.dataPoints < 6) score += 8;

    return this._clamp(score, 0, 100);
  }

  _generateWarnings(metrics) {
    const warnings = [];
    const gap = metrics.expenseToRevenueGap;

    if (gap > 25) {
      warnings.push(
        `🔴 Expenses growing ${gap.toFixed(1)}pp faster than revenue`
      );
    } else if (gap > 10) {
      warnings.push(
        `⚠️ Expenses growing faster than revenue (+${gap.toFixed(1)}pp gap)`
      );
    }

    if (metrics.expenseGrowth > 30) {
      warnings.push(
        `📈 Expenses rose ${metrics.expenseGrowth.toFixed(1)}% vs previous period`
      );
    }

    if (metrics.expenseVolatility > 0.5) {
      warnings.push('📊 High expense volatility detected');
    }

    if (metrics.dataPoints < 3) {
      warnings.push('⚠️ Insufficient data for reliable expense assessment');
    }

    return warnings;
  }
}

module.exports = ExpenseRiskCalculator;