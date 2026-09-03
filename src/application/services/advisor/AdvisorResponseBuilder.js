/**
 * Advisor Response Builder – Production v2.0
 *
 * Builds conversational, structured responses from insights.
 * Fully SSOT-compliant, defensive, observable, and ready for horizontal scale.
 *
 * @version 2.0.0
 * @schema 2026-09
 */

'use strict';

const {
  ADVISOR_RESPONSE_TYPES,
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  ADVISOR_CATEGORIES,
  SENTIMENT_EMOJI,
  SEVERITY_EMOJI,
  CATEGORY_LABEL
} = require('./contracts/AdvisorContracts');

const {
  AdvisorResponse
} = require('./contracts/AdvisorDataTypes');

// ──────────────────────────────────────────────────────────────
// SSOT Configuration
// ──────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  defaultTone: ADVISOR_TONE.CONVERSATIONAL,
  defaultContext: ADVISOR_CONTEXT.MONTHLY,
  maxRecommendations: 5,
  maxActions: 5,
  maxInsights: 10,
  maxContentLength: 12000,

  severityOrder: Object.freeze({
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4
  })
});

class AdvisorResponseBuilder {
  /**
   * @param {Object} [options]
   * @param {Object} [options.config]
   * @param {Object} [options.logger]
   * @param {Object} [options.metrics]
   * @param {Function} [options.clock]
   */
  constructor(options = {}) {
    this.config = this._mergeConfig(DEFAULT_CONFIG, options.config || {});
    this.defaultTone = options.defaultTone || this.config.defaultTone;
    this.defaultContext = options.defaultContext || this.config.defaultContext;
    this.maxRecommendations = options.maxRecommendations ?? this.config.maxRecommendations;
    this.maxActions = options.maxActions ?? this.config.maxActions;

    this.logger = options.logger || console;
    this.metrics = options.metrics || this._noopMetrics();
    this.clock = options.clock || (() => new Date());
  }

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /**
   * Build a response from insights.
   * Never throws – returns a safe empty response on failure.
   *
   * @param {Array} insights
   * @param {Object} [options]
   * @returns {AdvisorResponse}
   */
  build(insights = [], options = {}) {
    const start = process.hrtime.bigint();

    try {
      const safeInsights = Array.isArray(insights) ? insights : [];

      const {
        type = ADVISOR_RESPONSE_TYPES.INSIGHT,
        title = this.generateTitle(safeInsights),
        tone = this.defaultTone,
        context = this.defaultContext,
        question = null,
        maxInsights = this.config.maxInsights,
        summary = null
      } = options;

      const sorted = this.sortInsights(safeInsights);
      const limited = sorted.slice(0, Math.max(0, maxInsights));

      const overallSentiment = this.determineOverallSentiment(limited);
      const overallSeverity = this.determineOverallSeverity(limited);

      let content = this.generateContent(limited, tone, context);
      if (content.length > this.config.maxContentLength) {
        content = content.slice(0, this.config.maxContentLength - 3) + '…';
      }

      const finalSummary = summary || this.generateSummary(limited);
      const recommendations = this.extractRecommendations(limited)
        .slice(0, this.maxRecommendations);
      const actions = this.extractActions(limited)
        .slice(0, this.maxActions);
      const data = this.buildResponseData(limited);

      const response = new AdvisorResponse({
        type,
        title: String(title),
        content,
        summary: finalSummary,
        sentiment: overallSentiment,
        severity: overallSeverity,
        insights: limited,
        recommendations,
        actions,
        data,
        tone,
        context,
        question: question ? String(question) : null,
        generatedAt: this.clock()
      });

      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.metrics.histogram?.('advisor.response.build.duration_ms', durationMs);
      this.metrics.gauge?.('advisor.response.insight_count', limited.length);
      this.logger.info?.({
        event: 'response_build_complete',
        type,
        insightCount: limited.length,
        durationMs: Math.round(durationMs)
      });

      return response;
    } catch (err) {
      this.logger.error?.({
        event: 'response_build_failed',
        error: err.message,
        stack: err.stack
      });
      this.metrics.increment?.('advisor.response.build.errors');

      // Safe fallback – never crash the caller
      return this._createEmptyResponse(options);
    }
  }

