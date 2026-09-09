// src/application/services/risk/RiskOrchestrator.js
// SSOT v2.0.0-prod – pure consumer of Forecast (via RiskDataProvider)
// No domain calculators. No re-projection. Only interpretation + packaging.

'use strict';

const { RiskContracts, RISK_TYPES, RISK_STATUS } = require('./contracts');

class RiskOrchestrator {
  static VERSION = '2.0.0-prod';

  static NOOP_LOGGER = Object.freeze({
    warn: () => {}, info: () => {}, error: () => {}, debug: () => {},
  });

  constructor({
    riskDataProvider,
    logger = RiskOrchestrator.NOOP_LOGGER,
  } = {}) {
    this.logger = logger && typeof logger.warn === 'function'
      ? logger
      : RiskOrchestrator.NOOP_LOGGER;

    this.riskDataProvider = riskDataProvider;
  }

  /**
   * Full risk assessment package – derived only from Forecast.
   */
  async assess({
    userId,
    businessId,
    horizon = '30D',
    whatIfChanges = null,
    now = new Date(),
    traceId = null,
  } = {}) {
    const started = Date.now();
    const tid = traceId || this._traceId(now);

    if (!userId || !businessId) {
      return this._errorPackage('INVALID_PARAMS', now, tid);
    }

    try {
      const data = await this.riskDataProvider.getRiskPackage({
        userId,
        businessId,
        horizon,
        whatIfChanges,
        now,
        traceId: tid,
      });

      if (!data || !data.available) {
        return this._errorPackage('NO_FORECAST_DATA', now, tid);
      }

      // ── Pure interpretation of already-projected numbers ──────────────
      const domainRisks = this._buildDomainRisks(data);
      const overall = this._buildOverall(data, domainRisks);

      const packageResult = {
        generatedAt: data.generatedAt || now.toISOString(),
        horizon: data.horizon,
        period: data.period,

        // Already-projected values (never recalculated)
        projected: Object.freeze(data.projected),

        // Domain risks derived from forecast numbers + forecast risks
        risks: Object.freeze({
          ...domainRisks,
          all: Object.freeze(Object.values(domainRisks)),
        }),

        // Pass-through from Forecast
        forecastRisks: data.forecastRisks,
        forecastSummary: data.forecastSummary,
        scenarios: data.scenarios,
        whatIf: data.whatIf,
        confidence: Object.freeze(data.confidence),

        executiveSummary: Object.freeze(this._buildExecutiveSummary(overall, domainRisks, data)),
        recommendations: Object.freeze(this._generateRecommendations(domainRisks)),

        summary: Object.freeze({
          overallScore: overall.score,
          overallSeverity: overall.severity,
          riskCount: overall.riskCount,
          criticalRisks: overall.critical,
          highRisks: overall.high,
          mediumRisks: overall.medium,
          lowRisks: overall.low,
        }),

        metadata: Object.freeze({
          orchestratorVersion: RiskOrchestrator.VERSION,
          traceId: tid,
          userId,
          businessId,
          horizon: data.horizon,
          source: 'Forecast',
          sourceMetadata: data.sourceMetadata,
          durationMs: Date.now() - started,
        }),
      };

      return Object.freeze(packageResult);
    } catch (err) {
      this.logger.error('[RiskOrchestrator] assess failed', {
        traceId: tid,
        error: err.message,
      });
      return this._errorPackage('ORCHESTRATION_ERROR', now, tid, err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Lean helpers – interpretation only
  // ─────────────────────────────────────────────────────────────

  _buildDomainRisks(data) {
    const p = data.projected || {};
    const conf = data.confidence || {};
    const fRisks = data.forecastRisks?.risks || [];

    // Map already-detected forecast risks by type if present
    const byType = {};
    for (const r of fRisks) {
      if (r?.type) byType[r.type] = r;
    }

    return {
      cash: this._interpretCash(p.cashFlow, conf.cashFlow, byType),
      revenue: this._interpretRevenue(p.revenue, conf.revenue, byType),
      profitability: this._interpretProfit(p.profit, conf.profit, byType),
      expenses: this._interpretExpenses(p.expenses, p.revenue, byType),
      receivables: this._interpretReceivables(p.receivables, byType),
      payables: this._interpretPayables(p.payables, byType),
      inventory: this._interpretInventory(p.inventory, p.revenue, byType),
    };
  }

  _interpretCash(forecastCash, confidence, byType) {
    // Prefer forecast-detected risk if available, otherwise simple rule on projected value
    if (byType.CASH_FLOW || byType.CASH) {
      return byType.CASH_FLOW || byType.CASH;
    }

    const score = forecastCash < 0 ? 80 : forecastCash < 100000 ? 45 : 15;
    return RiskContracts.createCashRisk({
      score,
      currentCash: forecastCash,
      averageMonthlyBurn: 0,          // not re-calculated
      cashRunwayMonths: null,
      confidence: (confidence || 50) / 100,
    });
  }

  _interpretRevenue(forecastRevenue, confidence, byType) {
    if (byType.REVENUE) return byType.REVENUE;

    const score = forecastRevenue <= 0 ? 70 : 20;
    return RiskContracts.createRevenueRisk({
      score,
      currentRevenue: forecastRevenue,
      previousRevenue: forecastRevenue, // no independent history calc
      revenueGrowth: 0,
      confidence: (confidence || 50) / 100,
    });
  }

  _interpretProfit(forecastProfit, confidence, byType) {
    if (byType.PROFITABILITY) return byType.PROFITABILITY;

    const score = forecastProfit < 0 ? 85 : forecastProfit < 50000 ? 40 : 15;
    return RiskContracts.createProfitabilityRisk({
      score,
      currentMargin: 0,
      previousMargin: 0,
      marginChange: 0,
      confidence: (confidence || 50) / 100,
    });
  }

  _interpretExpenses(forecastExpenses, forecastRevenue, byType) {
    if (byType.EXPENSE) return byType.EXPENSE;

    const ratio = forecastRevenue > 0 ? forecastExpenses / forecastRevenue : 0;
    const score = ratio > 0.8 ? 65 : ratio > 0.6 ? 40 : 15;
    return RiskContracts.createExpenseRisk({
      score,
      currentExpenses: forecastExpenses,
      previousExpenses: forecastExpenses,
      expenseGrowth: 0,
      revenueGrowth: 0,
    });
  }

  _interpretReceivables(forecastReceivables, byType) {
    if (byType.RECEIVABLES) return byType.RECEIVABLES;

    const score = forecastReceivables > 500000 ? 50 : 20;
    return RiskContracts.createReceivablesRisk({
      score,
      totalReceivables: forecastReceivables,
      overdueReceivables: 0,
      overduePercentage: 0,
    });
  }

  _interpretPayables(forecastPayables, byType) {
    if (byType.PAYABLES) return byType.PAYABLES;

    const score = forecastPayables > 400000 ? 55 : 20;
    return RiskContracts.createPayablesRisk({
      score,
      totalPayables: forecastPayables,
      overduePayables: 0,
      overduePercentage: 0,
    });
  }

  _interpretInventory(forecastInventory, forecastRevenue, byType) {
    if (byType.INVENTORY) return byType.INVENTORY;

    const score = forecastInventory > forecastRevenue * 2 ? 60 : 20;
    return RiskContracts.createInventoryRisk({
      score,
      inventoryValue: forecastInventory,
      inventoryGrowth: 0,
      revenueGrowth: 0,
      lowStockItems: 0,
    });
  }

  _buildOverall(data, domainRisks) {
    const all = Object.values(domainRisks).filter(Boolean);
    const critical = all.filter(r => r.severity === 'CRITICAL').length;
    const high = all.filter(r => r.severity === 'HIGH').length;
    const medium = all.filter(r => r.severity === 'MEDIUM').length;
    const low = all.filter(r => r.severity === 'LOW').length;

    // Prefer overall severity already computed by Forecast if present
    let severity = data.forecastRisks?.overallSeverity || 'LOW';
    let score = 20;

    if (critical > 0) { severity = 'CRITICAL'; score = 85; }
    else if (high > 1) { severity = 'HIGH'; score = 65; }
    else if (high === 1 || medium > 2) { severity = 'MEDIUM'; score = 40; }

    return { score, severity, riskCount: all.length, critical, high, medium, low };
  }

  _buildExecutiveSummary(overall, domainRisks, data) {
    const top = Object.values(domainRisks)
      .filter(Boolean)
      .sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;

    return {
      overallRisk: {
        score: overall.score,
        severity: overall.severity,
        label: RiskContracts.getSeverityLabel(overall.severity),
      },
      topRisk: top ? {
        type: top.type,
        title: top.title,
        score: top.score,
        severity: top.severity,
      } : null,
      projected: data.projected,
      summary: `Overall risk is ${overall.severity.toLowerCase()} based on Forecast projections.`,
    };
  }

  _generateRecommendations(domainRisks) {
    return Object.values(domainRisks)
      .filter(r => r && (r.severity === 'CRITICAL' || r.severity === 'HIGH'))
      .map(r => ({
        priority: r.severity,
        riskType: r.type,
        title: r.title,
        recommendation: r.recommendation || 'Review projected figures from Forecast.',
        timeframe: r.severity === 'CRITICAL' ? 'Immediate' : 'Short-term',
      }));
  }

  _errorPackage(reason, now, traceId, message = null) {
    return Object.freeze({
      generatedAt: now.toISOString(),
      error: true,
      reason,
      message,
      risks: { all: [] },
      summary: {
        overallScore: 0,
        overallSeverity: 'LOW',
        riskCount: 0,
        criticalRisks: 0,
        highRisks: 0,
        mediumRisks: 0,
        lowRisks: 0,
      },
      metadata: {
        orchestratorVersion: RiskOrchestrator.VERSION,
        traceId,
      },
    });
  }

  _traceId(now) {
    const t = (now instanceof Date ? now.getTime() : Date.now()).toString(36);
    return `risk_${t}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

module.exports = RiskOrchestrator;