/**
 * Advisor Engine – Production v2.0
 *
 * Central orchestrator for all AI Advisor functionality.
 * Unifies Insight Generator, Response Builder, Summarizer, and Question Handler.
 * Fully SSOT-compliant, defensive, observable, and ready for horizontal scale.
 *
 * @version 2.0.0
 * @schema 2026-09
 */

'use strict';

const AdvisorInsightGenerator = require('./AdvisorInsightGenerator');
const AdvisorResponseBuilder = require('./AdvisorResponseBuilder');
const AdvisorSummarizer = require('./AdvisorSummarizer');
const AdvisorQuestionHandler = require('./AdvisorQuestionHandler');

const {
  ADVISOR_RESPONSE_TYPES,
  ADVISOR_CONTEXT,
  ADVISOR_TONE,
  ADVISOR_SEVERITY,
  ADVISOR_SENTIMENT
} = require('./contracts/AdvisorContracts');

// ──────────────────────────────────────────────────────────────
// SSOT Configuration
// ──────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  defaultContext: ADVISOR_CONTEXT.MONTHLY,
  defaultTone: ADVISOR_TONE.CONVERSATIONAL,
  maxInsights: 20,
  confidenceThreshold: 55,
  providerTimeoutMs: 4000,
  recommendationMinConfidence: 60,
  warningMinConfidence: 60,
  recommendationLimit: 5
});

const PROVIDER_NAMES = Object.freeze([
  'analytics',
  'forecast',
  'risk',
  'report',
  'inventory',
  'customers',
  'suppliers',
  'cashFlow',
  'expenses'
]);

const REPORT_TITLES = Object.freeze({
  [ADVISOR_CONTEXT.DAILY]: '📊 Daily Business Update',
  [ADVISOR_CONTEXT.WEEKLY]: '📈 Weekly Business Review',
  [ADVISOR_CONTEXT.MONTHLY]: '📊 Monthly Performance Report',
  [ADVISOR_CONTEXT.YEARLY]: '📈 Annual Business Report',
  [ADVISOR_CONTEXT.FORECAST]: '🔮 Business Forecast'
});

class AdvisorEngine {
  /**
   * @param {Object} [options]
   * @param {Object} [options.dataProviders]
   * @param {Object} [options.insightGenerator]
   * @param {Object} [options.responseBuilder]
   * @param {Object} [options.summarizer]
   * @param {Object} [options.questionHandler]
   * @param {Object} [options.config]
   * @param {Object} [options.logger]
   * @param {Object} [options.metrics]
   * @param {Function} [options.clock]
   */
  constructor(options = {}) {
    this.config = this._mergeConfig(DEFAULT_CONFIG, options.config || {});
    // Allow top-level shorthand overrides
    if (options.defaultContext) this.config = { ...this.config, defaultContext: options.defaultContext };
    if (options.defaultTone) this.config = { ...this.config, defaultTone: options.defaultTone };
    if (options.maxInsights != null) this.config = { ...this.config, maxInsights: options.maxInsights };
    if (options.confidenceThreshold != null) {
      this.config = { ...this.config, confidenceThreshold: options.confidenceThreshold };
    }
    this.config = Object.freeze(this.config);

    this.logger = options.logger || console;
    this.metrics = options.metrics || this._noopMetrics();
    this.clock = options.clock || (() => new Date());

    this.insightGenerator = options.insightGenerator || new AdvisorInsightGenerator({
      logger: this.logger,
      metrics: this.metrics,
      clock: this.clock
    });

    this.responseBuilder = options.responseBuilder || new AdvisorResponseBuilder({
      logger: this.logger,
      metrics: this.metrics,
      clock: this.clock
    });

    this.summarizer = options.summarizer || new AdvisorSummarizer({
      logger: this.logger,
      metrics: this.metrics,
      clock: this.clock
    });

    this.dataProviders = options.dataProviders || {};

    this.questionHandler = options.questionHandler || new AdvisorQuestionHandler({
      dataProviders: this.dataProviders,
      insightGenerator: this.insightGenerator,
      responseBuilder: this.responseBuilder,
      summarizer: this.summarizer,
      logger: this.logger,
      metrics: this.metrics,
      clock: this.clock
    });
  }

