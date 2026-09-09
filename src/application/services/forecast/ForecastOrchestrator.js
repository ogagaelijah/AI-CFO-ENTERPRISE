// src/application/services/forecast/ForecastOrchestrator.js
// SSOT v5.7.0-prod | Logical projections + derived Profit

'use strict';

const ProjectionEngine = require('./core/ProjectionEngine');
const { ScenarioEngine, WhatIfEngine } = require('./scenarios');
const { ConfidenceEngine, ForecastRiskDetector } = require('./intelligence');

class ForecastOrchestrator {
  static LIMITS = Object.freeze({
    VERSION: '5.7.0-prod',
    MAX_WHATIF_CHANGES: 10,
    FREEZE_DEPTH_LIMIT: 4,
    MAX_ARRAY_FREEZE_SIZE: 5000,
    HORIZON_DAYS: Object.freeze({
      '7D': 7, '14D': 14, '30D': 30, '60D': 60, '90D': 90, '6M': 180, '12M': 365,
    }),
    LABELS: Object.freeze({
      '7D': '7 Days', '14D': '14 Days', '30D': '30 Days', '60D': '60 Days',
      '90D': '90 Days', '6M': '6 Months', '12M': '12 Months',
    }),
    HORIZON_PERIODS: Object.freeze({
      '7D': 30, '14D': 60, '30D': 90, '60D': 120, '90D': 180, '6M': 365, '12M': 730,
    }),
  });

  static NOOP_LOGGER = Object.freeze({
    warn: () => {}, info: () => {}, error: () => {}, debug: () => {},
  });

  constructor({
    forecastDataProvider,
    projectionEngine,
    scenarioEngine,
    whatIfEngine,
    confidenceEngine,
    riskDetector,
    logger = ForecastOrchestrator.NOOP_LOGGER,
  } = {}) {
    this.logger = logger && typeof logger.warn === 'function' ? logger : ForecastOrchestrator.NOOP_LOGGER;
    this.LIMITS = ForecastOrchestrator.LIMITS;

    this.forecastDataProvider = forecastDataProvider;
    this.projectionEngine = projectionEngine || new ProjectionEngine();
    this.scenarioEngine = scenarioEngine || new ScenarioEngine({});
    this.whatIfEngine = whatIfEngine || new WhatIfEngine({});
    this.confidenceEngine = confidenceEngine || new ConfidenceEngine({});
    this.riskDetector = riskDetector || new ForecastRiskDetector({});
  }

