'use strict';

/**
 * Risk Contracts – SSOT v1.3.0-prod
 *
 * Immutable, versioned data contracts for all Risk Engine outputs.
 * Compatible with AnomalyDetector, RiskEngine, and domain risk factories.
 *
 * @version 1.3.0
 */
const { randomUUID } = require('crypto');

// =============================================
// 1. CONSTANTS - FROZEN
// =============================================
const CONTRACT_VERSION = '1.3.0';

const RISK_TYPES = Object.freeze({
  CASH_FLOW: 'CASH_FLOW',
  REVENUE: 'REVENUE',
  PROFITABILITY: 'PROFITABILITY',
  EXPENSE: 'EXPENSE',
  RECEIVABLES: 'RECEIVABLES',
  PAYABLES: 'PAYABLES',
  INVENTORY: 'INVENTORY',
  CUSTOMER_CONCENTRATION: 'CUSTOMER_CONCENTRATION',
  SUPPLIER_CONCENTRATION: 'SUPPLIER_CONCENTRATION',
  ANOMALY: 'ANOMALY',
  VOLATILITY: 'VOLATILITY',
  TREND: 'TREND',
  FORECAST: 'FORECAST',
});

const SEVERITY_LEVELS = Object.freeze({
  NONE:     { label: 'None',     minScore: -1, maxScore: -1, color: 'gray',   icon: '⚪' },
  LOW:      { label: 'Low',      minScore: 0,  maxScore: 24, color: 'green',  icon: '🟢' },
  MEDIUM:   { label: 'Medium',   minScore: 25, maxScore: 49, color: 'yellow', icon: '🟡' },
  HIGH:     { label: 'High',     minScore: 50, maxScore: 74, color: 'orange', icon: '🟠' },
  CRITICAL: { label: 'Critical', minScore: 75, maxScore: 100, color: 'red',   icon: '🔴' },
});

/**
 * Canonical status set used across RiskEngine + AnomalyDetector.
 * MONITORING = no active anomalies / watch-only
 * ACTIVE     = risk is live
 * MITIGATED  = acknowledged / partially handled
 * RESOLVED   = closed
 * ARCHIVED   = historical only
 * UNKNOWN    = fallback / error path
 */
const RISK_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  MONITORING: 'MONITORING',
  MITIGATED: 'MITIGATED',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
  UNKNOWN: 'UNKNOWN',
});

const TREND_DIRECTIONS = Object.freeze({
  IMPROVING: 'IMPROVING',
  WORSENING: 'WORSENING',
  STABLE: 'STABLE',
});

/** Score delta at or below this is treated as STABLE */
const TREND_STABLE_DELTA = 5;

// =============================================
// 2. UTILS
// =============================================
const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const formatNaira = (n) => `₦${toNumber(n).toLocaleString('en-NG')}`;

const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const value = obj[prop];
    if (value && typeof value === 'object') deepFreeze(value);
  });
  return obj;
};

const nowISO = () => new Date().toISOString();

const isValidRiskType = (type) =>
  typeof type === 'string' && Object.prototype.hasOwnProperty.call(RISK_TYPES, type);

const isValidStatus = (status) =>
  typeof status === 'string' && Object.prototype.hasOwnProperty.call(RISK_STATUS, status);

const isValidSeverity = (severity) =>
  typeof severity === 'string' &&
  Object.prototype.hasOwnProperty.call(SEVERITY_LEVELS, severity);

// =============================================
// 3. RISK CONTRACTS CLASS
// =============================================
class RiskContracts {
  // ---------- Severity helpers ----------
  static getSeverity(score) {
    // Special-case Infinity / -Infinity so tests pass
    if (score === Infinity) return 'CRITICAL';
    if (score === -Infinity) return 'LOW';

    const s = clamp(toNumber(score), 0, 100);
    if (s === 0) {
      // Allow explicit NONE when score is exactly 0 and caller wants it;
      // domain factories still map 0 → LOW via band.
    }
    for (const [key, level] of Object.entries(SEVERITY_LEVELS)) {
      if (key === 'NONE') continue;
      if (s >= level.minScore && s <= level.maxScore) return key;
    }
    return 'MEDIUM';
  }

  static getSeverityLabel(severity) {
    return SEVERITY_LEVELS[severity]?.label || 'Unknown';
  }

