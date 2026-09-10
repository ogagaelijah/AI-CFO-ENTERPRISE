// src/application/services/advisor/integration/AdvisorDataProvider.js
// SSOT v1.0.0-prod – pure consumer of Decision

'use strict';

class AdvisorDataProvider {
  constructor({ decisionProvider, logger = console } = {}) {
    this.decisionProvider = decisionProvider; // must expose .generate(...)
    this.logger = logger;
  }

  async getAdvisorPackage({
    userId,
    businessId,
    horizon = '30D',
    whatIfChanges = null,
    now = new Date(),
    traceId = null,
  } = {}) {
    const empty = this._emptyPackage();

    try {
      if (!this.decisionProvider?.generate) {
        this.logger.warn('[AdvisorDataProvider] DecisionProvider missing');
        return empty;
      }

      const decision = await this.decisionProvider.generate({
        userId,
        businessId,
        horizon,
        whatIfChanges,
        now,
        traceId,
      });

      if (!decision || decision.error) {
        this.logger.warn('[AdvisorDataProvider] Decision returned error', {
          error: decision?.reason || decision?.error,
        });
        return empty;
      }

      return this._mapFromDecision(decision, empty);
    } catch (err) {
      this.logger.error('[AdvisorDataProvider] Failed', { error: err.message });
      return empty;
    }
  }

  _mapFromDecision(decision, empty) {
    return {
      ...empty,
      generatedAt: decision.generatedAt,
      horizon: decision.horizon,
      period: decision.period,

      projected: decision.projected || {},
      decisions: Array.isArray(decision.decisions) ? decision.decisions : [],
      decisionSummary: decision.summary || {},
      riskSummary: decision.riskSummary || {},
      domainRisks: decision.domainRisks || {},
      executiveSummary: decision.executiveSummary || {},
      recommendations: Array.isArray(decision.recommendations)
        ? decision.recommendations
        : [],

      sourceMetadata: {
        decisionVersion: decision.metadata?.engineVersion,
        traceId: decision.metadata?.traceId,
        source: 'Decision',
        durationMs: decision.metadata?.durationMs,
      },
      available: true,
    };
  }

  _emptyPackage() {
    return {
      generatedAt: new Date().toISOString(),
      horizon: null,
      period: null,
      projected: {},
      decisions: [],
      decisionSummary: {},
      riskSummary: {},
      domainRisks: {},
      executiveSummary: {},
      recommendations: [],
      sourceMetadata: {},
      available: false,
    };
  }
}

module.exports = AdvisorDataProvider;