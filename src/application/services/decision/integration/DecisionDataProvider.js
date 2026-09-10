// src/application/services/decision/integration/DecisionDataProvider.js
// SSOT v1.0.0-prod – pure consumer of Risk

'use strict';

class DecisionDataProvider {
  constructor({ riskProvider, logger = console } = {}) {
    this.riskProvider = riskProvider; // must expose .assess(...)
    this.logger = logger;
  }

  /**
   * Get a decision-ready package derived entirely from Risk.
   * No independent calculation.
   */
  async getDecisionPackage({
    userId,
    businessId,
    horizon = '30D',
    whatIfChanges = null,
    now = new Date(),
    traceId = null,
  } = {}) {
    const empty = this._emptyPackage();

    try {
      if (!this.riskProvider?.assess) {
        this.logger.warn('[DecisionDataProvider] RiskProvider missing');
        return empty;
      }

      const risk = await this.riskProvider.assess({
        userId,
        businessId,
        horizon,
        whatIfChanges,
        now,
        traceId,
      });

      if (!risk || risk.error) {
        this.logger.warn('[DecisionDataProvider] Risk returned error or empty', {
          error: risk?.reason || risk?.error,
        });
        return empty;
      }

      return this._mapFromRisk(risk, empty);
    } catch (err) {
      this.logger.error('[DecisionDataProvider] Failed', { error: err.message });
      return empty;
    }
  }

  _mapFromRisk(risk, empty) {
    const projected = risk.projected || {};
    const summary = risk.summary || {};
    const executive = risk.executiveSummary || {};
    const domainRisks = risk.risks || {};
    const recommendations = Array.isArray(risk.recommendations)
      ? risk.recommendations
      : [];
    const meta = risk.metadata || {};

    return {
      ...empty,
      generatedAt: risk.generatedAt,
      horizon: risk.horizon,
      period: risk.period,

      // Already-projected numbers from Forecast (via Risk)
      projected: {
        revenue: Number(projected.revenue) || 0,
        cogs: Number(projected.cogs) || 0,
        expenses: Number(projected.expenses) || 0,
        profit: Number(projected.profit) || 0,
        cashFlow: Number(projected.cashFlow) || 0,
        receivables: Number(projected.receivables) || 0,
        payables: Number(projected.payables) || 0,
        inventory: Number(projected.inventory) || 0,
        demand: Number(projected.demand) || 0,
      },

      // Risk summary (already scored)
      riskSummary: {
        overallScore: Number(summary.overallScore) || 0,
        overallSeverity: summary.overallSeverity || 'LOW',
        riskCount: Number(summary.riskCount) || 0,
        criticalRisks: Number(summary.criticalRisks) || 0,
        highRisks: Number(summary.highRisks) || 0,
        mediumRisks: Number(summary.mediumRisks) || 0,
        lowRisks: Number(summary.lowRisks) || 0,
      },

      // Domain risks (already interpreted by Risk)
      domainRisks: {
        cash: domainRisks.cash || null,
        revenue: domainRisks.revenue || null,
        profitability: domainRisks.profitability || null,
        expenses: domainRisks.expenses || null,
        receivables: domainRisks.receivables || null,
        payables: domainRisks.payables || null,
        inventory: domainRisks.inventory || null,
        all: Array.isArray(domainRisks.all) ? domainRisks.all : [],
      },

      // Pass-through
      forecastRisks: risk.forecastRisks || null,
      confidence: risk.confidence || {},
      executiveSummary: executive,
      riskRecommendations: recommendations,
      scenarios: risk.scenarios || null,
      whatIf: risk.whatIf || null,

      sourceMetadata: {
        riskVersion: meta.orchestratorVersion,
        traceId: meta.traceId,
        source: meta.source || 'Risk',
        durationMs: meta.durationMs,
      },

      available: true,
    };
  }

  _emptyPackage() {
    return {
      generatedAt: new Date().toISOString(),
      horizon: null,
      period: null,
      projected: {
        revenue: 0, cogs: 0, expenses: 0, profit: 0,
        cashFlow: 0, receivables: 0, payables: 0,
        inventory: 0, demand: 0,
      },
      riskSummary: {
        overallScore: 0,
        overallSeverity: 'LOW',
        riskCount: 0,
        criticalRisks: 0,
        highRisks: 0,
        mediumRisks: 0,
        lowRisks: 0,
      },
      domainRisks: { all: [] },
      forecastRisks: null,
      confidence: {},
      executiveSummary: {},
      riskRecommendations: [],
      scenarios: null,
      whatIf: null,
      sourceMetadata: {},
      available: false,
    };
  }
}

module.exports = DecisionDataProvider;