  // ────────────────────────────────────────────────────────────
  // Public API – Reports
  // ────────────────────────────────────────────────────────────

  /**
   * Generate a full advisor report.
   * Never throws – returns a safe empty report on failure.
   */
  async generateReport(context = {}, options = {}) {
    const start = process.hrtime.bigint();
    const reportId = `rpt_${this.clock().getTime()}_${Math.random().toString(36).slice(2, 8)}`;

    this.logger.info?.({ event: 'report_start', reportId });

    try {
      // Normalize null / non-object inputs (default params only cover undefined)
      context = this._normalizeObject(context);
      options = this._normalizeObject(options);

      const {
        type = this.config.defaultContext,
        tone = this.config.defaultTone,
        includeInsights = true,
        includeSummary = true,
        includeRecommendations = true,
        maxInsights = this.config.maxInsights
      } = options;

      const data = await this.gatherAllData(context);

      const insights = this.insightGenerator.generate(data, context, {
        minConfidence: this.config.confidenceThreshold,
        includeAll: false,
        maxInsights
      }) || [];

      const response = this.responseBuilder.build(insights, {
        type: ADVISOR_RESPONSE_TYPES.SUMMARY,
        title: this.generateReportTitle(type, context),
        tone,
        context: type,
        maxInsights
      });

      let summary = null;
      if (includeSummary) {
        summary = this.summarizer.summarize(data, insights, {
          context: type,
          tone
        });
      }

      const report = {
        meta: Object.freeze({
          reportId,
          generatedAt: this.clock(),
          type,
          tone,
          businessId: context.businessId || 'unknown'
        }),
        response: this._safeToDisplay(response),
        summary: summary ? this.summarizer.formatForDisplay(summary) : null,
        metrics: this.extractKeyMetrics(data),
        insights: includeInsights
          ? insights.map(i => this._safeToDisplay(i)).filter(Boolean)
          : [],
        recommendations: includeRecommendations
          ? [...(response.recommendations || [])]
          : []
      };

      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.metrics.histogram?.('advisor.engine.report.duration_ms', durationMs);
      this.metrics.gauge?.('advisor.engine.report.insight_count', insights.length);
      this.logger.info?.({
        event: 'report_complete',
        reportId,
        type,
        insightCount: insights.length,
        durationMs: Math.round(durationMs)
      });

      return report;
    } catch (err) {
      this.logger.error?.({
        event: 'report_failed',
        reportId,
        error: err.message,
        stack: err.stack
      });
      this.metrics.increment?.('advisor.engine.report.errors');
      return this._emptyReport(context, options, reportId);
    }
  }

  async generateDailyReport(context = {}, options = {}) {
    return this.generateReport(context, {
      type: ADVISOR_CONTEXT.DAILY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      ...this._normalizeObject(options)
    });
  }

  async generateWeeklyReport(context = {}, options = {}) {
    return this.generateReport(context, {
      type: ADVISOR_CONTEXT.WEEKLY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      ...this._normalizeObject(options)
    });
  }

  async generateMonthlyReport(context = {}, options = {}) {
    return this.generateReport(context, {
      type: ADVISOR_CONTEXT.MONTHLY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      ...this._normalizeObject(options)
    });
  }

  async generateYearlyReport(context = {}, options = {}) {
    return this.generateReport(context, {
      type: ADVISOR_CONTEXT.YEARLY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      ...this._normalizeObject(options)
    });
  }

  async generateForecastReport(context = {}, options = {}) {
    return this.generateReport(context, {
      type: ADVISOR_CONTEXT.FORECAST,
      tone: ADVISOR_TONE.ANALYTICAL,
      ...this._normalizeObject(options)
    });
  }

