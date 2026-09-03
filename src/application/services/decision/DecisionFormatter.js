'use strict';

/**
 * Decision Formatter
 *
 * Formats Decision entities (and plain decision-shaped objects) for
 * Web UI, API, Executive summaries, HTML/Email and plain text.
 *
 * Design goals for 1M+ users:
 * - Stateless & pure (safe to share across requests / workers)
 * - Zero mutation of inputs
 * - Defensive against missing / partial data
 * - Configurable currency & locale
 * - O(n) over decision lists, no accidental quadratic work
 * - Works with both live Decision instances and toJSON()/toDisplay() payloads
 *
 * @version 1.1.0-prod
 */

const {
  PRIORITY_EMOJI,
  SEVERITY_EMOJI,
} = require('./contracts/DecisionContracts');

const PRIORITY_ORDER = Object.freeze({
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
});

class DecisionFormatter {
  /**
   * @param {Object} [options]
   * @param {string} [options.currencySymbol='₦']
   * @param {string} [options.locale='en-NG']
   */
  constructor(options = {}) {
    this.currencySymbol =
      typeof options.currencySymbol === 'string' && options.currencySymbol
        ? options.currencySymbol
        : '₦';
    this.locale =
      typeof options.locale === 'string' && options.locale
        ? options.locale
        : 'en-NG';

    // Pre-create formatters once (hot path)
    this._currencyFormatter = new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    this._percentFormatter = new Intl.NumberFormat(this.locale, {
      style: 'percent',
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    });
  }

  /**
   * Format a single decision.
   *
   * @param {Object|Decision} decision
   * @param {Object} [options]
   * @param {'short'|'detailed'|'full'} [options.format='detailed']
   * @param {boolean} [options.includeEvidence=true]
   * @param {boolean} [options.includeImpact=true]
   * @param {boolean} [options.includeScenarios=false]
   * @returns {Object|null}
   */
  format(decision, options = {}) {
    if (!decision || typeof decision !== 'object') {
      return null;
    }

    const {
      format = 'detailed',
      includeEvidence = true,
      includeImpact = true,
      includeScenarios = false,
    } = options;

    const priority = decision.priority || 'MEDIUM';
    const severity = decision.severity || 'INFO';
    const confidence = Number(decision.confidence) || 0;
    const status = decision.status || 'ACTIVE';
    const timeframe = decision.timeframe || 'MEDIUM_TERM';

    const base = {
      id: decision.id,
      type: decision.type,
      category: decision.category,
      title: decision.title,
      summary: decision.summary || '',
      priority,
      priorityEmoji: this.getPriorityEmoji(priority),
      priorityLabel: this.getPriorityLabel(priority),
      severity,
      severityEmoji: this.getSeverityEmoji(severity),
      severityLabel: this.getSeverityLabel(severity),
      confidence,
      confidenceLevel: this.getConfidenceLevel(confidence),
      confidenceEmoji: this.getConfidenceEmoji(confidence),
      status,
      statusLabel: this.getStatusLabel(status),
      recommendation: decision.recommendation,
      timeframe,
      timeframeLabel: this.getTimeframeLabel(timeframe),
      relatedEntity: decision.relatedEntity,
      relatedEntityId: decision.relatedEntityId,
      createdAt: decision.createdAt,
      expiresAt: decision.expiresAt,
      isExpired: this._safeCall(decision, 'isExpired', false),
      isActionable: this._safeCall(decision, 'isActionable', false),
    };

    if (format === 'short') {
      return {
        id: base.id,
        title: base.title,
        priorityEmoji: base.priorityEmoji,
        priorityLabel: base.priorityLabel,
        severityEmoji: base.severityEmoji,
        recommendation: base.recommendation,
        isActionable: base.isActionable,
      };
    }

    if (format === 'detailed') {
      const detailed = { ...base };

      if (includeEvidence && decision.evidence) {
        detailed.evidence = this.formatEvidence(decision.evidence);
      }
      if (
        decision.currentState &&
        typeof decision.currentState === 'object' &&
        Object.keys(decision.currentState).length > 0
      ) {
        detailed.currentState = this.formatCurrentState(decision.currentState);
      }
      if (Array.isArray(decision.alternatives) && decision.alternatives.length) {
        detailed.alternatives = decision.alternatives;
      }
      if (Array.isArray(decision.risks) && decision.risks.length) {
        detailed.risks = decision.risks;
      }
      if (Array.isArray(decision.assumptions) && decision.assumptions.length) {
        detailed.assumptions = decision.assumptions;
      }
      if (decision.trigger) {
        detailed.trigger = decision.trigger;
      }
      if (includeImpact && decision.impactResult) {
        detailed.impact = this.formatImpact(decision.impactResult);
      }
      if (includeScenarios && decision.scenarios) {
        detailed.scenarios = this.formatScenarios(decision.scenarios);
      }
      if (decision.expectedImpact) {
        detailed.expectedImpact = decision.expectedImpact;
      }
      return detailed;
    }

    if (format === 'full') {
      const full = { ...base };
      full.evidence = this.formatEvidence(decision.evidence || {});
      full.currentState = this.formatCurrentState(decision.currentState || {});
      full.alternatives = Array.isArray(decision.alternatives)
        ? decision.alternatives
        : [];
      full.risks = Array.isArray(decision.risks) ? decision.risks : [];
      full.assumptions = Array.isArray(decision.assumptions)
        ? decision.assumptions
        : [];
      full.trigger = decision.trigger || {};
      full.expectedImpact = decision.expectedImpact || '';

      if (includeImpact && decision.impactResult) {
        full.impact = this.formatImpact(decision.impactResult);
      }
      if (includeScenarios && decision.scenarios) {
        full.scenarios = this.formatScenarios(decision.scenarios);
      }
      if (decision.actionTaken) {
        full.actionTaken = decision.actionTaken;
      }
      if (decision.dismissReason) {
        full.dismissReason = decision.dismissReason;
      }
      full.updatedAt = decision.updatedAt;
      return full;
    }

    return base;
  }

