// src/application/services/risk/rules/RiskRules.js
'use strict';

/**
 * RiskRules - SSOT v1.2.1 / Production
 * Single Source of Truth for all detection thresholds.
 */
class RiskRules {
  static VERSION = '1.2.1';

  constructor({ thresholds = null, enabled = null, logger = console } = {}) {
    this.logger = logger;

    this._defaults = Object.freeze({
      cash: {
        runwayMonths: { critical: 1, high: 2, medium: 3, low: 6 },
        burnRate: { critical: 500_000, high: 200_000, medium: 100_000 },
        negativeCash: true,
      },
      revenue: {
        growthDecline: { critical: -30, high: -15, medium: -5, low: 0 },
        volatility: { high: 0.5, medium: 0.3, low: 0.15 },
        dataPointsMin: 3,
      },
      profitability: {
        marginDecline: { critical: -10, high: -5, medium: -2, low: 0 },
        marginLevels: { critical: 0, high: 5, medium: 10, low: 20 },
        negativeMargin: true,
      },
      expenses: {
        growthVsRevenue: { critical: 20, high: 10, medium: 5, low: 0 },
        expenseRatio: { critical: 60, high: 40, medium: 30, low: 20 },
        categoryConcentration: { critical: 60, high: 40, medium: 25 },
      },
      receivables: {
        overduePercentage: { critical: 60, high: 40, medium: 25, low: 10 },
        overdueAmount: { critical: 1_000_000, high: 500_000, medium: 100_000 },
        collectionRate: { critical: 50, high: 65, medium: 80, low: 90 },
        growth: { critical: 30, high: 20, medium: 10 },
      },
      payables: {
        overduePercentage: { critical: 60, high: 40, medium: 25, low: 10 },
        overdueAmount: { critical: 1_000_000, high: 500_000, medium: 100_000 },
        growth: { critical: 30, high: 20, medium: 10 },
      },
      inventory: {
        growthVsRevenue: { critical: 20, high: 10, medium: 5 },
        lowStockCount: { critical: 10, high: 5, medium: 2 },
        inventoryToRevenueRatio: { critical: 60, high: 40, medium: 25 },
        concentration: { critical: 60, high: 40, medium: 25 },
      },
      persistence: { critical: 90, high: 70, medium: 50, low: 30 },
    });

    this._enabledDefaults = Object.freeze({
      cashRisk: true,
      revenueRisk: true,
      profitabilityRisk: true,
      expenseRisk: true,
      receivablesRisk: true,
      payablesRisk: true,
      inventoryRisk: true,
      anomalyDetection: true,
    });

    this.thresholds = this._deepFreeze(this._mergeDeep(this._defaults, thresholds));
    this.enabled = this._deepFreeze({ ...this._enabledDefaults, ...enabled });
    this._cache = new Map();
  }

  getThresholds(type) {
    return this.thresholds[type] ? { ...this.thresholds[type] } : null;
  }

  getThreshold(type, key, subKey) {
    const cacheKey = `${type}.${key}.${subKey ?? ''}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    const thresholds = this.thresholds[type];
    if (!thresholds) return null;

    const value =
      subKey !== undefined
        ? thresholds[key]?.[subKey] ?? null
        : thresholds[key] ?? null;

    this._cache.set(cacheKey, value);
    return value;
  }

  isEnabled(type) {
    const key = type.endsWith('Risk') ? type : `${type}Risk`;
    return this.enabled[key] !== false;
  }

  withThresholds(type, thresholds) {
    const newThresholds = this._mergeDeep(this.thresholds, { [type]: thresholds });
    return new RiskRules({
      thresholds: newThresholds,
      enabled: this.enabled,
      logger: this.logger,
    });
  }

  withEnabled(enabled) {
    return new RiskRules({
      thresholds: this.thresholds,
      enabled: { ...this.enabled, ...enabled },
      logger: this.logger,
    });
  }

  scoreValue(value, thresholds, inverse = false) {
    if (!thresholds || value === null || value === undefined) return 0;
    const val = this._safeNumber(value);

    if (inverse) {
      if (val >= (thresholds.critical ?? Infinity)) return 100;
      if (val >= (thresholds.high ?? Infinity)) return 75;
      if (val >= (thresholds.medium ?? Infinity)) return 50;
      if (val >= (thresholds.low ?? Infinity)) return 25;
      return 0;
    }

    if (val <= (thresholds.critical ?? -Infinity)) return 100;
    if (val <= (thresholds.high ?? -Infinity)) return 75;
    if (val <= (thresholds.medium ?? -Infinity)) return 50;
    if (val <= (thresholds.low ?? -Infinity)) return 25;
    return 0;
  }

  getAllThresholds() {
    return this.thresholds;
  }

  snapshot() {
    return Object.freeze({
      version: RiskRules.VERSION,
      thresholds: this.thresholds,
      enabled: this.enabled,
      timestamp: new Date().toISOString(),
    });
  }

  _mergeDeep(target, source) {
    if (!source) return target;
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      const tgtVal = target[key];
      if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
        result[key] = this._mergeDeep(tgtVal || {}, srcVal);
      } else if (srcVal !== undefined) {
        result[key] = srcVal;
      }
    }
    return result;
  }

  _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = obj[prop];
      if (value && typeof value === 'object') this._deepFreeze(value);
    });
    return obj;
  }

  _safeNumber(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }
}

module.exports = RiskRules;