  // ────────────────────────────────────────────────────────────
  // Public API – Questions & Insights
  // ────────────────────────────────────────────────────────────

  async askQuestion(question, context = {}, options = {}) {
    try {
      context = this._normalizeObject(context);
      options = this._normalizeObject(options);
      return await this.questionHandler.processQuestion(question, context, options);
    } catch (err) {
      this.logger.error?.({
        event: 'ask_question_failed',
        error: err.message,
        stack: err.stack
      });
      this.metrics.increment?.('advisor.engine.question.errors');
      return {
        requestId: 'error',
        question: null,
        answer: {
          type: ADVISOR_RESPONSE_TYPES.ANSWER,
          title: 'Unable to process question',
          content: 'I encountered an issue processing your question. Please try again.',
          summary: 'Processing error',
          sentiment: ADVISOR_SENTIMENT.NEUTRAL,
          severity: ADVISOR_SEVERITY.INFO,
          insights: [],
          recommendations: [],
          actions: []
        },
        intent: 'GENERAL',
        entities: {},
        keywords: [],
        dataKeys: []
      };
    }
  }

  async getInsights(context = {}, options = {}) {
    try {
      context = this._normalizeObject(context);
      options = this._normalizeObject(options);

      const {
        categories = [],
        limit = 10,
        minConfidence = this.config.confidenceThreshold
      } = options;

      const data = await this.gatherAllData(context);
      const insights = this.insightGenerator.generate(data, context, {
        categories,
        minConfidence,
        includeAll: false
      }) || [];

      return insights.slice(0, Math.max(0, limit));
    } catch (err) {
      this.logger.error?.({ event: 'get_insights_failed', error: err.message });
      this.metrics.increment?.('advisor.engine.insights.errors');
      return [];
    }
  }

  async getSummary(context = {}, options = {}) {
    try {
      context = this._normalizeObject(context);
      options = this._normalizeObject(options);

      const {
        context: summaryContext = this.config.defaultContext,
        tone = this.config.defaultTone
      } = options;

      const data = await this.gatherAllData(context);
      const insights = this.insightGenerator.generate(data, context, {
        minConfidence: this.config.confidenceThreshold
      }) || [];

      const summary = this.summarizer.summarize(data, insights, {
        context: summaryContext,
        tone
      });

      return this.summarizer.formatForDisplay(summary);
    } catch (err) {
      this.logger.error?.({ event: 'get_summary_failed', error: err.message });
      this.metrics.increment?.('advisor.engine.summary.errors');
      return {
        summary: 'No summary available.',
        metrics: {},
        wins: [],
        concerns: [],
        opportunities: [],
        takeaways: [],
        recommendations: [],
        context: this.config.defaultContext,
        generatedAt: this.clock().toISOString()
      };
    }
  }

  async getRecommendations(context = {}, options = {}) {
    try {
      context = this._normalizeObject(context);
      options = this._normalizeObject(options);

      const { limit = this.config.recommendationLimit } = options;

      const data = await this.gatherAllData(context);
      const insights = this.insightGenerator.generate(data, context, {
        minConfidence: this.config.recommendationMinConfidence
      }) || [];

      const response = this.responseBuilder.buildRecommendation(insights, {
        tone: ADVISOR_TONE.PROFESSIONAL
      });

      return [...(response.recommendations || [])].slice(0, Math.max(0, limit));
    } catch (err) {
      this.logger.error?.({ event: 'get_recommendations_failed', error: err.message });
      this.metrics.increment?.('advisor.engine.recommendations.errors');
      return [];
    }
  }