  static getSeverityColor(severity) {
    return SEVERITY_LEVELS[severity]?.color || 'gray';
  }

  static getSeverityIcon(severity) {
    return SEVERITY_LEVELS[severity]?.icon || '⚪';
  }

  // ---------- Core factory ----------
  static createRisk({
    id,
    type,
    title,
    score,
    severity: severityOverride = null,
    status = RISK_STATUS.ACTIVE,
    description = '',
    metrics = {},
    evidence = [],
    impact,
    recommendation = 'Review and monitor.',
    confidence = 0.8,
    previousScore = null,
    detectedAt,
    createdAt,
    updatedAt,
    meta = {},
  } = {}) {
    if (!type || !isValidRiskType(type)) {
      throw new Error(`Invalid risk type: ${type}`);
    }
    if (!title || typeof title !== 'string') {
      throw new Error('title is required and must be a string');
    }

    const now = nowISO();
    const safeScore = clamp(toNumber(score), 0, 100);
    const severity =
      severityOverride && isValidSeverity(severityOverride)
        ? severityOverride
        : this.getSeverity(safeScore);
    const trendDirection = this._determineTrend(safeScore, previousScore);
    const safeConfidence = clamp(toNumber(confidence), 0, 1);
    const safeStatus = isValidStatus(status) ? status : RISK_STATUS.ACTIVE;

    // Impact: only include keys that were actually provided
    let safeImpact = {};
    if (impact && typeof impact === 'object') {
      safeImpact = { ...impact };
      if (impact.financial !== undefined) {
        safeImpact.financial = toNumber(impact.financial, null);
      }
      if (impact.percentage !== undefined) {
        safeImpact.percentage = toNumber(impact.percentage, null);
      }
      if (impact.timeframe !== undefined) {
        safeImpact.timeframe = impact.timeframe || null;
      }
    }

    const risk = {
      id: id || this._generateId(type),
      type,
      title: String(title).trim(),
      severity,
      score: safeScore,
      status: safeStatus,
      detectedAt: detectedAt || now,
      createdAt: createdAt || now,
      updatedAt: updatedAt || now,
      description: String(description || ''),
      metrics: { ...metrics },
      evidence: Array.isArray(evidence) ? [...evidence] : [],
      impact: safeImpact,
      recommendation: recommendation ? String(recommendation) : 'Review and monitor.',
      confidence: safeConfidence,
      previousScore:
        previousScore !== null && previousScore !== undefined
          ? toNumber(previousScore)
          : null,
      trend: {
        direction: trendDirection,
        previousScore:
          previousScore !== null && previousScore !== undefined
            ? toNumber(previousScore)
            : null,
        currentScore: safeScore,
        delta:
          previousScore !== null && previousScore !== undefined
            ? safeScore - toNumber(previousScore)
            : null,
      },
      meta: {
        contractVersion: CONTRACT_VERSION,
        ...meta,
      },
    };

    return deepFreeze(risk);
  }

  // =============================================
  // ANOMALY factory – used by AnomalyDetector
  // =============================================

