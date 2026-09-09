// src/application/services/forecast/scenarios/WhatIfEngine.js
// SSOT v5.7.0-prod | Deterministic · Audited · Clamped · Compatible with new baseForecast

'use strict';

class WhatIfEngine {
  static LIMITS = {
    MIN_CHANGE: -0.90,
    MAX_CHANGE: 2.00,
    DEFAULT_CHANGE: 0,
    MAX_CHANGES: 20,
    VERSION: '5.7.0-prod',
    DEFAULT_CURRENCY_SYMBOL: '₦',
  };

  constructor({ logger = console, currencySymbol = WhatIfEngine.LIMITS.DEFAULT_CURRENCY_SYMBOL } = {}) {
    this.logger = logger;
    this.currencySymbol = currencySymbol || WhatIfEngine.LIMITS.DEFAULT_CURRENCY_SYMBOL;
  }

  async analyze({
    baseForecast,
    changes = [],
    horizon = '30D',
    now = new Date(),
  } = {}) {
    if (!baseForecast || typeof baseForecast !== 'object') {
      this.logger.warn('[WhatIfEngine] Invalid baseForecast');
      return this._emptyResult(now);
    }

    // ---------- Safe extraction (works with both old & new shape) ----------
    const base = {
      revenue: this._getValue(baseForecast.revenue),
      cogs: this._getValue(baseForecast.cogs),
      expenses: this._getValue(baseForecast.expenses),
      profit: this._getValue(baseForecast.profit),
      salesVolume: this._getValue(baseForecast.salesVolume),
      cashFlow: this._getValue(baseForecast.cashFlow),
    };

    // If profit was missing, derive it
    if (base.profit === 0 && (base.revenue !== 0 || base.cogs !== 0 || base.expenses !== 0)) {
      base.profit = base.revenue - base.cogs - base.expenses;
    }

    const baseUnitPrice = base.salesVolume > 0 ? base.revenue / base.salesVolume : 0;

    let modified = {
      ...base,
      unitPrice: baseUnitPrice,
    };

    const assumptions = [];
    const changesApplied = [];
    const safeChanges = this._safeArray(changes).slice(0, WhatIfEngine.LIMITS.MAX_CHANGES);

    if (this._safeArray(changes).length > WhatIfEngine.LIMITS.MAX_CHANGES) {
      this.logger.warn(
        `[WhatIfEngine] Truncated changes from ${changes.length} to ${WhatIfEngine.LIMITS.MAX_CHANGES}`
      );
    }

    for (const change of safeChanges) {
      if (!change || typeof change !== 'object') continue;

      const type = change.type;
      const rawValue = this._safeNumber(change.value);
      const value = this._clamp(rawValue, WhatIfEngine.LIMITS.MIN_CHANGE, WhatIfEngine.LIMITS.MAX_CHANGE);
      const label = change.label || type || 'UNKNOWN';

      if (value !== rawValue) {
        this.logger.warn(`[WhatIfEngine] Clamped ${type} from ${rawValue} to ${value}`);
      }

      let impact = '';

      switch (type) {
        case 'PRICE_INCREASE':
        case 'PRICE_DECREASE': {
          const signed = type === 'PRICE_INCREASE' ? value : -value;
          const factor = 1 + signed;
          if (modified.salesVolume > 0 && modified.unitPrice > 0) {
            modified.unitPrice = Math.max(0, modified.unitPrice * factor);
            modified.revenue = modified.salesVolume * modified.unitPrice;
          } else {
            modified.revenue = Math.max(0, modified.revenue * factor);
          }
          impact = `${label}: ${(signed * 100).toFixed(0)}%`;
          break;
        }
        case 'VOLUME_INCREASE':
        case 'VOLUME_DECREASE': {
          const signed = type === 'VOLUME_INCREASE' ? value : -value;
          const factor = 1 + signed;
          modified.salesVolume = Math.max(0, modified.salesVolume * factor);
          if (modified.unitPrice > 0) {
            modified.revenue = modified.salesVolume * modified.unitPrice;
          } else {
            modified.revenue = Math.max(0, modified.revenue * factor);
          }
          impact = `${label}: ${(signed * 100).toFixed(0)}%`;
          break;
        }
        case 'COGS_INCREASE':
        case 'COGS_DECREASE': {
          const signed = type === 'COGS_INCREASE' ? value : -value;
          const factor = 1 + signed;
          modified.cogs = Math.max(0, modified.cogs * factor);
          impact = `${label}: ${(signed * 100).toFixed(0)}%`;
          break;
        }
        case 'EXPENSE_INCREASE':
        case 'EXPENSE_DECREASE': {
          const signed = type === 'EXPENSE_INCREASE' ? value : -value;
          const factor = 1 + signed;
          modified.expenses = Math.max(0, modified.expenses * factor);
          impact = `${label}: ${(signed * 100).toFixed(0)}%`;
          break;
        }
        case 'COMBINED': {
          const c = change.changes && typeof change.changes === 'object' ? change.changes : {};
          if (c.unitPrice != null) {
            const v = this._clamp(this._safeNumber(c.unitPrice), WhatIfEngine.LIMITS.MIN_CHANGE, WhatIfEngine.LIMITS.MAX_CHANGE);
            modified.unitPrice = Math.max(0, modified.unitPrice * (1 + v));
          }
          if (c.volume != null) {
            const v = this._clamp(this._safeNumber(c.volume), WhatIfEngine.LIMITS.MIN_CHANGE, WhatIfEngine.LIMITS.MAX_CHANGE);
            modified.salesVolume = Math.max(0, modified.salesVolume * (1 + v));
          }
          if (c.cogs != null) {
            const v = this._clamp(this._safeNumber(c.cogs), WhatIfEngine.LIMITS.MIN_CHANGE, WhatIfEngine.LIMITS.MAX_CHANGE);
            modified.cogs = Math.max(0, modified.cogs * (1 + v));
          }
          if (c.expenses != null) {
            const v = this._clamp(this._safeNumber(c.expenses), WhatIfEngine.LIMITS.MIN_CHANGE, WhatIfEngine.LIMITS.MAX_CHANGE);
            modified.expenses = Math.max(0, modified.expenses * (1 + v));
          }
          if (modified.salesVolume > 0 && modified.unitPrice > 0) {
            modified.revenue = modified.salesVolume * modified.unitPrice;
          }
          impact = `${label}: Combined`;
          break;
        }
        default:
          impact = `${label}: Unknown type`;
          this.logger.warn(`[WhatIfEngine] Unknown change type: ${type}`);
      }

      assumptions.push(impact);
      changesApplied.push({
        type,
        label,
        rawValue,
        clampedValue: value,
        applied: true,
      });
    }

    // Always recalculate profit from the modified numbers
    modified.profit = modified.revenue - modified.cogs - modified.expenses;

    // Simple cash-flow adjustment
    const profitDelta = modified.profit - base.profit;
    modified.cashFlow = base.cashFlow + profitDelta;

    return {
      available: true,
      original: this._buildMetrics(base, baseUnitPrice),
      modified: this._buildMetrics(modified, modified.unitPrice),
      impacts: this._calculateImpacts(base, modified, baseUnitPrice, modified.unitPrice),
      assumptions,
      summary: this._generateSummary(base.profit, modified.profit, assumptions),
      metadata: {
        generatedAt: now.toISOString(),
        whatIfEngineVersion: WhatIfEngine.LIMITS.VERSION,
        horizon,
        changesApplied,
        baseSnapshot: { ...base, unitPrice: baseUnitPrice },
      },
    };
  }