  async getWarnings(context = {}, options = {}) {
    try {
      context = this._normalizeObject(context);
      options = this._normalizeObject(options);

      const data = await this.gatherAllData(context);
      const insights = this.insightGenerator.generate(data, context, {
        minConfidence: this.config.warningMinConfidence
      }) || [];

      return insights
        .filter(i =>
          i?.severity === ADVISOR_SEVERITY.CRITICAL ||
          i?.severity === ADVISOR_SEVERITY.HIGH
        )
        .map(i => this._safeToDisplay(i))
        .filter(Boolean);
    } catch (err) {
      this.logger.error?.({ event: 'get_warnings_failed', error: err.message });
      this.metrics.increment?.('advisor.engine.warnings.errors');
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────
  // Data gathering
  // ────────────────────────────────────────────────────────────

  async gatherAllData(context = {}) {
    context = this._normalizeObject(context);
    const data = {};

    const fetchSafe = async (name, provider) => {
      if (!provider || typeof provider.getData !== 'function') return;
      try {
        const result = await this._withTimeout(
          Promise.resolve().then(() => provider.getData(context)),
          this.config.providerTimeoutMs,
          name
        );
        if (result && typeof result === 'object') {
          Object.assign(data, result);
        }
      } catch (err) {
        this.logger.warn?.({
          event: 'provider_failed',
          provider: name,
          error: err.message
        });
        this.metrics.increment?.(`advisor.engine.provider.${name}.errors`);
      }
    };

    await Promise.all(
      PROVIDER_NAMES.map(name => fetchSafe(name, this.dataProviders[name]))
    );

    return data;
  }

  extractKeyMetrics(data = {}) {
    data = this._normalizeObject(data);
    const metrics = {};
    const keys = [
      'revenue', 'revenueGrowth',
      'grossMargin', 'netProfit', 'profitGrowth',
      'currentCash', 'cashTrend',
      'newCustomers', 'repeatRate',
      'inventoryTurnover',
      'expenseGrowth'
    ];
    for (const key of keys) {
      if (data[key] != null) metrics[key] = data[key];
    }
    return metrics;
  }

  generateReportTitle(type, context = {}) {
    context = this._normalizeObject(context);
    const base = REPORT_TITLES[type] || '📊 Business Report';
    const businessName = context.businessName ? String(context.businessName).trim() : '';
    return businessName ? `${base} - ${businessName}` : base;
  }

  getAvailableIntents() {
    return this.questionHandler.getAvailableIntents();
  }

  isSupportedQuestion(question) {
    return this.questionHandler.isSupportedQuestion(question);
  }

  formatReportForDisplay(report) {
    if (!report) return null;

    const insights = report.insights || [];
    return {
      summary: report.summary?.summary || '',
      keyMetrics: report.metrics || {},
      insights,
      recommendations: report.recommendations || [],
      warnings: insights.filter(i =>
        i?.severity === ADVISOR_SEVERITY.CRITICAL ||
        i?.severity === ADVISOR_SEVERITY.HIGH
      ),
      generatedAt: report.meta?.generatedAt instanceof Date
        ? report.meta.generatedAt.toISOString()
        : report.meta?.generatedAt
    };
  }

  // ────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────

  /** Coerce null / non-object to empty object (default params only cover undefined). */
  _normalizeObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  _safeToDisplay(obj) {
    if (!obj) return null;
    try {
      if (typeof obj.toDisplay === 'function') return obj.toDisplay();
      return obj;
    } catch {
      return obj;
    }
  }

  _withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Provider timeout: ${label} (${ms}ms)`));
      }, ms);

      promise
        .then(value => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  _emptyReport(context = {}, options = {}, reportId = 'error') {
    context = this._normalizeObject(context);
    options = this._normalizeObject(options);

    return {
      meta: Object.freeze({
        reportId,
        generatedAt: this.clock(),
        type: options.type || this.config.defaultContext,
        tone: options.tone || this.config.defaultTone,
        businessId: context.businessId || 'unknown'
      }),
      response: null,
      summary: null,
      metrics: {},
      insights: [],
      recommendations: []
    };
  }

  _mergeConfig(base, override) {
    return { ...base, ...override };
  }

  _noopMetrics() {
    return {
      increment: () => {},
      histogram: () => {},
      gauge: () => {}
    };
  }
}

module.exports = AdvisorEngine;