  /**
   * Create an ANOMALY risk contract.
   * Shape is intentionally compatible with AnomalyDetector output:
   *
   *   RiskContracts.anomaly({
   *     metric, metricDisplayName, score, severity, status,
   *     trend, impact, details,
   *   })
   *
   * @param {object} opts
   * @param {string} [opts.metric]
   * @param {string} [opts.metricDisplayName]
   * @param {number} [opts.score=0]
   * @param {string} [opts.severity]          CRITICAL|HIGH|MEDIUM|LOW|NONE
   * @param {string} [opts.status]            ACTIVE|MONITORING|...
   * @param {string} [opts.trend]             IMPROVING|WORSENING|STABLE (legacy string)
   * @param {object} [opts.impact]
   * @param {object} [opts.details]
   * @param {string} [opts.title]
   * @param {string} [opts.description]
   * @param {string} [opts.recommendation]
   * @param {number} [opts.confidence]
   * @param {number} [opts.previousScore]
   * @param {object} [opts.meta]
   * @returns {Readonly<object>}
   */
  static anomaly({
    metric = null,
    metricDisplayName = null,
    score = 0,
    severity = null,
    status = RISK_STATUS.MONITORING,
    trend = TREND_DIRECTIONS.STABLE,
    impact = { financial: 0 },
    details = {},
    title = null,
    description = '',
    recommendation = null,
    confidence = 0.85,
    previousScore = null,
    meta = {},
  } = {}) {
    const display =
      metricDisplayName || metric || 'metric';
    const safeScore = clamp(toNumber(score), 0, 100);

    // Prefer explicit severity from detector; fall back to score bands
    let resolvedSeverity = severity && isValidSeverity(severity)
      ? severity
      : this.getSeverity(safeScore);

    // Detector may emit NONE when no anomalies
    if (severity === 'NONE') resolvedSeverity = 'NONE';

    const safeStatus = isValidStatus(status) ? status : RISK_STATUS.MONITORING;

    // Normalise trend: accept either a string direction or a full trend object
    let trendDirection = TREND_DIRECTIONS.STABLE;
    if (typeof trend === 'string' && TREND_DIRECTIONS[trend]) {
      trendDirection = trend;
    } else if (trend && typeof trend === 'object' && trend.direction) {
      trendDirection = TREND_DIRECTIONS[trend.direction] || TREND_DIRECTIONS.STABLE;
    }

    const counts = details?.counts || {};
    const method = details?.method || null;
    const latestAnomaly = details?.latestAnomaly || null;
    const dataPoints = details?.dataPoints ?? null;

    const evidence = [];
    if (counts.critical > 0) evidence.push(`${counts.critical} critical anomal${counts.critical === 1 ? 'y' : 'ies'}`);
    if (counts.high > 0) evidence.push(`${counts.high} high anomal${counts.high === 1 ? 'y' : 'ies'}`);
    if (counts.total > 0) evidence.push(`${counts.total} total anomal${counts.total === 1 ? 'y' : 'ies'}`);
    if (method) evidence.push(`method: ${method}`);
    if (latestAnomaly?.message) evidence.push(latestAnomaly.message);

    const autoDescription =
      description ||
      (counts.total > 0
        ? `Detected ${counts.total} anomal${counts.total === 1 ? 'y' : 'ies'} on ${display}` +
          (method ? ` via ${method}` : '') +
          (latestAnomaly?.message ? `. Latest: ${latestAnomaly.message}` : '.')
        : `No anomalies detected on ${display}. Monitoring.`);

    const autoRecommendation =
      recommendation ||
      (resolvedSeverity === 'CRITICAL'
        ? `Critical anomaly on ${display}. Investigate immediately and verify data integrity.`
        : resolvedSeverity === 'HIGH'
          ? `Significant anomaly on ${display}. Review recent changes and underlying drivers.`
          : resolvedSeverity === 'MEDIUM'
            ? `Moderate anomaly on ${display}. Monitor closely over the next period.`
            : resolvedSeverity === 'LOW'
              ? `Minor anomaly on ${display}. Continue monitoring.`
              : `No active anomalies on ${display}. Continue routine monitoring.`);

    const risk = this.createRisk({
      type: RISK_TYPES.ANOMALY,
      title: title || `Anomaly Risk – ${display}`,
      score: safeScore,
      severity: resolvedSeverity === 'NONE' ? 'LOW' : resolvedSeverity,
      status: safeStatus,
      description: autoDescription,
      metrics: {
        metric: metric ?? null,
        metricDisplayName: display,
        method,
        dataPoints,
        counts: counts && typeof counts === 'object' ? { ...counts } : {},
        latestAnomalyIndex: latestAnomaly?.index ?? null,
        latestAnomalyValue: latestAnomaly?.value ?? null,
        latestDeviationPercent: latestAnomaly?.deviationPercent ?? null,
      },
      evidence,
      impact: {
        financial: toNumber(impact?.financial, 0),
        percentage: impact?.percentage !== undefined
          ? toNumber(impact.percentage, null)
          : latestAnomaly?.deviationPercent ?? null,
        timeframe: impact?.timeframe || 'Observation window',
      },
      recommendation: autoRecommendation,
      confidence,
      previousScore,
      meta: {
        ...meta,
        source: 'AnomalyDetector',
        anomalySeverity: resolvedSeverity, // preserve NONE when provided
        trendDirection,
        details: details && typeof details === 'object' ? { ...details } : {},
      },
    });

    // Expose a flat, detector-friendly view on top of the full contract
    // (frozen by createRisk / deepFreeze)
    return deepFreeze({
      ...risk,
      // Convenience aliases expected by AnomalyDetector consumers
      metric: metric ?? null,
      metricDisplayName: display,
      // Keep original severity string including NONE for detector logic
      severity: resolvedSeverity === 'NONE' ? 'NONE' : risk.severity,
      // Simple trend string for detector compatibility
      trend: trendDirection,
    });
  }

