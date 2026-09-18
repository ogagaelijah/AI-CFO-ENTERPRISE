// src/application/services/forecast/ForecastOrchestrator.js
// SSOT v5.8.0-prod | Current values = SSOT | Projection only for horizon

'use strict';

const ProjectionEngine = require('./core/ProjectionEngine');
const { ScenarioEngine, WhatIfEngine } = require('./scenarios');
const { ConfidenceEngine, ForecastRiskDetector } = require('./intelligence');

class ForecastOrchestrator {
  static LIMITS = Object.freeze({
    VERSION: '5.8.0-prod',
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

      // ── CURRENT (SSOT) – never projected ─────────────────────────────
      const current = Object.freeze({
        revenue: Number(data.currentRevenue) || 0,
        profit: Number(data.currentProfit) || 0,
        expenses: Number(data.currentExpenses) || 0,
        cashFlow: Number(data.openingCash) || 0,
        cogs: Number(data.currentCogs) || 0,
        inventory: Number(data.currentInventory) || 0,
        receivables: Number(data.currentReceivables) || 0,
        payables: Number(data.currentPayables) || 0,
        grossMargin: Number(data.currentGrossMargin) || 0,
        netMargin: Number(data.currentNetMargin) || 0,
      });

      // ── 1. Project the primary drivers (horizon only) ────────────────
      const revenueResult = this.projectionEngine.project(
        current.revenue, t.revenue, days
      );

      const cogsResult = this.projectionEngine.project(
        current.cogs, t.cogs, days
      );

      const expenseResult = this.projectionEngine.project(
        current.expenses, t.expenses, days
      );

      // ── 2. DERIVE Profit from projected drivers ─────────────────────
      const derivedProfitValue =
        (revenueResult.forecast || 0) -
        (cogsResult.forecast || 0) -
        (expenseResult.forecast || 0);

      const profitResult = this.projectionEngine.fromValue(derivedProfitValue, {
        score: 60,
        assumptions: [
          'Derived as Revenue − COGS − Expenses (projected)',
          `Horizon ${days} days`,
        ],
        basis: {
          revenue: revenueResult.forecast,
          cogs: cogsResult.forecast,
          expenses: expenseResult.forecast,
        },
      });

      // ── 3. Project secondary metrics ────────────────────────────────
      const cashFlowResult = this.projectionEngine.project(
        current.cashFlow, t.cashFlow, days
      );

      const inventoryResult = this.projectionEngine.project(
        current.inventory, t.inventory, days
      );

      const receivablesResult = this.projectionEngine.project(
        current.receivables, t.receivables, days
      );

      const payablesResult = this.projectionEngine.project(
        current.payables, t.payables, days
      );

      const salesVolumeResult = this.projectionEngine.project(
        current.revenue * 0.01, t.salesVolume, days
      );

      const demandResult = this.projectionEngine.project(
        current.revenue * 0.01, t.demand, days
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

      // ── Scenarios / What-If / Confidence / Risks ────────────────────
      let scenarios = null;
      try {
        scenarios = await this.scenarioEngine.generate({
          baseForecast, historicalData: data.historical || [],
          horizon: normalizedHorizon, period, traceId: tid,
        });
      } catch (err) {
        this.logger.warn('[ForecastOrchestrator] scenarioEngine failed', { traceId: tid, error: err.message });
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
          this.logger.warn('[ForecastOrchestrator] whatIfEngine failed', { traceId: tid, error: err.message });
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
        this.logger.warn('[ForecastOrchestrator] confidenceEngine failed', { traceId: tid, error: err.message });
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
            revenue: current.revenue,
            cash: current.cashFlow,
            receivables: current.receivables,
            expenses: current.expenses,
          },
          traceId: tid,
        });
      } catch (err) {
        this.logger.warn('[ForecastOrchestrator] riskDetector failed', { traceId: tid, error: err.message });
        riskResults = Object.freeze({ risks: [], overallSeverity: 'UNKNOWN' });
      }

      const durationMs = Date.now() - started;

      const payload = {
        generatedAt: safeNow.toISOString(),
        horizon: normalizedHorizon,
        period,

        // ── SSOT current values (use these for top cards / summary) ──
        current,

        // ── Projected values for the selected horizon ────────────────
        baseForecast,

        scenarios,
        whatIf: whatIfResult,
        confidence: confidenceResults,
        risks: riskResults,

        // Executive summary now uses CURRENT (SSOT) values
        summary: this._generateExecutiveSummary({
          current,
          riskResults,
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
            revenue: current.revenue ? 1 : 0,
            profit: current.profit ? 1 : 0,
            cashFlow: current.cashFlow ? 1 : 0,
            inventory: current.inventory ? 1 : 0,
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

  /**
   * Executive Summary + top metric cards MUST use current SSOT values.
   * Projection is only for horizon / scenarios / what-if.
   */
  _generateExecutiveSummary({ current, riskResults }) {
    const risks = riskResults?.risks || [];
    const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');
    const highRisks = risks.filter(r => r.severity === 'HIGH');

    return this._freeze({
      revenue: {
        value: current.revenue,
        confidence: 65, // current is known → high confidence
      },
      profit: {
        value: current.profit,
        confidence: 65,
      },
      cashFlow: {
        value: current.cashFlow,
        confidence: 65,
      },
      expenses: {
        value: current.expenses,
        confidence: 65,
      },
      risks: {
        critical: criticalRisks.length,
        high: highRisks.length,
        total: risks.length,
        overallSeverity: riskResults?.overallSeverity || 'LOW',
      },
      status: this._determineOverallStatus({
        profit: current.profit,
        cashFlow: current.cashFlow,
        criticalRisks,
        highRisks,
      }),
    }, 0);
  }

  _determineOverallStatus({ profit, cashFlow, criticalRisks, highRisks }) {
    if (criticalRisks.length > 0) return 'CRITICAL';
    if (profit < 0) return 'WARNING';
    if (cashFlow < 0) return 'WARNING';
    if (highRisks.length > 2) return 'WARNING';
    if (profit > 0 && cashFlow > 0) return 'POSITIVE';
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