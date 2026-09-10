// src/application/services/advisor/AdvisorEngine.js
// SSOT v2.0.0-prod – pure consumer of Decision
// No independent calculation. Only interprets Decision package.

'use strict';

const {
  ADVISOR_RESPONSE_TYPES,
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_CATEGORIES,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
} = require('./contracts/AdvisorContracts');

class AdvisorEngine {
  static VERSION = '2.0.0-prod';

  static NOOP_LOGGER = Object.freeze({
    warn: () => {}, info: () => {}, error: () => {}, debug: () => {},
  });

  constructor({
    advisorDataProvider,
    logger = AdvisorEngine.NOOP_LOGGER,
  } = {}) {
    this.logger =
      logger && typeof logger.warn === 'function'
        ? logger
        : AdvisorEngine.NOOP_LOGGER;
    this.advisorDataProvider = advisorDataProvider;
  }

  async generate({
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
      const data = await this.advisorDataProvider.getAdvisorPackage({
        userId,
        businessId,
        horizon,
        whatIfChanges,
        now,
        traceId: tid,
      });

      if (!data || !data.available) {
        return this._errorPackage('NO_DECISION_DATA', now, tid);
      }

      const insights = this._buildInsights(data);
      const recommendations = this._buildRecommendations(data, insights);
      const summary = this._buildSummary(data, insights);

      return Object.freeze({
        generatedAt: data.generatedAt || now.toISOString(),
        horizon: data.horizon,
        period: data.period,

        projected: Object.freeze(data.projected || {}),
        insights: Object.freeze(insights),
        recommendations: Object.freeze(recommendations),
        summary: Object.freeze(summary),

        decisionSummary: Object.freeze(data.decisionSummary || {}),
        riskSummary: Object.freeze(data.riskSummary || {}),
        executiveSummary: Object.freeze(data.executiveSummary || {}),

        metadata: Object.freeze({
          engineVersion: AdvisorEngine.VERSION,
          traceId: tid,
          userId,
          businessId,
          horizon: data.horizon,
          source: 'Decision',
          sourceMetadata: data.sourceMetadata,
          durationMs: Date.now() - started,
        }),
      });
    } catch (err) {
      this.logger.error('[AdvisorEngine] generate failed', {
        traceId: tid,
        error: err.message,
      });
      return this._errorPackage('ORCHESTRATION_ERROR', now, tid, err.message);
    }
  }

  // ── Interpretation only ────────────────────────────────────

  _buildInsights(data) {
    const insights = [];
    const decisions = data.decisions || [];
    const projected = data.projected || {};
    const risk = data.riskSummary || {};

    // From decisions
    for (const d of decisions.slice(0, 15)) {
      if (!d) continue;
      const sentiment =
        d.priority === 'CRITICAL' || d.severity === 'CRITICAL'
          ? ADVISOR_SENTIMENT.URGENT
          : d.priority === 'HIGH'
            ? ADVISOR_SENTIMENT.NEGATIVE
            : ADVISOR_SENTIMENT.NEUTRAL;

      const severity =
        d.priority === 'CRITICAL'
          ? ADVISOR_SEVERITY.CRITICAL
          : d.priority === 'HIGH'
            ? ADVISOR_SEVERITY.HIGH
            : ADVISOR_SEVERITY.MEDIUM;

      insights.push(
        Object.freeze({
          id: `ins_${d.id || d.type}_${Date.now()}`,
          type: ADVISOR_RESPONSE_TYPES.INSIGHT,
          category: this._mapCategory(d.category),
          title: d.title,
          content: d.summary || d.recommendation,
          summary: d.summary || d.title,
          sentiment,
          severity,
          recommendation: d.recommendation,
          confidence: d.confidence || 80,
          evidence: d.evidence || {},
          source: 'Decision',
        })
      );
    }

    // Projected signals
    if (projected.profit < 0) {
      insights.push(
        Object.freeze({
          id: `ins_neg_profit_${Date.now()}`,
          type: ADVISOR_RESPONSE_TYPES.WARNING,
          category: ADVISOR_CATEGORIES.PROFITABILITY,
          title: 'Projected Profit is Negative',
          content: `Forecast (via Decision) projects negative profit of ₦${Math.abs(projected.profit).toLocaleString()}.`,
          summary: 'Negative profit projection',
          sentiment: ADVISOR_SENTIMENT.URGENT,
          severity: ADVISOR_SEVERITY.CRITICAL,
          recommendation: 'Review pricing and cost structure immediately.',
          confidence: 88,
          evidence: { projectedProfit: projected.profit },
          source: 'Decision',
        })
      );
    }

    if (projected.cashFlow < 0) {
      insights.push(
        Object.freeze({
          id: `ins_neg_cash_${Date.now()}`,
          type: ADVISOR_RESPONSE_TYPES.WARNING,
          category: ADVISOR_CATEGORIES.LIQUIDITY,
          title: 'Projected Cash Flow is Negative',
          content: `Projected cash flow is negative (₦${Math.abs(projected.cashFlow).toLocaleString()}).`,
          summary: 'Negative cash flow projection',
          sentiment: ADVISOR_SENTIMENT.URGENT,
          severity: ADVISOR_SEVERITY.CRITICAL,
          recommendation: 'Accelerate collections and protect liquidity.',
          confidence: 88,
          evidence: { projectedCashFlow: projected.cashFlow },
          source: 'Decision',
        })
      );
    }

    if (risk.overallSeverity === 'CRITICAL' || risk.criticalRisks > 0) {
      insights.push(
        Object.freeze({
          id: `ins_risk_critical_${Date.now()}`,
          type: ADVISOR_RESPONSE_TYPES.WARNING,
          category: ADVISOR_CATEGORIES.RISK,
          title: 'Critical Risk Level',
          content: `Overall risk severity is ${risk.overallSeverity} with ${risk.criticalRisks || 0} critical risk(s).`,
          summary: 'Critical risk detected upstream',
          sentiment: ADVISOR_SENTIMENT.URGENT,
          severity: ADVISOR_SEVERITY.CRITICAL,
          recommendation: 'Escalate and act on critical risks within 24 hours.',
          confidence: 90,
          evidence: risk,
          source: 'Decision',
        })
      );
    }

    return insights;
  }

