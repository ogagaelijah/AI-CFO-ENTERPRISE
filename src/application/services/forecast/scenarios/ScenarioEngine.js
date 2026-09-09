// ScenarioEngine v5.7.0-prod
// Production-safe · Defensive · Works with new baseForecast shape

'use strict';

class ScenarioEngine {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  async generate({
    baseForecast = {},
    historicalData = [],
    horizon = '30D',
    period = {},
    traceId = null,
  } = {}) {
    try {
      // Safely extract the current projected values
      const revenue = this._getValue(baseForecast.revenue);
      const cogs = this._getValue(baseForecast.cogs);
      const expenses = this._getValue(baseForecast.expenses);
      const profit = this._getValue(baseForecast.profit);
      const cashFlow = this._getValue(baseForecast.cashFlow);

      // If we have no usable numbers, return a clean empty response
      if (revenue === 0 && profit === 0 && cashFlow === 0) {
        return this._emptyResponse(period, horizon, traceId);
      }

      // Scenario factors (conservative / expected / optimistic)
      const factors = {
        conservative: {
          revenue: 0.78,
          cogs: 1.15,
          expenses: 1.12,
          cashFlow: 0.65,
        },
        expected: {
          revenue: 1.0,
          cogs: 1.0,
          expenses: 1.0,
          cashFlow: 1.0,
        },
        optimistic: {
          revenue: 1.22,
          cogs: 0.88,
          expenses: 0.90,
          cashFlow: 1.35,
        },
      };

      const buildScenario = (type, factor) => {
        const scenRevenue = Math.round(revenue * factor.revenue);
        const scenCogs = Math.round(cogs * factor.cogs);
        const scenExpenses = Math.round(expenses * factor.expenses);
        const scenProfit = Math.round(scenRevenue - scenCogs - scenExpenses);
        const scenCashFlow = Math.round(cashFlow * factor.cashFlow);
        const scenGrossProfit = Math.round(scenRevenue - scenCogs);
        const scenGrossMargin = scenRevenue > 0
          ? Number(((scenGrossProfit / scenRevenue) * 100).toFixed(1))
          : 0;
        const scenNetMargin = scenRevenue > 0
          ? Number(((scenProfit / scenRevenue) * 100).toFixed(1))
          : 0;

        return {
          type: type.toUpperCase(),
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Scenario`,
          values: {
            revenue: scenRevenue,
            cogs: scenCogs,
            expenses: scenExpenses,
            profit: scenProfit,
            cashFlow: scenCashFlow,
            grossProfit: scenGrossProfit,
            grossMargin: scenGrossMargin,
            netMargin: scenNetMargin,
          },
          period,
          assumptions: this._getAssumptions(type),
          description: this._getDescription(type),
          confidence: {
            score: type === 'expected' ? 65 : type === 'conservative' ? 55 : 45,
            level: type === 'expected' ? 'MODERATE' : type === 'conservative' ? 'MODERATE' : 'LOW',
          },
          factors: {
            revenueFactor: factor.revenue,
            expenseFactor: factor.expenses,
            cogsFactor: factor.cogs,
            cashFactor: factor.cashFlow,
          },
        };
      };

      const conservative = buildScenario('conservative', factors.conservative);
      const expected = buildScenario('expected', factors.expected);
      const optimistic = buildScenario('optimistic', factors.optimistic);

      // Comparison helper
      const makeComparison = (key) => {
        const c = conservative.values[key] || 0;
        const e = expected.values[key] || 0;
        const o = optimistic.values[key] || 0;
        const range = Math.abs(o - c);
        const variance = e !== 0 ? Number(((range / Math.abs(e)) * 100).toFixed(1)) : 0;

        return {
          conservative: c,
          expected: e,
          optimistic: o,
          range,
          variance,
        };
      };

      return {
        available: true,
        conservative,
        expected,
        optimistic,
        comparison: {
          revenue: makeComparison('revenue'),
          profit: makeComparison('profit'),
          cashFlow: makeComparison('cashFlow'),
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          scenarioEngineVersion: '5.7.0-prod',
          traceId: traceId || null,
          horizon,
          baseSnapshot: {
            revenue,
            cogs,
            expenses,
            profit,
            cashFlow,
          },
        },
      };
    } catch (err) {
      this.logger.warn?.('[ScenarioEngine] Failed', { error: err.message, traceId });
      return this._emptyResponse(period, horizon, traceId);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  _getValue(metric) {
    if (metric == null) return 0;
    if (typeof metric === 'number') return metric;
    if (typeof metric === 'object') {
      return Number(metric.forecast ?? metric.value ?? 0) || 0;
    }
    return 0;
  }

  _getAssumptions(type) {
    const map = {
      conservative: [
        'Revenue: 22% below expected',
        'Expenses: 12% above expected',
        'COGS: 15% above expected',
        'Cash flow: significantly weaker',
      ],
      expected: [
        'Revenue: Current projected trend continues',
        'Expenses: Current projected trend continues',
        'COGS: Moves with revenue',
        'Market conditions: Stable',
      ],
      optimistic: [
        'Revenue: 22% above expected',
        'Expenses: 10% below expected',
        'COGS: 12% below expected',
        'Cash flow: stronger collection & lower costs',
      ],
    };
    return map[type] || [];
  }

  _getDescription(type) {
    const map = {
      conservative: 'Pessimistic scenario assuming weaker sales and higher costs.',
      expected: 'Base case scenario assuming current trends continue.',
      optimistic: 'Optimistic scenario assuming stronger sales and lower costs.',
    };
    return map[type] || '';
  }

  _emptyResponse(period = {}, horizon = '30D', traceId = null) {
    const zeroValues = {
      revenue: 0, cogs: 0, expenses: 0, profit: 0,
      cashFlow: 0, grossProfit: 0, grossMargin: 0, netMargin: 0,
    };

    const emptyScenario = (type) => ({
      type: type.toUpperCase(),
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Scenario`,
      values: { ...zeroValues },
      period,
      assumptions: [],
      description: 'Insufficient data for scenario',
      confidence: { score: 0, level: 'VERY_LOW' },
      factors: {},
    });

    return {
      available: false,
      conservative: emptyScenario('conservative'),
      expected: emptyScenario('expected'),
      optimistic: emptyScenario('optimistic'),
      comparison: {
        revenue: { conservative: 0, expected: 0, optimistic: 0, range: 0, variance: 0 },
        profit: { conservative: 0, expected: 0, optimistic: 0, range: 0, variance: 0 },
        cashFlow: { conservative: 0, expected: 0, optimistic: 0, range: 0, variance: 0 },
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        scenarioEngineVersion: '5.7.0-prod',
        traceId,
        horizon,
        reason: 'INSUFFICIENT_DATA',
      },
    };
  }
}

module.exports = ScenarioEngine;