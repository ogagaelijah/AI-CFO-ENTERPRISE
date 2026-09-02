'use strict';

/**
 * RiskRules – SSOT v1.3.0-prod
 *
 * Single source of truth for all risk thresholds, feature flags, and
 * scoring helpers used by RiskEngine, calculators, and AnomalyDetector.
 *
 * @version 1.3.0
 */

const VERSION = '1.3.0';

// ─── Default thresholds (all domains) ───────────────────────────────────────
const DEFAULT_THRESHOLDS = Object.freeze({
  cash: Object.freeze({
    runwayMonths: Object.freeze({
      critical: 1,
      high: 2,
      medium: 3,
      low: 6,
    }),
  }),

  revenue: Object.freeze({
    // Key name must match RiskAggregators tests + calculators
    revenueGrowth: Object.freeze({
      critical: -30,
      high: -15,
      medium: -5,
      low: 0,
    }),
    // Alias kept for any legacy callers
    growthPercent: Object.freeze({
      critical: -30,
      high: -15,
      medium: -5,
      low: 0,
    }),
  }),

  profitability: Object.freeze({
    marginChangePoints: Object.freeze({
      critical: -10,
      high: -5,
      medium: -2,
      low: 0,
    }),
  }),

  expense: Object.freeze({
    growthVsRevenueRatio: Object.freeze({
      critical: 2.0,
      high: 1.5,
      medium: 1.2,
      low: 1.0,
    }),
  }),

  receivables: Object.freeze({
    overduePercentage: Object.freeze({
      critical: 60,
      high: 40,
      medium: 25,
      low: 10,
    }),
  }),

  payables: Object.freeze({
    overduePercentage: Object.freeze({
      critical: 50,
      high: 30,
      medium: 15,
      low: 5,
    }),
  }),

  inventory: Object.freeze({
    growthVsRevenueRatio: Object.freeze({
      critical: 2.0,
      high: 1.5,
      medium: 1.2,
      low: 1.0,
    }),
    lowStockItems: Object.freeze({
      critical: 10,
      high: 5,
      medium: 2,
      low: 0,
    }),
  }),

  trend: Object.freeze({
    worseningThreshold: 10,
    improvingThreshold: -10,
  }),

  persistence: Object.freeze({
    persistentWeeks: 3,
    entrenchedWeeks: 8,
  }),

  // AnomalyDetector domain (full key set)
  anomaly: Object.freeze({
    defaultMethod: 'robust_zscore',
    zScoreThreshold: 2.5,
    robustZScoreThreshold: 3.5,
    madConsistencyConstant: 0.6745,
    minDeviationPercent: 30,
    movingAverageWindowRatio: 0.2,
    movingAverageMinWindow: 3,
    movingAverageMaxWindow: 14,
    iqrMildMultiplier: 1.5,
    iqrExtremeMultiplier: 3.0,
    minDataPoints: 10,
    maxInputLength: 50_000,
    cacheMaxSize: 1000,
    cacheTtlMs: 5 * 60 * 1000,
    severityCriticalRatio: 3.0,
    severityHighRatio: 2.0,
    severityMediumRatio: 1.5,
    severityCriticalPercent: 100,
    severityHighPercent: 60,
    severityMediumPercent: 40,
    scoreBaseCritical: 85,
    scoreBaseHigh: 60,
    scoreBaseMedium: 35,
    scoreBaseLow: 15,
    scorePerAnomaly: 3,
    scorePerAnomalyCap: 15,
  }),
});

// Feature flags – both camelCase risk names and short domain keys
const DEFAULT_FEATURES = Object.freeze({
  cashRisk: true,
  cash: true,
  revenueRisk: true,
  revenue: true,
  profitabilityRisk: true,
  profitability: true,
  expenseRisk: true,
  expense: true,
  receivablesRisk: true,
  receivables: true,
  payablesRisk: true,
  payables: true,
  inventoryRisk: true,
  inventory: true,
  anomalyRisk: true,
  anomaly: true,
});