  buildDailyReport(insights, options = {}) {
    return this.build(insights, {
      type: ADVISOR_RESPONSE_TYPES.SUMMARY,
      title: '📊 Daily Business Summary',
      tone: ADVISOR_TONE.PROFESSIONAL,
      context: ADVISOR_CONTEXT.DAILY,
      ...options
    });
  }

  buildWeeklyReport(insights, options = {}) {
    return this.build(insights, {
      type: ADVISOR_RESPONSE_TYPES.SUMMARY,
      title: '📈 Weekly Business Review',
      tone: ADVISOR_TONE.PROFESSIONAL,
      context: ADVISOR_CONTEXT.WEEKLY,
      ...options
    });
  }

  buildMonthlyReport(insights, options = {}) {
    return this.build(insights, {
      type: ADVISOR_RESPONSE_TYPES.SUMMARY,
      title: '📊 Monthly Performance Report',
      tone: ADVISOR_TONE.PROFESSIONAL,
      context: ADVISOR_CONTEXT.MONTHLY,
      ...options
    });
  }

  buildRecommendation(insights, options = {}) {
    return this.build(insights, {
      type: ADVISOR_RESPONSE_TYPES.RECOMMENDATION,
      title: '💡 Top Recommendations',
      tone: ADVISOR_TONE.PROFESSIONAL,
      context: ADVISOR_CONTEXT.REAL_TIME,
      ...options
    });
  }

  buildActionPlan(insights, options = {}) {
    return this.build(insights, {
      type: ADVISOR_RESPONSE_TYPES.ACTION_PLAN,
      title: '📋 Action Plan',
      tone: ADVISOR_TONE.URGENT,
      context: ADVISOR_CONTEXT.REAL_TIME,
      ...options
    });
  }

  buildWarning(insights, options = {}) {
    return this.build(insights, {
      type: ADVISOR_RESPONSE_TYPES.WARNING,
      title: '⚠️ Critical Warnings',
      tone: ADVISOR_TONE.URGENT,
      context: ADVISOR_CONTEXT.REAL_TIME,
      ...options
    });
  }

  buildAnswer(insights, question, options = {}) {
    return this.build(insights, {
      type: ADVISOR_RESPONSE_TYPES.ANSWER,
      title: `Answer: ${String(question || '')}`,
      tone: ADVISOR_TONE.CONVERSATIONAL,
      context: ADVISOR_CONTEXT.REAL_TIME,
      question: question ? String(question) : null,
      ...options
    });
  }

  // ────────────────────────────────────────────────────────────
  // Core Logic
  // ────────────────────────────────────────────────────────────

  sortInsights(insights) {
    const order = this.config.severityOrder;
    return [...insights].sort((a, b) => {
      return (order[a?.severity] ?? 99) - (order[b?.severity] ?? 99);
    });
  }

  determineOverallSentiment(insights) {
    if (!insights || insights.length === 0) return ADVISOR_SENTIMENT.NEUTRAL;

    const hasUrgent = insights.some(i => i?.sentiment === ADVISOR_SENTIMENT.URGENT);
    const hasNegative = insights.some(i => i?.sentiment === ADVISOR_SENTIMENT.NEGATIVE);
    const hasPositive = insights.some(i => i?.sentiment === ADVISOR_SENTIMENT.POSITIVE);

    if (hasUrgent) return ADVISOR_SENTIMENT.URGENT;
    if (hasNegative && !hasPositive) return ADVISOR_SENTIMENT.NEGATIVE;
    if (hasPositive && !hasNegative && !hasUrgent) return ADVISOR_SENTIMENT.POSITIVE;
    return ADVISOR_SENTIMENT.NEUTRAL;
  }