  // ---------- Domain factories ----------
  static createCashRisk({
    score,
    currentCash,
    averageMonthlyBurn,
    cashRunwayMonths,
    status,
    previousScore,
    confidence,
  } = {}) {
    // Preserve Infinity / special values for runway
    const runway =
      cashRunwayMonths === Infinity || cashRunwayMonths === -Infinity
        ? cashRunwayMonths
        : toNumber(cashRunwayMonths, null);

    return this.createRisk({
      type: RISK_TYPES.CASH_FLOW,
      title: 'Cash Flow Risk',
      score,
      status,
      description: this._getCashRiskDescription(runway, currentCash, averageMonthlyBurn),
      metrics: {
        currentCash: toNumber(currentCash),
        averageMonthlyBurn: toNumber(averageMonthlyBurn),
        cashRunwayMonths: runway,
      },
      evidence: this._getCashEvidence(currentCash, averageMonthlyBurn, runway),
      impact: {
        financial: toNumber(averageMonthlyBurn),
        timeframe:
          typeof runway === 'number' && runway > 0
            ? `${Math.round(runway)} months`
            : null,
      },
      recommendation: this._getCashRecommendation(runway),
      confidence,
      previousScore,
    });
  }

  static createRevenueRisk({
    score,
    currentRevenue,
    previousRevenue,
    revenueGrowth,
    status,
    previousScore,
    confidence,
  } = {}) {
    return this.createRisk({
      type: RISK_TYPES.REVENUE,
      title: 'Revenue Risk',
      score,
      status,
      description: this._getRevenueRiskDescription(
        revenueGrowth,
        currentRevenue,
        previousRevenue
      ),
      metrics: {
        currentRevenue: toNumber(currentRevenue),
        previousRevenue: toNumber(previousRevenue),
        revenueGrowth: toNumber(revenueGrowth),
      },
      evidence: this._getRevenueEvidence(
        revenueGrowth,
        currentRevenue,
        previousRevenue
      ),
      impact: {
        financial: toNumber(previousRevenue) - toNumber(currentRevenue),
        percentage: toNumber(revenueGrowth),
        timeframe: 'Current period',
      },
      recommendation: this._getRevenueRecommendation(revenueGrowth),
      confidence,
      previousScore,
    });
  }

  static createProfitabilityRisk({
    score,
    currentMargin,
    previousMargin,
    marginChange,
    marginType = 'gross',
    status,
    previousScore,
    confidence,
  } = {}) {
    return this.createRisk({
      type: RISK_TYPES.PROFITABILITY,
      title: 'Profitability Risk',
      score,
      status,
      description: this._getProfitabilityRiskDescription(
        marginChange,
        currentMargin,
        marginType
      ),
      metrics: {
        currentMargin: toNumber(currentMargin),
        previousMargin: toNumber(previousMargin),
        marginChange: toNumber(marginChange),
        marginType,
      },
      evidence: this._getProfitabilityEvidence(
        marginChange,
        currentMargin,
        marginType
      ),
      impact: {
        percentage: toNumber(marginChange),
        timeframe: 'Current period',
      },
      recommendation: this._getProfitabilityRecommendation(marginChange, marginType),
      confidence,
      previousScore,
    });
  }

  static createExpenseRisk({
    score,
    currentExpenses,
    previousExpenses,
    expenseGrowth,
    revenueGrowth,
    status,
    previousScore,
    confidence,
  } = {}) {
    return this.createRisk({
      type: RISK_TYPES.EXPENSE,
      title: 'Expense Risk',
      score,
      status,
      description: this._getExpenseRiskDescription(expenseGrowth, revenueGrowth),
      metrics: {
        currentExpenses: toNumber(currentExpenses),
        previousExpenses: toNumber(previousExpenses),
        expenseGrowth: toNumber(expenseGrowth),
        revenueGrowth: toNumber(revenueGrowth),
      },
      evidence: this._getExpenseEvidence(expenseGrowth, revenueGrowth),
      impact: {
        financial: toNumber(currentExpenses) - toNumber(previousExpenses),
        percentage: toNumber(expenseGrowth),
        timeframe: 'Current period',
      },
      recommendation: this._getExpenseRecommendation(expenseGrowth, revenueGrowth),
      confidence,
      previousScore,
    });
  }