  // ---------- Helpers ----------

  /** Safely extract a number from either a plain number or a forecast object */
  _getValue(metric) {
    if (metric == null) return 0;
    if (typeof metric === 'number') return this._safeNumber(metric);
    if (typeof metric === 'object') {
      return this._safeNumber(metric.forecast ?? metric.value ?? metric.amount ?? 0);
    }
    return 0;
  }

  _buildMetrics(state, unitPrice) {
    const revenue = this._safeNumber(state.revenue);
    const cogs = this._safeNumber(state.cogs);
    const expenses = this._safeNumber(state.expenses);
    const profit = this._safeNumber(state.profit);
    return {
      revenue,
      cogs,
      expenses,
      profit,
      salesVolume: this._safeNumber(state.salesVolume),
      unitPrice: this._safeNumber(unitPrice),
      cashFlow: this._safeNumber(state.cashFlow),
      grossMargin: revenue > 0 ? Number((((revenue - cogs) / revenue) * 100).toFixed(2)) : 0,
      netMargin: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
    };
  }

  _calculateImpacts(base, modified, baseUnitPrice, modifiedUnitPrice) {
    const calc = (orig, mod) => ({
      original: orig,
      modified: mod,
      absoluteChange: mod - orig,
      percentageChange: orig !== 0 ? Number((((mod - orig) / Math.abs(orig)) * 100).toFixed(2)) : (mod !== 0 ? 100 : 0),
      direction: mod > orig ? 'INCREASE' : mod < orig ? 'DECREASE' : 'NEUTRAL',
    });

    return {
      revenue: calc(base.revenue, modified.revenue),
      cogs: calc(base.cogs, modified.cogs),
      expenses: calc(base.expenses, modified.expenses),
      profit: calc(base.profit, modified.profit),
      salesVolume: calc(base.salesVolume, modified.salesVolume),
      unitPrice: calc(baseUnitPrice, modifiedUnitPrice),
      cashFlow: calc(base.cashFlow, modified.cashFlow),
    };
  }

  _generateSummary(baseProfit, modifiedProfit, assumptions) {
    const absChange = modifiedProfit - baseProfit;
    const pctChange = baseProfit !== 0
      ? (absChange / Math.abs(baseProfit)) * 100
      : absChange !== 0 ? 100 : 0;
    const direction = absChange > 0 ? 'increase' : absChange < 0 ? 'decrease' : 'no change';
    const signedAmount = `${absChange >= 0 ? '+' : '-'}${this.currencySymbol}${Math.round(Math.abs(absChange)).toLocaleString()}`;

    return {
      summary: `Profit would ${direction} by ${Math.abs(pctChange).toFixed(1)}% (${signedAmount})`,
      profitImpact: Number(pctChange.toFixed(2)),
      direction: direction.toUpperCase().replace(' ', '_'),
      assumptions,
    };
  }

  _emptyResult(now) {
    const zero = { revenue: 0, cogs: 0, expenses: 0, profit: 0, salesVolume: 0, cashFlow: 0 };
    return {
      available: false,
      original: this._buildMetrics(zero, 0),
      modified: this._buildMetrics(zero, 0),
      impacts: {},
      assumptions: ['Invalid base forecast'],
      summary: {
        summary: 'No analysis - invalid input',
        profitImpact: 0,
        direction: 'NEUTRAL',
        assumptions: [],
      },
      metadata: {
        generatedAt: now.toISOString(),
        whatIfEngineVersion: WhatIfEngine.LIMITS.VERSION,
        error: 'INVALID_BASE_FORECAST',
      },
    };
  }

  _clamp(val, min = WhatIfEngine.LIMITS.MIN_CHANGE, max = WhatIfEngine.LIMITS.MAX_CHANGE) {
    return Math.max(min, Math.min(max, this._safeNumber(val)));
  }

  _safeArray(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  _safeNumber(val) {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }
}

module.exports = WhatIfEngine;