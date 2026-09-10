// src/application/services/decision/DecisionEngine.js
// SSOT v2.0.0-prod – pure consumer of Risk (via DecisionDataProvider)
// No independent projections. Rules interpret already-scored Risk data only.

'use strict';

const {
  DECISION_PRIORITY,
  DECISION_SEVERITY,
  DECISION_TIMEFRAME,
  DECISION_CATEGORIES,
  PRIORITY_ORDER,
} = require('./contracts/DecisionContracts');

class DecisionEngine {
  static VERSION = '2.0.0-prod';

  static NOOP_LOGGER = Object.freeze({
    warn: () => {}, info: () => {}, error: () => {}, debug: () => {},
  });

  constructor({
    decisionDataProvider,
    logger = DecisionEngine.NOOP_LOGGER,
  } = {}) {
    this.logger =
      logger && typeof logger.warn === 'function'
        ? logger
        : DecisionEngine.NOOP_LOGGER;
    this.decisionDataProvider = decisionDataProvider;
  }

  /**
   * Generate professional decisions purely from Risk package.
   */
  async generate({
    userId,
    businessId,
    horizon = '30D',
    whatIfChanges = null,
    now = new Date(),
    traceId = null,
    limit = 30,
  } = {}) {
    const started = Date.now();
    const tid = traceId || this._traceId(now);

    if (!userId || !businessId) {
      return this._errorPackage('INVALID_PARAMS', now, tid);
    }

    try {
      const data = await this.decisionDataProvider.getDecisionPackage({
        userId,
        businessId,
        horizon,
        whatIfChanges,
        now,
        traceId: tid,
      });

      if (!data || !data.available) {
        return this._errorPackage('NO_RISK_DATA', now, tid);
      }

      // ── Pure interpretation of already-scored Risk data ──────────────
      const decisions = this._buildDecisionsFromRisk(data);
      const sorted = this._sortByPriority(decisions).slice(0, Math.max(0, limit));
      const summary = this._buildSummary(sorted, data);

      const packageResult = {
        generatedAt: data.generatedAt || now.toISOString(),
        horizon: data.horizon,
        period: data.period,

        // Already-projected values (never recalculated)
        projected: Object.freeze(data.projected),

        // Decisions derived only from Risk
        decisions: Object.freeze(sorted),
        summary: Object.freeze(summary),

        // Pass-through context
        riskSummary: Object.freeze(data.riskSummary),
        domainRisks: data.domainRisks,
        executiveSummary: Object.freeze(
          this._buildExecutiveSummary(sorted, data)
        ),
        recommendations: Object.freeze(
          this._extractTopRecommendations(sorted)
        ),

        metadata: Object.freeze({
          engineVersion: DecisionEngine.VERSION,
          traceId: tid,
          userId,
          businessId,
          horizon: data.horizon,
          source: 'Risk',
          sourceMetadata: data.sourceMetadata,
          durationMs: Date.now() - started,
        }),
      };

      return Object.freeze(packageResult);
    } catch (err) {
      this.logger.error('[DecisionEngine] generate failed', {
        traceId: tid,
        error: err.message,
      });
      return this._errorPackage('ORCHESTRATION_ERROR', now, tid, err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Lean helpers – interpretation only (no projection)
  // ─────────────────────────────────────────────────────────────

  _buildDecisionsFromRisk(data) {
    const decisions = [];
    const p = data.projected || {};
    const rs = data.riskSummary || {};
    const domain = data.domainRisks || {};
    const riskRecs = data.riskRecommendations || [];

    // 1. Overall severity decisions
    if (rs.overallSeverity === 'CRITICAL' || rs.criticalRisks > 0) {
      decisions.push(this._makeDecision({
        type: 'OVERALL_CRITICAL_RISK',
        category: DECISION_CATEGORIES.WORKING_CAPITAL,
        title: 'Critical Business Risk Detected',
        summary: `Overall risk severity is CRITICAL with ${rs.criticalRisks} critical risk(s). Immediate action required.`,
        recommendation: 'Escalate to leadership. Review cash, receivables, and high-severity domain risks within 24 hours.',
        priority: DECISION_PRIORITY.CRITICAL,
        severity: DECISION_SEVERITY.CRITICAL,
        timeframe: DECISION_TIMEFRAME.IMMEDIATE,
        confidence: 90,
        evidence: { overallScore: rs.overallScore, criticalRisks: rs.criticalRisks },
      }));
    } else if (rs.overallSeverity === 'HIGH' || rs.highRisks > 1) {
      decisions.push(this._makeDecision({
        type: 'OVERALL_HIGH_RISK',
        category: DECISION_CATEGORIES.WORKING_CAPITAL,
        title: 'Elevated Business Risk',
        summary: `Overall risk is HIGH. ${rs.highRisks} high-severity risk(s) require attention.`,
        recommendation: 'Prioritise mitigation plans for high-severity risks this week.',
        priority: DECISION_PRIORITY.HIGH,
        severity: DECISION_SEVERITY.WARNING,
        timeframe: DECISION_TIMEFRAME.SHORT_TERM,
        confidence: 85,
        evidence: { overallScore: rs.overallScore, highRisks: rs.highRisks },
      }));
    }

    // 2. Domain-specific decisions from already-scored risks
    const domainMap = [
      { key: 'cash', category: DECISION_CATEGORIES.CASH_FLOW, titlePrefix: 'Cash Flow' },
      { key: 'revenue', category: DECISION_CATEGORIES.GROWTH, titlePrefix: 'Revenue' },
      { key: 'profitability', category: DECISION_CATEGORIES.PROFITABILITY, titlePrefix: 'Profitability' },
      { key: 'expenses', category: DECISION_CATEGORIES.EXPENSES, titlePrefix: 'Expense' },
      { key: 'receivables', category: DECISION_CATEGORIES.RECEIVABLES, titlePrefix: 'Receivables' },
      { key: 'payables', category: DECISION_CATEGORIES.PAYABLES, titlePrefix: 'Payables' },
      { key: 'inventory', category: DECISION_CATEGORIES.INVENTORY, titlePrefix: 'Inventory' },
    ];

    for (const { key, category, titlePrefix } of domainMap) {
      const risk = domain[key];
      if (!risk || !risk.severity) continue;

      if (risk.severity === 'CRITICAL' || risk.severity === 'HIGH') {
        decisions.push(this._makeDecision({
          type: `${key.toUpperCase()}_RISK_ACTION`,
          category,
          title: `${titlePrefix} Risk Requires Action`,
          summary: risk.description || `${titlePrefix} risk scored ${risk.score} (${risk.severity}).`,
          recommendation: risk.recommendation || `Review ${titlePrefix.toLowerCase()} position and take corrective action.`,
          priority: risk.severity === 'CRITICAL' ? DECISION_PRIORITY.CRITICAL : DECISION_PRIORITY.HIGH,
          severity: risk.severity === 'CRITICAL' ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
          timeframe: risk.severity === 'CRITICAL' ? DECISION_TIMEFRAME.IMMEDIATE : DECISION_TIMEFRAME.SHORT_TERM,
          confidence: Math.round((risk.confidence || 0.7) * 100),
          evidence: {
            score: risk.score,
            severity: risk.severity,
            metrics: risk.metrics || {},
          },
        }));
      }
    }

    // 3. Projected value signals (interpretation only – no new math)
    if (p.profit < 0) {
      decisions.push(this._makeDecision({
        type: 'NEGATIVE_PROFIT_PROJECTION',
        category: DECISION_CATEGORIES.PROFITABILITY,
        title: 'Projected Profit is Negative',
        summary: `Forecast projects negative profit of ₦${Math.abs(p.profit).toLocaleString()}.`,
        recommendation: 'Review pricing, cost structure, and expense controls immediately.',
        priority: DECISION_PRIORITY.CRITICAL,
        severity: DECISION_SEVERITY.CRITICAL,
        timeframe: DECISION_TIMEFRAME.IMMEDIATE,
        confidence: 88,
        evidence: { projectedProfit: p.profit },
      }));
    }

    if (p.cashFlow < 0) {
      decisions.push(this._makeDecision({
        type: 'NEGATIVE_CASHFLOW_PROJECTION',
        category: DECISION_CATEGORIES.CASH_FLOW,
        title: 'Projected Cash Flow is Negative',
        summary: `Forecast projects negative cash flow of ₦${Math.abs(p.cashFlow).toLocaleString()}.`,
        recommendation: 'Accelerate collections, defer non-critical payments, and protect liquidity.',
        priority: DECISION_PRIORITY.CRITICAL,
        severity: DECISION_SEVERITY.CRITICAL,
        timeframe: DECISION_TIMEFRAME.IMMEDIATE,
        confidence: 88,
        evidence: { projectedCashFlow: p.cashFlow },
      }));
    }

    if (p.revenue > 0 && p.expenses / p.revenue > 0.85) {
      decisions.push(this._makeDecision({
        type: 'HIGH_EXPENSE_RATIO',
        category: DECISION_CATEGORIES.EXPENSES,
        title: 'Expenses Consuming High Share of Revenue',
        summary: `Projected expenses are ${((p.expenses / p.revenue) * 100).toFixed(1)}% of projected revenue.`,
        recommendation: 'Identify and cut discretionary spend. Review fixed vs variable cost mix.',
        priority: DECISION_PRIORITY.HIGH,
        severity: DECISION_SEVERITY.WARNING,
        timeframe: DECISION_TIMEFRAME.SHORT_TERM,
        confidence: 82,
        evidence: {
          projectedRevenue: p.revenue,
          projectedExpenses: p.expenses,
          ratio: p.expenses / p.revenue,
        },
      }));
    }

    // 4. Surface Risk recommendations as decisions
    for (const rec of riskRecs.slice(0, 8)) {
      if (!rec || !rec.title) continue;
      decisions.push(this._makeDecision({
        type: 'RISK_RECOMMENDATION',
        category: DECISION_CATEGORIES.WORKING_CAPITAL,
        title: rec.title,
        summary: rec.recommendation || rec.title,
        recommendation: rec.recommendation || 'Review and act on this risk recommendation.',
        priority: rec.priority === 'CRITICAL' ? DECISION_PRIORITY.CRITICAL : DECISION_PRIORITY.HIGH,
        severity: rec.priority === 'CRITICAL' ? DECISION_SEVERITY.CRITICAL : DECISION_SEVERITY.WARNING,
        timeframe: rec.timeframe === 'Immediate' ? DECISION_TIMEFRAME.IMMEDIATE : DECISION_TIMEFRAME.SHORT_TERM,
        confidence: 80,
        evidence: { source: 'RiskEngine', riskType: rec.riskType },
      }));
    }

    return decisions;
  }

  _makeDecision({
    type,
    category,
    title,
    summary,
    recommendation,
    priority,
    severity,
    timeframe,
    confidence,
    evidence = {},
  }) {
    return Object.freeze({
      id: `dec_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      category,
      title,
      summary,
      recommendation,
      priority,
      severity,
      timeframe,
      confidence,
      status: 'ACTIVE',
      evidence: Object.freeze(evidence),
      createdAt: new Date().toISOString(),
    });
  }

  _sortByPriority(list) {
    const order = PRIORITY_ORDER || {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    return [...list].sort((a, b) => {
      const pa = order[a.priority] ?? 99;
      const pb = order[b.priority] ?? 99;
      return pa - pb;
    });
  }

  _buildSummary(decisions, data) {
    const byPriority = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const bySeverity = { CRITICAL: 0, WARNING: 0, INFO: 0, OPPORTUNITY: 0 };
    const byCategory = {};

    for (const d of decisions) {
      if (byPriority[d.priority] !== undefined) byPriority[d.priority]++;
      if (bySeverity[d.severity] !== undefined) bySeverity[d.severity]++;
      if (d.category) {
        byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      }
    }

    const avgConf =
      decisions.length > 0
        ? Math.round(
            decisions.reduce((s, d) => s + (d.confidence || 0), 0) /
              decisions.length
          )
        : 0;

    return {
      total: decisions.length,
      byPriority,
      bySeverity,
      byCategory,
      averageConfidence: avgConf,
      riskOverallSeverity: data.riskSummary?.overallSeverity || 'LOW',
      riskOverallScore: data.riskSummary?.overallScore || 0,
    };
  }

  _buildExecutiveSummary(decisions, data) {
    const critical = decisions.filter((d) => d.priority === 'CRITICAL');
    const high = decisions.filter((d) => d.priority === 'HIGH');
    const top = decisions[0] || null;

    let text = `Generated ${decisions.length} decision(s) from Risk assessment.`;
    if (critical.length > 0) {
      text += ` ${critical.length} critical decision(s) require immediate attention.`;
    } else if (high.length > 0) {
      text += ` ${high.length} high-priority decision(s) should be addressed soon.`;
    } else {
      text += ' No critical decisions detected.';
    }

    return {
      totalDecisions: decisions.length,
      criticalCount: critical.length,
      highCount: high.length,
      topDecision: top
        ? { title: top.title, priority: top.priority, recommendation: top.recommendation }
        : null,
      summary: text,
      riskSeverity: data.riskSummary?.overallSeverity || 'LOW',
    };
  }

  _extractTopRecommendations(decisions) {
    return decisions
      .filter((d) => d.priority === 'CRITICAL' || d.priority === 'HIGH')
      .slice(0, 10)
      .map((d) => ({
        priority: d.priority,
        title: d.title,
        recommendation: d.recommendation,
        timeframe: d.timeframe,
        category: d.category,
      }));
  }

  _errorPackage(reason, now, traceId, message = null) {
    return Object.freeze({
      generatedAt: now.toISOString(),
      error: true,
      reason,
      message,
      decisions: [],
      summary: {
        total: 0,
        byPriority: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
        averageConfidence: 0,
      },
      metadata: {
        engineVersion: DecisionEngine.VERSION,
        traceId,
      },
    });
  }

  _traceId(now) {
    const t = (now instanceof Date ? now.getTime() : Date.now()).toString(36);
    return `dec_${t}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

module.exports = DecisionEngine;