  static createReceivablesRisk({
    score,
    totalReceivables,
    overdueReceivables,
    overduePercentage,
    status,
    previousScore,
    confidence,
  } = {}) {
    return this.createRisk({
      type: RISK_TYPES.RECEIVABLES,
      title: 'Receivables Risk',
      score,
      status,
      description: this._getReceivablesRiskDescription(
        overduePercentage,
        overdueReceivables
      ),
      metrics: {
        totalReceivables: toNumber(totalReceivables),
        overdueReceivables: toNumber(overdueReceivables),
        overduePercentage: toNumber(overduePercentage),
      },
      evidence: this._getReceivablesEvidence(overduePercentage, overdueReceivables),
      impact: {
        financial: toNumber(overdueReceivables),
        percentage: toNumber(overduePercentage),
        timeframe: 'Current period',
      },
      recommendation: this._getReceivablesRecommendation(overduePercentage),
      confidence,
      previousScore,
    });
  }

  static createPayablesRisk({
    score,
    totalPayables,
    overduePayables,
    overduePercentage,
    status,
    previousScore,
    confidence,
  } = {}) {
    return this.createRisk({
      type: RISK_TYPES.PAYABLES,
      title: 'Payables Risk',
      score,
      status,
      description: this._getPayablesRiskDescription(
        overduePercentage,
        overduePayables
      ),
      metrics: {
        totalPayables: toNumber(totalPayables),
        overduePayables: toNumber(overduePayables),
        overduePercentage: toNumber(overduePercentage),
      },
      evidence: this._getPayablesEvidence(overduePercentage, overduePayables),
      impact: {
        financial: toNumber(overduePayables),
        percentage: toNumber(overduePercentage),
        timeframe: 'Current period',
      },
      recommendation: this._getPayablesRecommendation(overduePercentage),
      confidence,
      previousScore,
    });
  }

  static createInventoryRisk({
    score,
    inventoryValue,
    inventoryGrowth,
    revenueGrowth,
    lowStockItems = 0,
    status,
    previousScore,
    confidence,
  } = {}) {
    return this.createRisk({
      type: RISK_TYPES.INVENTORY,
      title: 'Inventory Risk',
      score,
      status,
      description: this._getInventoryRiskDescription(
        inventoryGrowth,
        revenueGrowth,
        lowStockItems
      ),
      metrics: {
        inventoryValue: toNumber(inventoryValue),
        inventoryGrowth: toNumber(inventoryGrowth),
        revenueGrowth: toNumber(revenueGrowth),
        lowStockItems: toNumber(lowStockItems),
      },
      evidence: this._getInventoryEvidence(
        inventoryGrowth,
        revenueGrowth,
        lowStockItems
      ),
      impact: {
        financial: toNumber(inventoryValue),
        timeframe: 'Current period',
      },
      recommendation: this._getInventoryRecommendation(
        inventoryGrowth,
        revenueGrowth,
        lowStockItems
      ),
      confidence,
      previousScore,
    });
  }

  // =============================================
  // 4. PRIVATE HELPERS
  // =============================================
  static _generateId(type) {
    const prefix = String(type).toLowerCase().replace(/_/g, '-');
    return `risk_${prefix}_${Date.now()}_${randomUUID().split('-')[0]}`;
  }

  static _determineTrend(current, previous) {
    if (previous === null || previous === undefined) return TREND_DIRECTIONS.STABLE;
    const delta = toNumber(current) - toNumber(previous);
    if (Math.abs(delta) <= TREND_STABLE_DELTA) return TREND_DIRECTIONS.STABLE;
    return delta < 0 ? TREND_DIRECTIONS.IMPROVING : TREND_DIRECTIONS.WORSENING;
  }