  /**
   * Format many decisions + summary.
   */
  formatMany(decisions, options = {}) {
    const list = Array.isArray(decisions) ? decisions : [];
    const {
      format = 'detailed',
      includeEvidence = true,
      includeImpact = true,
    } = options;

    const formatted = list.map((d) =>
      this.format(d, {
        format,
        includeEvidence,
        includeImpact,
        includeScenarios: false,
      })
    );

    return {
      summary: this.generateDisplaySummary(list),
      decisions: formatted,
      count: formatted.length,
    };
  }

  /**
   * Web UI payload (priority-sorted, limited, grouped).
   */
  formatForWeb(decisions, options = {}) {
    const list = Array.isArray(decisions) ? decisions : [];
    const { limit = 10, includeAll = false } = options;

    const sorted = this._sortByPriority(list);
    const actionable = sorted.filter((d) =>
      this._safeCall(d, 'isActionable', false)
    );
    const critical = sorted.filter((d) => d.priority === 'CRITICAL');
    const high = sorted.filter((d) => d.priority === 'HIGH');

    const displayDecisions = includeAll
      ? sorted
      : sorted.slice(0, Math.max(0, limit));

    return {
      summary: {
        total: list.length,
        actionable: actionable.length,
        critical: critical.length,
        high: high.length,
        medium: sorted.filter((d) => d.priority === 'MEDIUM').length,
        low: sorted.filter((d) => d.priority === 'LOW').length,
      },
      decisions: displayDecisions.map((d) =>
        this.format(d, {
          format: 'detailed',
          includeEvidence: true,
          includeImpact: true,
        })
      ),
      groups: {
        critical: critical.map((d) => this.format(d, { format: 'short' })),
        high: high.slice(0, 5).map((d) => this.format(d, { format: 'short' })),
        actionable: actionable
          .slice(0, 5)
          .map((d) => this.format(d, { format: 'short' })),
      },
      pagination: {
        total: list.length,
        displayed: displayDecisions.length,
        limit,
      },
    };
  }