  determineOverallSeverity(insights) {
    if (!insights || insights.length === 0) return ADVISOR_SEVERITY.INFO;

    if (insights.some(i => i?.severity === ADVISOR_SEVERITY.CRITICAL)) return ADVISOR_SEVERITY.CRITICAL;
    if (insights.some(i => i?.severity === ADVISOR_SEVERITY.HIGH)) return ADVISOR_SEVERITY.HIGH;
    if (insights.some(i => i?.severity === ADVISOR_SEVERITY.MEDIUM)) return ADVISOR_SEVERITY.MEDIUM;
    return ADVISOR_SEVERITY.INFO;
  }

  generateContent(insights, tone, context) {
    if (!insights || insights.length === 0) {
      return "I don't have any insights to share right now. Everything appears to be on track.";
    }

    const parts = [];
    parts.push(this.generateOpening(tone, insights));

    const grouped = this.groupInsightsByCategory(insights);

    for (const [category, categoryInsights] of Object.entries(grouped)) {
      if (!categoryInsights.length) continue;

      const label = this.getCategoryLabel(category);
      parts.push(`\n**${label}:**`);

      for (const insight of categoryInsights) {
        const emoji = SENTIMENT_EMOJI[insight.sentiment] || 'ℹ️';
        const content = insight.content || insight.summary || '';
        parts.push(`${emoji} ${content}`);

        if (Array.isArray(insight.recommendations) && insight.recommendations.length > 0) {
          for (const rec of insight.recommendations.slice(0, 2)) {
            parts.push(`  → ${rec}`);
          }
        }
      }
    }

    parts.push(this.generateClosing(tone, insights));
    return parts.join('\n');
  }

  generateOpening(tone, insights) {
    const sentiment = this.determineOverallSentiment(insights);

    const openings = {
      [ADVISOR_TONE.PROFESSIONAL]: {
        [ADVISOR_SENTIMENT.POSITIVE]: 'Here is your business intelligence summary:',
        [ADVISOR_SENTIMENT.NEUTRAL]: 'Here is your business performance overview:',
        [ADVISOR_SENTIMENT.NEGATIVE]: 'Here is your business update with some areas requiring attention:',
        [ADVISOR_SENTIMENT.URGENT]: '⚠️ **URGENT:** Immediate attention required on the following matters:'
      },
      [ADVISOR_TONE.CONVERSATIONAL]: {
        [ADVISOR_SENTIMENT.POSITIVE]: "Great news! Here's what's working well for your business:",
        [ADVISOR_SENTIMENT.NEUTRAL]: "Here's how your business is doing right now:",
        [ADVISOR_SENTIMENT.NEGATIVE]: "I've noticed a few things that need your attention:",
        [ADVISOR_SENTIMENT.URGENT]: '🚨 **URGENT:** There are critical issues that need your immediate attention!'
      },
      [ADVISOR_TONE.URGENT]: {
        [ADVISOR_SENTIMENT.POSITIVE]: '⚠️ Review required. Here are the key updates:',
        [ADVISOR_SENTIMENT.NEUTRAL]: '⚠️ Review required. Here are the key updates:',
        [ADVISOR_SENTIMENT.NEGATIVE]: '⚠️ **ACTION REQUIRED:** Please review these critical items:',
        [ADVISOR_SENTIMENT.URGENT]: '⚠️ **CRITICAL:** Immediate action is required on the following:'
      },
      [ADVISOR_TONE.ENCOURAGING]: {
        [ADVISOR_SENTIMENT.POSITIVE]: '🌟 Your business is on a great trajectory! Here\'s the summary:',
        [ADVISOR_SENTIMENT.NEUTRAL]: '📈 Your business is heading in the right direction. Here\'s the update:',
        [ADVISOR_SENTIMENT.NEGATIVE]: '💪 Every business faces challenges. Here\'s what we can address together:',
        [ADVISOR_SENTIMENT.URGENT]: '🚨 Stay calm. Here are the critical items we need to address:'
      },
      [ADVISOR_TONE.ANALYTICAL]: {
        [ADVISOR_SENTIMENT.POSITIVE]: '📊 Analysis of business performance shows positive indicators:',
        [ADVISOR_SENTIMENT.NEUTRAL]: '📊 Business performance analysis results:',
        [ADVISOR_SENTIMENT.NEGATIVE]: '📊 Analysis indicates performance gaps in the following areas:',
        [ADVISOR_SENTIMENT.URGENT]: '📊 Critical performance indicators require immediate review:'
      }
    };

    const toneMap = openings[tone] || openings[ADVISOR_TONE.CONVERSATIONAL];
    return toneMap[sentiment] || toneMap[ADVISOR_SENTIMENT.NEUTRAL];
  }

