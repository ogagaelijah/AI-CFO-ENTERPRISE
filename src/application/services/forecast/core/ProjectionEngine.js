// src/application/services/forecast/core/ProjectionEngine.js
// v1.2.0-prod

'use strict';

class ProjectionEngine {
  project(current = 0, trendRate = 0, horizonDays = 30) {
    const safeCurrent = Number(current) || 0;
    const safeRate = Number(trendRate) || 0;
    const days = Number(horizonDays) || 30;

    if (safeCurrent === 0) {
      return this._empty(safeRate, days);
    }

    const periodsFactor = Math.max(days / 30, 0.25);
    const projected = safeCurrent * Math.pow(1 + safeRate, periodsFactor);
    const rounded = Math.round(projected * 100) / 100;

    const score = this._score(safeRate);

    return Object.freeze({
      forecast: rounded,
      available: true,
      reason: null,
      method: 'TREND_PROJECTION',
      dataStatus: score >= 40 ? 'SUFFICIENT' : 'MINIMAL',
      lowerBound: Math.round(rounded * 0.88 * 100) / 100,
      upperBound: Math.round(rounded * 1.12 * 100) / 100,
      confidence: {
        score,
        level: score >= 70 ? 'GOOD' : score >= 40 ? 'MODERATE' : 'LOW',
      },
      historicalBasis: {
        current: safeCurrent,
        trendRate: safeRate,
        horizonDays: days,
      },
      assumptions: [
        `Applied trend rate of ${(safeRate * 100).toFixed(1)}%`,
        `Horizon ${days} days`,
      ],
      risks: [],
      metadata: { projectedAt: new Date().toISOString() },
    });
  }

  // Special helper for derived metrics (Profit)
  fromValue(value, opts = {}) {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    return Object.freeze({
      forecast: rounded,
      available: rounded !== 0,
      reason: rounded === 0 ? 'ZERO_DERIVED' : null,
      method: 'DERIVED',
      dataStatus: 'SUFFICIENT',
      lowerBound: Math.round(rounded * 0.88 * 100) / 100,
      upperBound: Math.round(rounded * 1.12 * 100) / 100,
      confidence: { score: opts.score || 55, level: 'MODERATE' },
      historicalBasis: opts.basis || {},
      assumptions: opts.assumptions || ['Derived from Revenue − COGS − Expenses'],
      risks: [],
      metadata: { projectedAt: new Date().toISOString() },
    });
  }

  _empty(rate, days) {
    return Object.freeze({
      forecast: 0,
      available: false,
      reason: 'ZERO_CURRENT',
      method: 'TREND_PROJECTION',
      dataStatus: 'INSUFFICIENT',
      confidence: { score: 0, level: 'VERY_LOW' },
      lowerBound: 0,
      upperBound: 0,
      historicalBasis: { current: 0, trendRate: rate, horizonDays: days },
      assumptions: [],
      risks: [],
      metadata: {},
    });
  }

  _score(rate) {
    let score = 45;
    if (Math.abs(rate) < 0.20) score += 20;
    return Math.min(85, Math.max(25, score));
  }
}

module.exports = ProjectionEngine;