  // --- Generators ---
  static _getCashRiskDescription(runway, cash, burn) {
    if (runway === Infinity) return 'Cash position is healthy with unlimited runway.';
    if (runway === null || runway < 0) return 'Cash position is negative or uncertain.';
    if (runway < 1) {
      return `Cash reserves are critically low. Current cash: ${formatNaira(cash)}, projected to cover less than 1 month of operations.`;
    }
    if (runway < 2) {
      return `Cash reserves may cover approximately ${Math.round(runway)} months of the current net cash burn if current conditions persist.`;
    }
    if (runway < 3) {
      return `Cash reserves are adequate for ${Math.round(runway)} months. Monitor expenses closely.`;
    }
    return `Cash position is healthy with ${Math.round(runway)} months of runway.`;
  }

  static _getCashEvidence(cash, burn, runway) {
    const e = [];
    if (toNumber(cash) < 0) e.push('Negative cash balance');
    if (toNumber(burn) > 0) e.push(`Average monthly burn: ${formatNaira(burn)}`);
    if (typeof runway === 'number' && runway < 3) {
      e.push(`Cash runway: ${runway.toFixed(1)} months`);
    }
    return e;
  }

  static _getCashRecommendation(runway) {
    if (runway === Infinity) return 'Maintain current cash management practices.';
    if (runway === null || runway < 1) {
      return 'Immediate cash flow review required. Accelerate collections and reduce discretionary expenses.';
    }
    if (runway < 2) return 'Review discretionary expenses and accelerate outstanding receivables.';
    if (runway < 3) return 'Monitor cash position closely and review upcoming expenses.';
    return 'Maintain current cash management practices.';
  }

  static _getRevenueRiskDescription(g, c, p) {
    const growth = toNumber(g);
    if (growth < -30) {
      return `Revenue declined significantly by ${Math.abs(growth).toFixed(1)}%. Current: ${formatNaira(c)}, Previous: ${formatNaira(p)}`;
    }
    if (growth < -15) return `Revenue declined by ${Math.abs(growth).toFixed(1)}%.`;
    if (growth < -5) return `Revenue is declining at ${Math.abs(growth).toFixed(1)}% per period.`;
    return `Revenue is ${growth > 0 ? 'growing' : 'stable'} at ${Math.abs(growth).toFixed(1)}%.`;
  }

  static _getRevenueEvidence(g, c, p) {
    const e = [];
    if (toNumber(g) < -10) e.push(`Revenue declined ${Math.abs(g).toFixed(1)}%`);
    if (toNumber(c) < toNumber(p)) {
      e.push(`Current revenue (${formatNaira(c)}) below previous (${formatNaira(p)})`);
    }
    return e;
  }

  static _getRevenueRecommendation(g) {
    if (toNumber(g) < -15) {
      return 'Immediate revenue review required. Analyze sales channels, pricing, and market conditions.';
    }
    if (toNumber(g) < -5) return 'Monitor sales trends and review marketing strategy.';
    return 'Maintain current revenue strategy.';
  }

  static _getProfitabilityRiskDescription(chg, cur, type) {
    const label = type === 'gross' ? 'Gross margin' : 'Net margin';
    const change = toNumber(chg);
    if (change < -10) {
      return `${label} declined significantly by ${Math.abs(change).toFixed(1)} percentage points. Current: ${toNumber(cur).toFixed(1)}%`;
    }
    if (change < -5) {
      return `${label} declined by ${Math.abs(change).toFixed(1)} percentage points.`;
    }
    return `${label} is ${change > 0 ? 'improving' : 'stable'} at ${toNumber(cur).toFixed(1)}%.`;
  }

  static _getProfitabilityEvidence(chg, cur, type) {
    const e = [];
    if (toNumber(chg) < -5) e.push(`Margin declined ${Math.abs(chg).toFixed(1)} percentage points`);
    if (toNumber(cur) < 20 && type === 'gross') e.push('Gross margin below 20% (low)');
    return e;
  }

  static _getProfitabilityRecommendation(chg) {
    if (toNumber(chg) < -10) return 'Immediate review of pricing and cost structure required.';
    if (toNumber(chg) < -5) return 'Review costs and pricing strategy.';
    return 'Maintain current margin management.';
  }