  generateClosing(tone, insights) {
    const sentiment = this.determineOverallSentiment(insights);
    const severity = this.determineOverallSeverity(insights);

    if (sentiment === ADVISOR_SENTIMENT.URGENT || severity === ADVISOR_SEVERITY.CRITICAL) {
      return '\n🚨 **Please address the critical items above immediately.** I recommend reviewing the action plan and prioritising these issues. Let me know if you need more details on any of these points.';
    }
    if (sentiment === ADVISOR_SENTIMENT.NEGATIVE) {
      return '\n⚠️ **Action recommended:** I suggest reviewing the items flagged above. Would you like me to dive deeper into any specific area?';
    }
    if (sentiment === ADVISOR_SENTIMENT.POSITIVE) {
      return '\n✅ **Keep up the great work!** Your business is performing well. Continue monitoring these positive trends. Would you like more detail on any metric?';
    }
    return '\n📊 **Want more details?** Let me know if you\'d like to explore any of these areas in more depth.';
  }

  generateTitle(insights) {
    if (!insights || insights.length === 0) return 'Business Update';

    const severity = this.determineOverallSeverity(insights);
    const sentiment = this.determineOverallSentiment(insights);

    if (severity === ADVISOR_SEVERITY.CRITICAL) return '🚨 Critical Business Alerts';
    if (severity === ADVISOR_SEVERITY.HIGH) return '⚠️ Important Business Updates';
    if (sentiment === ADVISOR_SENTIMENT.POSITIVE) return '✅ Business Performance Update';
    return '📊 Business Intelligence Update';
  }

  generateSummary(insights) {
    if (!insights || insights.length === 0) {
      return 'No significant insights to report.';
    }

    const critical = insights.filter(i => i?.severity === ADVISOR_SEVERITY.CRITICAL);
    const high = insights.filter(i => i?.severity === ADVISOR_SEVERITY.HIGH);
    const positive = insights.filter(i => i?.sentiment === ADVISOR_SENTIMENT.POSITIVE);
    const negative = insights.filter(i =>
      i?.sentiment === ADVISOR_SENTIMENT.NEGATIVE || i?.sentiment === ADVISOR_SENTIMENT.URGENT
    );

    let summary = '';
    if (critical.length > 0) summary += `🚨 ${critical.length} critical issue(s) require immediate attention. `;
    if (high.length > 0) summary += `⚠️ ${high.length} high-priority item(s) need review. `;

    if (negative.length > 0 && positive.length === 0) {
      summary += 'Overall business indicators are concerning. ';
    } else if (positive.length > 0 && negative.length === 0) {
      summary += 'Overall business indicators are positive. ';
    } else if (positive.length > 0 && negative.length > 0) {
      summary += 'Mixed performance with both positive and negative indicators. ';
    }

    if (!summary) summary = `${insights.length} insights available for review.`;
    return summary.trim();
  }

  extractRecommendations(insights) {
    const set = new Set();
    for (const insight of insights || []) {
      if (Array.isArray(insight?.recommendations)) {
        for (const rec of insight.recommendations) {
          if (rec) set.add(String(rec));
        }
      }
    }
    return Array.from(set);
  }

  extractActions(insights) {
    const set = new Set();
    const criticalHigh = (insights || []).filter(i =>
      i?.severity === ADVISOR_SEVERITY.CRITICAL || i?.severity === ADVISOR_SEVERITY.HIGH
    );

    for (const insight of criticalHigh) {
      if (Array.isArray(insight.recommendations)) {
        for (const rec of insight.recommendations) {
          if (rec && this.isActionable(rec)) set.add(String(rec));
        }
      }
    }
    return Array.from(set);
  }