  /**
   * API response wrapper around DecisionEngine result.
   */
  formatForAPI(result, options = {}) {
    if (!result || typeof result !== 'object') {
      return { status: 'error', message: 'Invalid result' };
    }

    const { includeFull = false, includeMetrics = true } = options;

    const response = {
      status: 'success',
      generatedAt: result.generatedAt,
      summary: result.summary,
      decisions: Array.isArray(result.decisions) ? result.decisions : [],
    };

    if (includeFull && Array.isArray(result.fullDecisions)) {
      response.fullDecisions = result.fullDecisions.map((d) =>
        this.format(d, {
          format: 'full',
          includeEvidence: true,
          includeImpact: true,
        })
      );
    }

    if (includeMetrics && result.metrics) {
      response.metrics = result.metrics;
    }
    if (result.context) {
      response.context = result.context;
    }
    return response;
  }

  /**
   * Executive summary view.
   */
  formatForExecutive(decisions, options = {}) {
    const list = Array.isArray(decisions) ? decisions : [];
    const { maxTopDecisions = 3 } = options;

    const sorted = this._sortByPriority(list);
    const actionable = sorted.filter((d) =>
      this._safeCall(d, 'isActionable', false)
    );
    const critical = sorted.filter((d) => d.priority === 'CRITICAL');
    const topDecisions = sorted.slice(0, Math.max(0, maxTopDecisions));

    const byCategory = {};
    for (const decision of list) {
      const cat = decision.category || 'UNKNOWN';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(decision);
    }

    return {
      executiveSummary: {
        totalDecisions: list.length,
        actionableDecisions: actionable.length,
        criticalIssues: critical.length,
        topPriority: sorted.length > 0 ? sorted[0].priority : null,
      },
      topDecisions: topDecisions.map((d) =>
        this.format(d, { format: 'short', includeEvidence: false })
      ),
      criticalDecisions: critical.map((d) =>
        this.format(d, {
          format: 'detailed',
          includeEvidence: true,
          includeImpact: true,
        })
      ),
      byCategory: Object.keys(byCategory).map((category) => ({
        category,
        count: byCategory[category].length,
        top: byCategory[category].slice(0, 2).map((d) => d.title),
      })),
      recommendations: this.generateExecutiveRecommendations(list),
      actionPlan: this.generateActionPlan(list),
    };
  }

  // ─── Evidence / Impact / Scenario helpers ───────────────────