  _buildRecommendations(data, insights) {
    const fromDecisions = (data.recommendations || []).map((r) =>
      Object.freeze({
        priority: r.priority || 'HIGH',
        title: r.title,
        recommendation: r.recommendation,
        timeframe: r.timeframe || 'SHORT_TERM',
        category: r.category || null,
      })
    );

    const fromInsights = insights
      .filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH')
      .map((i) =>
        Object.freeze({
          priority: i.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          title: i.title,
          recommendation: i.recommendation || i.content,
          timeframe: i.severity === 'CRITICAL' ? 'IMMEDIATE' : 'SHORT_TERM',
          category: i.category,
        })
      );

    // Dedupe by title
    const seen = new Set();
    const merged = [];
    for (const r of [...fromDecisions, ...fromInsights]) {
      if (!r.title || seen.has(r.title)) continue;
      seen.add(r.title);
      merged.push(r);
    }
    return merged.slice(0, 12);
  }

  _buildSummary(data, insights) {
    const critical = insights.filter((i) => i.severity === 'CRITICAL').length;
    const high = insights.filter((i) => i.severity === 'HIGH').length;
    const total = insights.length;

    let text = `Advisor generated ${total} insight(s) from Decision.`;
    if (critical > 0) text += ` ${critical} critical.`;
    if (high > 0) text += ` ${high} high priority.`;

    return {
      totalInsights: total,
      criticalCount: critical,
      highCount: high,
      summary: text,
      riskOverallSeverity: data.riskSummary?.overallSeverity || 'LOW',
      decisionCount: data.decisionSummary?.total || 0,
    };
  }

  _mapCategory(cat) {
    const map = {
      CASH_FLOW: ADVISOR_CATEGORIES.LIQUIDITY,
      PROFITABILITY: ADVISOR_CATEGORIES.PROFITABILITY,
      EXPENSES: ADVISOR_CATEGORIES.EXPENSE,
      REVENUE: ADVISOR_CATEGORIES.REVENUE,
      INVENTORY: ADVISOR_CATEGORIES.INVENTORY,
      RECEIVABLES: ADVISOR_CATEGORIES.CUSTOMER,
      PAYABLES: ADVISOR_CATEGORIES.EXPENSE,
      GROWTH: ADVISOR_CATEGORIES.GROWTH,
      WORKING_CAPITAL: ADVISOR_CATEGORIES.LIQUIDITY,
      RISK: ADVISOR_CATEGORIES.RISK,
    };
    return map[cat] || ADVISOR_CATEGORIES.GENERAL;
  }

  _errorPackage(reason, now, traceId, message = null) {
    return Object.freeze({
      generatedAt: now.toISOString(),
      error: true,
      reason,
      message,
      insights: [],
      recommendations: [],
      summary: { totalInsights: 0, criticalCount: 0, highCount: 0, summary: '' },
      metadata: { engineVersion: AdvisorEngine.VERSION, traceId },
    });
  }

  _traceId(now) {
    const t = (now instanceof Date ? now.getTime() : Date.now()).toString(36);
    return `adv_${t}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

module.exports = AdvisorEngine;