  isActionable(text) {
    if (!text || typeof text !== 'string') return false;
    const indicators = [
      'review', 'consider', 'implement', 'address', 'action',
      'immediately', 'urgent', 'critical', 'prioritize', 'prioritise',
      'order', 'negotiate', 'accelerate', 'reduce', 'increase'
    ];
    const lower = text.toLowerCase();
    return indicators.some(ind => lower.includes(ind));
  }

  groupInsightsByCategory(insights) {
    const grouped = {};
    for (const insight of insights || []) {
      const cat = insight?.category || ADVISOR_CATEGORIES.GENERAL;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(insight);
    }
    return grouped;
  }

  /** SSOT – uses CATEGORY_LABEL from contracts */
  getCategoryLabel(category) {
    return CATEGORY_LABEL[category] || category || 'General';
  }

  buildResponseData(insights) {
    const data = {
      totalInsights: insights?.length || 0,
      bySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0
      },
      byCategory: {},
      overallSentiment: this.determineOverallSentiment(insights),
      overallSeverity: this.determineOverallSeverity(insights)
    };

    for (const insight of insights || []) {
      if (insight?.severity && data.bySeverity[insight.severity] !== undefined) {
        data.bySeverity[insight.severity]++;
      }
      if (insight?.category) {
        data.byCategory[insight.category] = (data.byCategory[insight.category] || 0) + 1;
      }
    }
    return data;
  }

  // ────────────────────────────────────────────────────────────
  // Formatters
  // ────────────────────────────────────────────────────────────

  formatDisplay(response) {
    if (!response) return null;
    const emoji = SENTIMENT_EMOJI[response.sentiment] || 'ℹ️';

    return {
      id: response.id,
      title: response.title,
      summary: response.summary,
      content: response.content,
      sentiment: response.sentiment,
      sentimentEmoji: emoji,
      severity: response.severity,
      recommendations: [...(response.recommendations || [])],
      actions: [...(response.actions || [])],
      insights: (response.insights || []).map(i =>
        typeof i.toDisplay === 'function' ? i.toDisplay() : i
      ),
      question: response.question,
      generatedAt: response.generatedAt instanceof Date
        ? response.generatedAt.toISOString()
        : response.generatedAt
    };
  }

  formatText(response) {
    if (!response) return '';
    const emoji = SENTIMENT_EMOJI[response.sentiment] || 'ℹ️';
    let text = `${emoji} ${response.title}\n`;
    text += `${'='.repeat(Math.min((response.title || '').length + 2, 60))}\n\n`;

    if (response.summary) text += `${response.summary}\n\n`;
    text += response.content || '';

    if (response.recommendations?.length) {
      text += '\n\n**Recommendations:**\n';
      for (const rec of response.recommendations) text += `  • ${rec}\n`;
    }
    if (response.actions?.length) {
      text += '\n**Action Items:**\n';
      for (const action of response.actions) text += `  ✓ ${action}\n`;
    }

    const ts = response.generatedAt instanceof Date
      ? response.generatedAt.toLocaleString()
      : String(response.generatedAt || '');
    text += `\n\nGenerated: ${ts}`;
    return text;
  }

  formatHTML(response) {
    if (!response) return '';
    const emoji = SENTIMENT_EMOJI[response.sentiment] || 'ℹ️';
    const esc = this._escapeHtml;

    let html = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;background:#fafafa;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
    <span style="font-size:28px;">${emoji}</span>
    <h1 style="margin:0;font-size:22px;color:#333;">${esc(response.title)}</h1>
  </div>`;

    if (response.summary) {
      html += `
  <div style="background:#f0f0f0;padding:12px 16px;border-radius:4px;margin-bottom:16px;border-left:4px solid #666;">
    <p style="margin:0;color:#555;font-size:14px;">${esc(response.summary)}</p>
  </div>`;
    }

    if (response.insights?.length) {
      html += `<div style="margin-bottom:16px;"><h3 style="font-size:16px;color:#333;margin-bottom:8px;">Key Insights</h3>`;
      const severityColors = {
        CRITICAL: '#dc3545', HIGH: '#e74c3c', MEDIUM: '#f39c12', LOW: '#3498db', INFO: '#95a5a6'
      };

      for (const insight of response.insights) {
        const color = severityColors[insight.severity] || '#95a5a6';
        const title = esc(insight.title || '');
        const content = esc(insight.content || insight.summary || '');
        const sEmoji = SENTIMENT_EMOJI[insight.sentiment] || 'ℹ️';

        html += `
  <div style="background:white;padding:12px 16px;border-radius:4px;margin-bottom:8px;border-left:4px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:16px;">${sEmoji}</span>
      <strong style="font-size:14px;">${title}</strong>
    </div>
    <p style="margin:4px 0 0 0;font-size:13px;color:#555;">${content}</p>
  </div>`;
      }
      html += `</div>`;
    }

    if (response.recommendations?.length) {
      html += `
  <div style="background:#e8f4fd;padding:12px 16px;border-radius:4px;margin-bottom:12px;">
    <h3 style="font-size:14px;margin:0 0 8px 0;color:#2c3e50;">💡 Recommendations</h3>
    <ul style="margin:0;padding-left:20px;font-size:13px;color:#333;">`;
      for (const rec of response.recommendations) {
        html += `<li>${esc(rec)}</li>`;
      }
      html += `</ul></div>`;
    }

    if (response.actions?.length) {
      html += `
  <div style="background:#fef9e7;padding:12px 16px;border-radius:4px;margin-bottom:12px;">
    <h3 style="font-size:14px;margin:0 0 8px 0;color:#7d6608;">📋 Action Items</h3>
    <ul style="margin:0;padding-left:20px;font-size:13px;color:#333;">`;
      for (const action of response.actions) {
        html += `<li>${esc(action)}</li>`;
      }
      html += `</ul></div>`;
    }

    const ts = response.generatedAt instanceof Date
      ? response.generatedAt.toLocaleString()
      : String(response.generatedAt || '');

    html += `
  <div style="font-size:11px;color:#999;border-top:1px solid #e0e0e0;padding-top:12px;margin-top:12px;">
    Generated: ${esc(ts)}
  </div>
</div>`;
    return html;
  }

  formatJSON(response) {
    if (!response) return null;
    return {
      id: response.id,
      type: response.type,
      title: response.title,
      summary: response.summary,
      content: response.content,
      sentiment: response.sentiment,
      severity: response.severity,
      recommendations: [...(response.recommendations || [])],
      actions: [...(response.actions || [])],
      insights: (response.insights || []).map(i =>
        typeof i.toDisplay === 'function' ? i.toDisplay() : i
      ),
      data: response.data,
      question: response.question,
      generatedAt: response.generatedAt instanceof Date
        ? response.generatedAt.toISOString()
        : response.generatedAt
    };
  }

  // ────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────

  _createEmptyResponse(options = {}) {
    try {
      return new AdvisorResponse({
        type: options.type || ADVISOR_RESPONSE_TYPES.INSIGHT,
        title: options.title || 'Business Update',
        content: "I don't have any insights to share right now.",
        summary: 'No significant insights to report.',
        sentiment: ADVISOR_SENTIMENT.NEUTRAL,
        severity: ADVISOR_SEVERITY.INFO,
        insights: [],
        recommendations: [],
        actions: [],
        data: { totalInsights: 0 },
        tone: options.tone || this.defaultTone,
        context: options.context || this.defaultContext,
        question: options.question || null,
        generatedAt: this.clock()
      });
    } catch {
      // Absolute last resort
      return {
        id: 'fallback',
        type: ADVISOR_RESPONSE_TYPES.INSIGHT,
        title: 'Business Update',
        content: "I don't have any insights to share right now.",
        summary: 'No significant insights to report.',
        sentiment: ADVISOR_SENTIMENT.NEUTRAL,
        severity: ADVISOR_SEVERITY.INFO,
        insights: [],
        recommendations: [],
        actions: [],
        generatedAt: this.clock()
      };
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

  _mergeConfig(base, override) {
    return Object.freeze({ ...base, ...override });
  }

  _noopMetrics() {
    return { increment: () => {}, histogram: () => {}, gauge: () => {} };
  }
}

module.exports = AdvisorResponseBuilder;