  async generate({
    userId,
    businessId,
    horizon = '30D',
    whatIfChanges = null,
    now = new Date(),
    traceId = null,
  } = {}) {
    const F = this.LIMITS;
    const started = Date.now();
    const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    const tid = traceId || this._traceId(safeNow);

    if (!userId || !businessId) {
      return this._freeze(this._errorPackage('INVALID_PARAMS', safeNow, tid));
    }

    let normalizedHorizon = F.HORIZON_DAYS[horizon] ? horizon : '30D';

    try {
      const periods = F.HORIZON_PERIODS[normalizedHorizon] || 90;
      const data = await this.forecastDataProvider.getHistoricalPackage({
        userId, businessId, periods,
      });

      if (!data || typeof data !== 'object') {
        throw new Error('Empty package from Analytics SSOT');
      }

      const days = F.HORIZON_DAYS[normalizedHorizon];
      const period = this._buildPeriod(normalizedHorizon, safeNow);
      const t = data.trendRates || {};

      // ── 1. Project the primary drivers ───────────────────────────────
      const revenueResult = this.projectionEngine.project(
        data.currentRevenue, t.revenue, days
      );

      const cogsResult = this.projectionEngine.project(
        data.currentCogs, t.cogs, days
      );

      const expenseResult = this.projectionEngine.project(
        data.currentExpenses, t.expenses, days
      );

      // ── 2. DERIVE Profit (never project it independently) ────────────
      const derivedProfitValue =
        (revenueResult.forecast || 0) -
        (cogsResult.forecast || 0) -
        (expenseResult.forecast || 0);

      const profitResult = this.projectionEngine.fromValue(derivedProfitValue, {
        score: 60,
        assumptions: [
          'Derived as Revenue − COGS − Expenses',
          `Horizon ${days} days`,
        ],
        basis: {
          revenue: revenueResult.forecast,
          cogs: cogsResult.forecast,
          expenses: expenseResult.forecast,
        },
      });

      // ── 3. Mild movement for stocks ──────────────────────────────────
      const cashFlowResult = this.projectionEngine.project(
        data.openingCash, t.cashFlow, days
      );

      const inventoryResult = this.projectionEngine.project(
        data.currentInventory, t.inventory, days
      );

      const receivablesResult = this.projectionEngine.project(
        data.currentReceivables, t.receivables, days
      );

      const payablesResult = this.projectionEngine.project(
        data.currentPayables, t.payables, days
      );

      const salesVolumeResult = this.projectionEngine.project(
        data.currentRevenue * 0.01, t.salesVolume, days
      );

      const demandResult = this.projectionEngine.project(
        data.currentRevenue * 0.01, t.demand, days
      );

      const baseForecast = Object.freeze({
        revenue: revenueResult,
        salesVolume: salesVolumeResult,
        cogs: cogsResult,
        expenses: expenseResult,
        profit: profitResult,
        cashFlow: cashFlowResult,
        receivables: receivablesResult,
        payables: payablesResult,
        inventory: inventoryResult,
        demand: demandResult,
      });

      // ── Scenarios / What-If / Confidence / Risks (kept) ──────────────
      let scenarios = null;
      try {
        scenarios = await this.scenarioEngine.generate({
          baseForecast, historicalData: data.historical || [],
          horizon: normalizedHorizon, period, traceId: tid,
        });
      } catch (err) {
        scenarios = Object.freeze({ available: false, reason: 'SCENARIO_ERROR' });
      }

      let whatIfResult = null;
      const changes = Array.isArray(whatIfChanges)
        ? whatIfChanges.slice(0, F.MAX_WHATIF_CHANGES) : [];
      if (changes.length > 0) {
        try {
          whatIfResult = await this.whatIfEngine.analyze({
            baseForecast, changes, historicalData: data.historical || [],
            horizon: normalizedHorizon, traceId: tid,
          });
        } catch (err) {
          whatIfResult = Object.freeze({ available: false, reason: 'WHATIF_ERROR' });
        }
      }

      let confidenceResults = null;
      try {
        confidenceResults = this.confidenceEngine.compare
          ? this.confidenceEngine.compare({
              revenue: { forecast: revenueResult },
              profit: { forecast: profitResult },
              cashFlow: { forecast: cashFlowResult },
              inventory: { forecast: inventoryResult },
            }, { now: safeNow, traceId: tid })
          : Object.freeze({ available: false });
      } catch (err) {
        confidenceResults = Object.freeze({ available: false });
      }

      let riskResults = null;
      try {
        riskResults = this.riskDetector.detect({
          forecasts: {
            revenue: revenueResult,
            profit: profitResult,
            cashFlow: cashFlowResult,
            inventory: inventoryResult,
            receivables: receivablesResult,
            expenses: expenseResult,
          },
          historicalData: {
            revenue: data.currentRevenue || 0,
            cash: data.openingCash || 0,
            receivables: data.currentReceivables || 0,
            expenses: data.currentExpenses || 0,
          },
          traceId: tid,
        });
      } catch (err) {
        riskResults = Object.freeze({ risks: [], overallSeverity: 'UNKNOWN' });
      }

      const durationMs = Date.now() - started;

      const payload = {
        generatedAt: safeNow.toISOString(),
        horizon: normalizedHorizon,
        period,
        baseForecast,
        scenarios,
        whatIf: whatIfResult,
        confidence: confidenceResults,
        risks: riskResults,
        summary: this._generateExecutiveSummary({
          revenueResult, profitResult, cashFlowResult, riskResults,
        }),
        metadata: {
          orchestratorVersion: F.VERSION,
          traceId: tid,
          requestId: tid,
          userId,
          businessId,
          horizon: normalizedHorizon,
          period,
          dataPoints: {
            revenue: data.currentRevenue ? 1 : 0,
            profit: data.currentProfit ? 1 : 0,
            cashFlow: data.openingCash ? 1 : 0,
            inventory: data.currentInventory ? 1 : 0,
          },
          warnings: this._collectWarnings(baseForecast),
          durationMs,
          partialSuccess: false,
        },
      };

      this.logger.info('[ForecastOrchestrator] generate completed', {
        traceId: tid, durationMs, horizon: normalizedHorizon,
      });

      return this._freeze(payload, 0);
    } catch (e) {
      this.logger.error('[ForecastOrchestrator] generate failed', {
        traceId: tid, error: e.message,
      });
      return this._freeze(this._errorPackage('ORCHESTRATION_ERROR', safeNow, tid, e.message));
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  _generateExecutiveSummary({ revenueResult, profitResult, cashFlowResult, riskResults }) {
    const revenueForecast = revenueResult?.forecast ?? 0;
    const profitForecast = profitResult?.forecast ?? 0;
    const cashFlowForecast = cashFlowResult?.forecast ?? 0;

    const risks = riskResults?.risks || [];
    const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');
    const highRisks = risks.filter(r => r.severity === 'HIGH');

    return this._freeze({
      revenue: { forecast: revenueForecast, confidence: revenueResult?.confidence?.score ?? 0 },
      profit: { forecast: profitForecast, confidence: profitResult?.confidence?.score ?? 0 },
      cashFlow: { forecast: cashFlowForecast, confidence: cashFlowResult?.confidence?.score ?? 0 },
      risks: {
        critical: criticalRisks.length,
        high: highRisks.length,
        total: risks.length,
        overallSeverity: riskResults?.overallSeverity || 'LOW',
      },
      status: this._determineOverallStatus({ profitForecast, cashFlowForecast, criticalRisks, highRisks }),
    }, 0);
  }

  _determineOverallStatus({ profitForecast, cashFlowForecast, criticalRisks, highRisks }) {
    if (criticalRisks.length > 0) return 'CRITICAL';
    if (profitForecast < 0) return 'WARNING';
    if (cashFlowForecast < 0) return 'WARNING';
    if (highRisks.length > 2) return 'WARNING';
    if (profitForecast > 0 && cashFlowForecast > 0) return 'POSITIVE';
    return 'NEUTRAL';
  }

  _buildPeriod(horizon, now) {
    const days = this.LIMITS.HORIZON_DAYS[horizon] || 30;
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + days);
    return Object.freeze({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: this.LIMITS.LABELS[horizon] || '30 Days',
      horizon,
      days,
    });
  }

  _collectWarnings(baseForecast) {
    const warnings = [];
    Object.entries(baseForecast).forEach(([key, val]) => {
      if (!val?.available) warnings.push(`${key}: INSUFFICIENT_DATA`);
    });
    return warnings.length ? Object.freeze(warnings) : undefined;
  }

  _errorPackage(reason, now, traceId, message = null) {
    return {
      generatedAt: now.toISOString(),
      error: reason,
      message,
      metadata: {
        orchestratorVersion: this.LIMITS.VERSION,
        traceId,
        requestId: traceId,
      },
    };
  }

  _freeze(root, depth = 0) {
    const F = this.LIMITS;
    if (root === null || typeof root !== 'object' || Object.isFrozen(root)) return root;
    if (depth > F.FREEZE_DEPTH_LIMIT) return Object.seal(root);

    const queue = [[root, depth]];
    while (queue.length > 0) {
      const [current, d] = queue.shift();
      if (current === null || typeof current !== 'object' || Object.isFrozen(current)) continue;
      if (Array.isArray(current) && current.length > F.MAX_ARRAY_FREEZE_SIZE) {
        Object.seal(current);
        continue;
      }
      Object.freeze(current);
      for (const key of Object.keys(current)) {
        const val = current[key];
        if (val && typeof val === 'object' && !Object.isFrozen(val)) {
          queue.push([val, d + 1]);
        }
      }
    }
    return root;
  }

  _traceId(now) {
    const t = (now instanceof Date ? now.getTime() : Date.now()).toString(36);
    return `orch_${t}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

module.exports = ForecastOrchestrator;