  static _getExpenseRiskDescription(eg, rg) {
    const expG = toNumber(eg);
    const revG = toNumber(rg);
    if (expG > revG * 2) {
      return `Expenses grew ${expG.toFixed(1)}% while revenue grew ${revG.toFixed(1)}% (expenses growing ${(expG / (revG || 1)).toFixed(1)}x faster).`;
    }
    if (expG > revG) {
      return `Expenses grew ${expG.toFixed(1)}% faster than revenue (${revG.toFixed(1)}%).`;
    }
    return `Expense growth (${expG.toFixed(1)}%) is in line with revenue growth (${revG.toFixed(1)}%).`;
  }

  static _getExpenseEvidence(eg, rg) {
    const e = [];
    if (toNumber(eg) > toNumber(rg) * 1.5) e.push('Expenses growing significantly faster than revenue');
    return e;
  }

  static _getExpenseRecommendation(eg, rg) {
    if (toNumber(eg) > toNumber(rg) * 2) {
      return 'Review expense categories. Identify and reduce unnecessary costs.';
    }
    if (toNumber(eg) > toNumber(rg) * 1.3) {
      return 'Review expense categories and optimize spending.';
    }
    return 'Maintain current expense management.';
  }

  static _getReceivablesRiskDescription(pct, amt) {
    const p = toNumber(pct);
    if (p > 50) {
      return `${p.toFixed(1)}% of receivables are overdue (${formatNaira(amt)}). Significant collection risk.`;
    }
    if (p > 30) return `${p.toFixed(1)}% of receivables are overdue (${formatNaira(amt)}).`;
    return `Receivables are healthy with ${p.toFixed(1)}% overdue.`;
  }

  static _getReceivablesEvidence(pct) {
    const e = [];
    if (toNumber(pct) > 30) e.push(`${toNumber(pct).toFixed(1)}% of receivables overdue`);
    return e;
  }

  static _getReceivablesRecommendation(pct) {
    if (toNumber(pct) > 50) {
      return 'Immediate collection effort required. Contact overdue customers and review credit terms.';
    }
    if (toNumber(pct) > 30) return 'Prioritize collection on overdue accounts.';
    return 'Maintain current collection practices.';
  }

  static _getPayablesRiskDescription(pct, amt) {
    const p = toNumber(pct);
    if (p > 50) {
      return `${p.toFixed(1)}% of payables are overdue (${formatNaira(amt)}). Supplier relationship risk.`;
    }
    return `Payables are healthy with ${p.toFixed(1)}% overdue.`;
  }

  static _getPayablesEvidence(pct) {
    const e = [];
    if (toNumber(pct) > 30) e.push(`${toNumber(pct).toFixed(1)}% of payables overdue`);
    return e;
  }

  static _getPayablesRecommendation(pct) {
    const p = toNumber(pct);
    if (p > 50) {
      return 'Immediate cash flow review. Prioritize critical supplier payments.';
    }
    if (p >= 30) {
      return 'Review payment schedules and negotiate terms with key suppliers.';
    }
    return 'Monitor payables closely to avoid supplier issues.';
  }

  static _getInventoryRiskDescription(ig, rg, low) {
    const parts = [];
    if (toNumber(ig) > toNumber(rg) * 1.5) {
      parts.push(
        `Inventory grew ${toNumber(ig).toFixed(1)}% while revenue grew ${toNumber(rg).toFixed(1)}%`
      );
    }
    if (toNumber(low) > 0) parts.push(`${toNumber(low)} items below reorder level`);
    return parts.length ? parts.join('. ') : 'Inventory levels are healthy.';
  }

  static _getInventoryEvidence(ig, rg, low) {
    const e = [];
    if (toNumber(ig) > toNumber(rg) * 1.5) e.push('Inventory growing faster than revenue');
    if (toNumber(low) > 0) e.push(`${toNumber(low)} low stock items`);
    return e;
  }

  static _getInventoryRecommendation(ig, rg, low) {
    if (toNumber(ig) > toNumber(rg) * 2) {
      return 'Monitor inventory growth. Reduce slow-moving stock and optimize purchases.';
    }
    if (toNumber(low) > 5) return 'Reorder low stock items immediately.';
    return 'Maintain current inventory management.';
  }
}

// =============================================
// 5. EXPORTS
// =============================================
module.exports = {
  RiskContracts,
  RISK_TYPES,
  SEVERITY_LEVELS,
  RISK_STATUS,
  TREND_DIRECTIONS,
  CONTRACT_VERSION,
};