// Score mapping for band thresholds
const BAND_SCORES = Object.freeze({
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  none: 0,
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const v = obj[prop];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return obj;
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      base[k] &&
      typeof base[k] === 'object' &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function toNumber(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// ─── RiskRules ──────────────────────────────────────────────────────────────
class RiskRules {
  /**
   * @param {object} [options]
   * @param {object} [options.logger]
   * @param {object} [options.overrides] Deep-merge over defaults
   * @param {object} [options.features] Feature flag overrides
   */
  constructor({ logger = console, overrides = null, features = null } = {}) {
    this.logger = logger;
    this._thresholds = deepFreeze(
      deepMerge(DEFAULT_THRESHOLDS, overrides || {})
    );
    this._features = deepFreeze({
      ...DEFAULT_FEATURES,
      ...(features && typeof features === 'object' ? features : {}),
    });
    this._version = VERSION;
  }

  /**
   * Full threshold object for a domain (e.g. 'cash', 'anomaly', 'receivables').
   * @param {string} domain
   * @returns {Readonly<object>}
   */
  getThresholds(domain) {
    const t = this._thresholds[domain];
    if (!t) {
      this.logger.warn?.(
        `[RiskRules] Unknown domain: ${domain}, returning empty object`
      );
      return Object.freeze({});
    }
    return t;
  }

  /**
   * Single threshold value.
   * @param {string} domain e.g. 'receivables'
   * @param {string} metric e.g. 'overduePercentage'
   * @param {string} level e.g. 'critical' | 'high' | 'medium' | 'low'
   * @returns {number|undefined}
   */
  getThreshold(domain, metric, level) {
    const domainCfg = this._thresholds[domain];
    if (!domainCfg) return undefined;
    const metricCfg = domainCfg[metric];
    if (metricCfg == null) return undefined;
    // Flat numeric (anomaly keys) vs band object
    if (typeof metricCfg === 'number') return metricCfg;
    if (typeof metricCfg === 'object' && level != null) {
      return metricCfg[level];
    }
    return metricCfg;
  }

  /**
   * Map a raw metric value to a risk score [0, 100] using band thresholds.
   *
   * Default (inverse=false): lower value → higher risk
   * e.g. runway months: 0.5 → 100, 10 → 0
   *
   * inverse=true: higher value → higher risk
   * e.g. overdue %: 40 → 100, 3 → 0
   *
   * @param {number} value
   * @param {{ critical: number, high: number, medium: number, low: number }} bands
   * @param {boolean} [inverse=false]
   * @returns {number} 0 | 25 | 50 | 75 | 100
   */
  scoreValue(value, bands, inverse = false) {
    if (!bands || typeof bands !== 'object') return 0;
    const v = toNumber(value, NaN);
    if (!Number.isFinite(v)) return 0;

    const { critical, high, medium, low } = bands;

    if (!inverse) {
      // Lower is riskier (runway, growth when negative bands, etc.)
      if (v <= critical) return BAND_SCORES.critical;
      if (v <= high) return BAND_SCORES.high;
      if (v <= medium) return BAND_SCORES.medium;
      if (v <= low) return BAND_SCORES.low;
      return BAND_SCORES.none;
    }

    // Higher is riskier (overdue %, expense growth ratio, etc.)
    if (v >= critical) return BAND_SCORES.critical;
    if (v >= high) return BAND_SCORES.high;
    if (v >= medium) return BAND_SCORES.medium;
    if (v >= low) return BAND_SCORES.low;
    return BAND_SCORES.none;
  }

  /**
   * Feature flag check. Accepts both 'cashRisk' and 'cash' style names.
   * @param {string} name
   * @returns {boolean}
   */
  isEnabled(name) {
    if (name == null) return false;
    const key = String(name);
    if (Object.prototype.hasOwnProperty.call(this._features, key)) {
      return !!this._features[key];
    }
    // Try stripping / adding "Risk" suffix
    if (key.endsWith('Risk')) {
      const short = key.slice(0, -4);
      if (Object.prototype.hasOwnProperty.call(this._features, short)) {
        return !!this._features[short];
      }
    } else {
      const long = `${key}Risk`;
      if (Object.prototype.hasOwnProperty.call(this._features, long)) {
        return !!this._features[long];
      }
    }
    return false;
  }

  /**
   * Return a new RiskRules instance with domain thresholds merged.
   * Does not mutate the current instance.
   *
   * @param {string} domain
   * @param {object} partialThresholds
   * @returns {RiskRules}
   */
  withThresholds(domain, partialThresholds) {
    if (!domain || typeof domain !== 'string') {
      throw new TypeError('domain is required');
    }
    const overrides = {
      [domain]: deepMerge(
        this._thresholds[domain] || {},
        partialThresholds || {}
      ),
    };
    return new RiskRules({
      logger: this.logger,
      overrides: deepMerge(this._thresholds, overrides),
      features: { ...this._features },
    });
  }

  /**
   * Frozen snapshot for diagnostics / audit.
   * @returns {Readonly<object>}
   */
  snapshot() {
    return deepFreeze({
      version: this._version,
      thresholds: { ...this._thresholds },
      features: { ...this._features },
      enabled: { ...this._features }, // alias expected by integration tests / consumers
      generatedAt: new Date().toISOString(),
    });
  }

  /** @returns {string} */
  get version() {
    return this._version;
  }
}

module.exports = RiskRules;