  formatEvidence(evidence) {
    if (!evidence || typeof evidence !== 'object') return {};

    const formatted = {};
    const monetaryHints = [
      'amount', 'value', 'total', 'revenue', 'profit', 'cost',
      'expense', 'saving', 'impact', 'cash', 'receivable', 'payable',
      'inventory', 'investment', 'budget', 'shortfall', 'savings',
    ];
    const percentHints = [
      'rate', 'percent', 'margin', 'growth', 'decline', 'increase',
    ];

    for (const [key, value] of Object.entries(evidence)) {
      if (value == null) continue;
      const lower = key.toLowerCase();

      if (
        typeof value === 'number' &&
        monetaryHints.some((h) => lower.includes(h))
      ) {
        formatted[key] = this.formatCurrency(value);
      } else if (
        typeof value === 'number' &&
        percentHints.some((h) => lower.includes(h))
      ) {
        formatted[key] = this.formatPercentage(value);
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  }

  formatCurrentState(state) {
    if (!state || typeof state !== 'object') return {};

    const formatted = {};
    const monetaryHints = [
      'amount', 'value', 'total', 'revenue', 'profit', 'cost',
      'expense', 'cash', 'stock', 'inventory',
    ];

    for (const [key, value] of Object.entries(state)) {
      if (value == null) continue;
      if (
        typeof value === 'number' &&
        monetaryHints.some((h) => key.toLowerCase().includes(h))
      ) {
        formatted[key] = this.formatCurrency(value);
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  }

  formatImpact(impact) {
    if (!impact) return null;

    return {
      type: impact.type,
      summary: impact.recommendation || '',
      metrics: {
        revenue: impact.revenueImpact != null
          ? this.formatCurrency(impact.revenueImpact)
          : null,
        profit: impact.profitImpact != null
          ? this.formatCurrency(impact.profitImpact)
          : null,
        margin: impact.marginChange != null
          ? this.formatPercentage(impact.marginChange)
          : null,
        roi: impact.roi != null ? this.formatPercentage(impact.roi) : null,
        annualSaving: impact.annualSaving != null
          ? this.formatCurrency(impact.annualSaving)
          : null,
        totalCashFreed: impact.totalCashFreed != null
          ? this.formatCurrency(impact.totalCashFreed)
          : null,
      },
      confidence: impact.confidence || 0,
      confidenceLevel: this.getConfidenceLevel(impact.confidence || 0),
    };
  }

  formatScenarios(scenarios) {
    if (!scenarios) return null;

    if (scenarios.ranked) {
      return {
        bestScenario: scenarios.bestScenario
          ? {
              name: scenarios.bestScenario.name,
              profitImpact: this.formatCurrency(
                scenarios.bestScenario.metrics?.profitImpact || 0
              ),
            }
          : null,
        ranked:
          scenarios.ranked?.map((s) => ({
            rank: s.rank,
            name: s.name,
            profitImpact: this.formatCurrency(s.metrics?.profitImpact || 0),
            confidence: s.metrics?.confidence || 0,
          })) || [],
        summary: scenarios.summary?.insights || [],
      };
    }
    return scenarios;
  }

  // ─── Labels & emojis ───────────────────────────────────────

  getPriorityEmoji(priority) {
    return PRIORITY_EMOJI[priority] || '⚪';
  }

  getPriorityLabel(priority) {
    const labels = {
      CRITICAL: '🔴 Critical',
      HIGH: '🟠 High',
      MEDIUM: '🟡 Medium',
      LOW: '🟢 Low',
    };
    return labels[priority] || String(priority || '');
  }

  getSeverityEmoji(severity) {
    return SEVERITY_EMOJI[severity] || 'ℹ️';
  }

  getSeverityLabel(severity) {
    const labels = {
      CRITICAL: '🚨 Critical',
      WARNING: '⚠️ Warning',
      INFO: 'ℹ️ Info',
      OPPORTUNITY: '💡 Opportunity',
    };
    return labels[severity] || String(severity || '');
  }

  getConfidenceLevel(score) {
    const n = Number(score) || 0;
    if (n >= 90) return 'Very High';
    if (n >= 75) return 'High';
    if (n >= 60) return 'Moderate';
    if (n >= 40) return 'Low';
    return 'Very Low';
  }

  getConfidenceEmoji(score) {
    const level = this.getConfidenceLevel(score);
    const emojis = {
      'Very High': '✅✅',
      High: '✅',
      Moderate: '📊',
      Low: '⚠️',
      'Very Low': '❌',
    };
    return emojis[level] || '📊';
  }

  getStatusLabel(status) {
    const labels = {
      ACTIVE: '🟢 Active',
      ACKNOWLEDGED: '📖 Acknowledged',
      ACTIONED: '🔧 Actioned',
      RESOLVED: '✅ Resolved',
      DISMISSED: '❌ Dismissed',
      EXPIRED: '⏰ Expired',
    };
    return labels[status] || String(status || '');
  }

  getTimeframeLabel(timeframe) {
    const labels = {
      IMMEDIATE: '⏱️ Immediate (within hours)',
      SHORT_TERM: '📅 Short-term (within days)',
      MEDIUM_TERM: '📆 Medium-term (within weeks)',
      LONG_TERM: '📈 Long-term (within months)',
    };
    return labels[timeframe] || String(timeframe || '');
  }

  // ─── Number formatting (locale-aware, allocation-light) ────

  formatCurrency(amount) {
    if (amount == null) return null;
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return amount;
    return `${this.currencySymbol}${this._currencyFormatter.format(amount)}`;
  }

  formatPercentage(value) {
    if (value == null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) return value;
    // Accept both 0.25 and 25 styles; treat |value| > 1 as already percent
    const ratio = Math.abs(value) > 1 ? value / 100 : value;
    return this._percentFormatter.format(ratio);
  }

  // ─── Summaries & plans ─────────────────────────────────────

  generateDisplaySummary(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];
    const summary = {
      total: list.length,
      byPriority: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0, OPPORTUNITY: 0 },
      byCategory: {},
      actionable: 0,
      expired: 0,
      averageConfidence: 0,
    };

    let totalConfidence = 0;
    for (const decision of list) {
      if (summary.byPriority[decision.priority] !== undefined) {
        summary.byPriority[decision.priority]++;
      }
      if (summary.bySeverity[decision.severity] !== undefined) {
        summary.bySeverity[decision.severity]++;
      }
      if (decision.category) {
        summary.byCategory[decision.category] =
          (summary.byCategory[decision.category] || 0) + 1;
      }
      if (this._safeCall(decision, 'isActionable', false)) {
        summary.actionable++;
      }
      if (this._safeCall(decision, 'isExpired', false)) {
        summary.expired++;
      }
      totalConfidence += Number(decision.confidence) || 0;
    }

    summary.averageConfidence =
      list.length > 0 ? Math.round(totalConfidence / list.length) : 0;
    return summary;
  }

  generateExecutiveRecommendations(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];
    const recommendations = [];
    const critical = list.filter((d) => d.priority === 'CRITICAL');
    const high = list.filter((d) => d.priority === 'HIGH');

    if (critical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: `${critical.length} critical decisions require immediate attention.`,
        decisions: critical.map((d) => d.title),
      });
    }
    if (high.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: `${high.length} high priority decisions should be addressed soon.`,
        decisions: high.slice(0, 3).map((d) => d.title),
      });
    }
    return recommendations;
  }

  generateActionPlan(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];
    const actionable = list.filter((d) =>
      this._safeCall(d, 'isActionable', false)
    );
    const sorted = this._sortByPriority(actionable);

    return {
      totalActions: actionable.length,
      immediate: sorted
        .filter((d) => d.priority === 'CRITICAL')
        .map((d) => ({
          title: d.title,
          recommendation: d.recommendation,
          timeframe: 'Immediate',
        })),
      shortTerm: sorted
        .filter((d) => d.priority === 'HIGH')
        .slice(0, 5)
        .map((d) => ({
          title: d.title,
          recommendation: d.recommendation,
          timeframe: 'Short-term',
        })),
      mediumTerm: sorted
        .filter((d) => d.priority === 'MEDIUM')
        .slice(0, 5)
        .map((d) => ({
          title: d.title,
          recommendation: d.recommendation,
          timeframe: 'Medium-term',
        })),
    };
  }

  // ─── HTML / Text (for email / notifications) ───────────────

  formatForHTML(decision, options = {}) {
    const formatted = this.format(decision, { ...options, format: 'full' });
    if (!formatted) return '';

    const created = this._formatDate(formatted.createdAt);
    const expires = this._formatDate(formatted.expiresAt);

    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <span style="font-size: 24px;">${formatted.priorityEmoji}</span>
          <span style="font-size: 20px; font-weight: bold;">${formatted.priorityLabel}</span>
          <span style="margin-left: auto; font-size: 14px; color: #666;">${formatted.severityEmoji} ${formatted.severityLabel}</span>
        </div>
        <h2 style="margin: 0 0 8px 0; font-size: 18px;">${this._escapeHtml(formatted.title)}</h2>
        <p style="color: #555; margin: 0 0 12px 0; font-size: 14px;">${this._escapeHtml(formatted.summary)}</p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin: 12px 0;">
          <strong>Recommendation:</strong>
          <p style="margin: 4px 0 0 0; font-size: 14px;">${this._escapeHtml(formatted.recommendation)}</p>
        </div>
    `;

    if (formatted.evidence && Object.keys(formatted.evidence).length > 0) {
      html += `
        <div style="margin: 12px 0;">
          <strong>Evidence:</strong>
          <ul style="margin: 4px 0; padding-left: 20px; font-size: 14px;">
      `;
      for (const [key, value] of Object.entries(formatted.evidence)) {
        html += `<li>${this._escapeHtml(key)}: ${this._escapeHtml(String(value))}</li>`;
      }
      html += `</ul></div>`;
    }

    if (formatted.expectedImpact) {
      html += `
        <div style="margin: 12px 0;">
          <strong>Expected Impact:</strong>
          <p style="margin: 4px 0 0 0; font-size: 14px;">${this._escapeHtml(formatted.expectedImpact)}</p>
        </div>
      `;
    }

    if (formatted.timeframe) {
      html += `
        <div style="margin: 12px 0; font-size: 14px;">
          <strong>Timeframe:</strong> ${this._escapeHtml(formatted.timeframeLabel)}
        </div>
      `;
    }

    if (formatted.impact && formatted.impact.metrics) {
      html += `
        <div style="margin: 12px 0; background: #e8f5e9; padding: 12px; border-radius: 4px;">
          <strong>Financial Impact:</strong>
      `;
      const m = formatted.impact.metrics;
      if (m.profit) html += `<div>Profit Impact: ${m.profit}</div>`;
      if (m.revenue) html += `<div>Revenue Impact: ${m.revenue}</div>`;
      if (m.annualSaving) html += `<div>Annual Savings: ${m.annualSaving}</div>`;
      if (m.roi) html += `<div>ROI: ${m.roi}</div>`;
      html += `
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            Confidence: ${formatted.confidence}% ${formatted.confidenceEmoji}
          </div>
        </div>
      `;
    }

    html += `
        <div style="margin-top: 16px; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 12px;">
          <span>Created: ${created}</span>
          <span style="margin-left: 12px;">Expires: ${expires}</span>
          <span style="margin-left: 12px;">Status: ${formatted.statusLabel}</span>
        </div>
      </div>
    `;
    return html;
  }

  formatForText(decision, options = {}) {
    const formatted = this.format(decision, { ...options, format: 'full' });
    if (!formatted) return '';

    const lines = [];
    lines.push(`${formatted.priorityEmoji} ${formatted.priorityLabel}`);
    lines.push(`${formatted.severityEmoji} ${formatted.severityLabel}`);
    lines.push('');
    lines.push(formatted.title);
    lines.push('='.repeat(Math.min(String(formatted.title || '').length, 60)));
    lines.push('');
    lines.push(formatted.summary || '');
    lines.push('');
    lines.push(`Recommendation: ${formatted.recommendation || ''}`);
    lines.push('');

    if (formatted.evidence && Object.keys(formatted.evidence).length > 0) {
      lines.push('Evidence:');
      for (const [key, value] of Object.entries(formatted.evidence)) {
        lines.push(`  • ${key}: ${value}`);
      }
      lines.push('');
    }

    if (formatted.expectedImpact) {
      lines.push(`Expected Impact: ${formatted.expectedImpact}`);
      lines.push('');
    }

    if (formatted.timeframe) {
      lines.push(`Timeframe: ${formatted.timeframeLabel}`);
    }

    if (formatted.impact && formatted.impact.metrics) {
      lines.push('');
      lines.push('Financial Impact:');
      const m = formatted.impact.metrics;
      if (m.profit) lines.push(`  • Profit Impact: ${m.profit}`);
      if (m.revenue) lines.push(`  • Revenue Impact: ${m.revenue}`);
      if (m.annualSaving) lines.push(`  • Annual Savings: ${m.annualSaving}`);
      if (m.roi) lines.push(`  • ROI: ${m.roi}`);
      lines.push(
        `  • Confidence: ${formatted.confidence}% ${formatted.confidenceEmoji}`
      );
    }

    lines.push('');
    lines.push(`Status: ${formatted.statusLabel}`);
    lines.push(`Created: ${this._formatDate(formatted.createdAt)}`);
    lines.push(`Expires: ${this._formatDate(formatted.expiresAt)}`);

    return lines.join('\n');
  }

  // ─── Internal helpers ──────────────────────────────────────

  _sortByPriority(list) {
    return [...list].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      return pa - pb;
    });
  }

  _safeCall(obj, method, fallback) {
    if (obj && typeof obj[method] === 'function') {
      try {
        return obj[method]();
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  _formatDate(value) {
    if (value == null) return 'N/A';
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString(this.locale);
    } catch {
      return 'N/A';
    }
  }

  _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = DecisionFormatter;