'use strict';

/**
 * Decision Engine Factory
 * Path: src/application/services/decision/DecisionEngineFactory.js
 * @version 1.1.0-prod
 */

const DecisionEngine = require('./DecisionEngine');

class DecisionEngineFactory {
  static create(options = {}) {
    const {
      dataProviders = {},
      config = {},
      decisionHistory = [],
    } = options || {};

    const defaults = {
      cooldownPeriod: 7 * 24 * 60 * 60 * 1000,
      confidenceThreshold: 60,
      minPriority: 'MEDIUM',
      minImpactThreshold: 10,
      maxDecisions: 50,
    };

    return new DecisionEngine({
      dataProviders,
      cooldownPeriod: config.cooldownPeriod ?? defaults.cooldownPeriod,
      confidenceThreshold:
        config.confidenceThreshold ?? defaults.confidenceThreshold,
      minPriority: config.minPriority ?? defaults.minPriority,
      minImpactThreshold:
        config.minImpactThreshold ?? defaults.minImpactThreshold,
      maxDecisions: config.maxDecisions ?? defaults.maxDecisions,
      decisionHistory: Array.isArray(decisionHistory)
        ? [...decisionHistory]
        : [],
    });
  }

  static createWithDefaultProviders(options = {}) {
    const {
      analyticsProvider = null,
      forecastProvider = null,
      riskProvider = null,
      reportProvider = null,
      inventoryProvider = null,
      customerProvider = null,
      supplierProvider = null,
      config = {},
      decisionHistory = [],
    } = options || {};

    const dataProviders = {};
    if (analyticsProvider) dataProviders.analytics = analyticsProvider;
    if (forecastProvider) dataProviders.forecast = forecastProvider;
    if (riskProvider) dataProviders.risk = riskProvider;
    if (reportProvider) dataProviders.report = reportProvider;
    if (inventoryProvider) dataProviders.inventory = inventoryProvider;
    if (customerProvider) dataProviders.customers = customerProvider;
    if (supplierProvider) dataProviders.suppliers = supplierProvider;

    return DecisionEngineFactory.create({
      dataProviders,
      config,
      decisionHistory,
    });
  }
}

module.exports = DecisionEngineFactory;