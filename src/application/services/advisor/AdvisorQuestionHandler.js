/**
 * Advisor Question Handler – Production v2.0
 *
 * Processes natural-language questions, determines intent, extracts entities,
 * gathers data, generates insights, and returns a structured answer.
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
  ADVISOR_CATEGORIES
} = require('./contracts/AdvisorContracts');

const {
  AdvisorQuestion,
  AdvisorResponse
} = require('./contracts/AdvisorDataTypes');

const AdvisorInsightGenerator = require('./AdvisorInsightGenerator');
const AdvisorResponseBuilder = require('./AdvisorResponseBuilder');
const AdvisorSummarizer = require('./AdvisorSummarizer');

// ──────────────────────────────────────────────────────────────
// SSOT – Question Intents (kept here so the module is self-contained
// even if contracts do not yet export ADVISOR_QUESTION_INTENT)
// ──────────────────────────────────────────────────────────────
const ADVISOR_QUESTION_INTENT = Object.freeze({
  PERFORMANCE: 'PERFORMANCE',
  PROFIT: 'PROFIT',
  PROFITABILITY: 'PROFITABILITY',
  REVENUE: 'REVENUE',
  EXPENSES: 'EXPENSES',
  CASH: 'CASH',
  CUSTOMERS: 'CUSTOMERS',
  INVENTORY: 'INVENTORY',
  RISK: 'RISK',
  FORECAST: 'FORECAST',
  RECOMMENDATION: 'RECOMMENDATION',
  COMPARISON: 'COMPARISON',
  TREND: 'TREND',
  BREAKDOWN: 'BREAKDOWN',
  GENERAL: 'GENERAL'
});

const QUESTION_INTENT_LABEL = Object.freeze({
  [ADVISOR_QUESTION_INTENT.PERFORMANCE]: 'Business Performance',
  [ADVISOR_QUESTION_INTENT.PROFIT]: 'Profit',
  [ADVISOR_QUESTION_INTENT.PROFITABILITY]: 'Profitability',
  [ADVISOR_QUESTION_INTENT.REVENUE]: 'Revenue',
  [ADVISOR_QUESTION_INTENT.EXPENSES]: 'Expenses',
  [ADVISOR_QUESTION_INTENT.CASH]: 'Cash & Liquidity',
  [ADVISOR_QUESTION_INTENT.CUSTOMERS]: 'Customers',
  [ADVISOR_QUESTION_INTENT.INVENTORY]: 'Inventory',
  [ADVISOR_QUESTION_INTENT.RISK]: 'Risk',
  [ADVISOR_QUESTION_INTENT.FORECAST]: 'Forecast',
  [ADVISOR_QUESTION_INTENT.RECOMMENDATION]: 'Recommendation',
  [ADVISOR_QUESTION_INTENT.COMPARISON]: 'Comparison',
  [ADVISOR_QUESTION_INTENT.TREND]: 'Trend',
  [ADVISOR_QUESTION_INTENT.BREAKDOWN]: 'Breakdown',
  [ADVISOR_QUESTION_INTENT.GENERAL]: 'General'
});

// ──────────────────────────────────────────────────────────────
// SSOT Configuration
// ──────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  providerTimeoutMs: 4000,
  maxQuestionLength: 500,
  maxKeywords: 20,
  defaultTone: ADVISOR_TONE.CONVERSATIONAL,
  defaultContext: ADVISOR_CONTEXT.MONTHLY
});

const STOP_WORDS = new Set([
  'what', 'why', 'how', 'when', 'where', 'who', 'which',
  'is', 'are', 'was', 'were', 'has', 'have', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'may', 'might', 'must', 'for', 'with', 'about',
  'against', 'between', 'through', 'during', 'without',
  'from', 'into', 'the', 'a', 'an', 'and', 'or', 'but',
  'my', 'our', 'your', 'their', 'this', 'that', 'these', 'those'
]);

class AdvisorQuestionHandler {
  /**
   * @param {Object} [options]
   * @param {Object} [options.config]
   * @param {Object} [options.insightGenerator]
   * @param {Object} [options.responseBuilder]
   * @param {Object} [options.summarizer]
   * @param {Object} [options.dataProviders]  – { analytics, report, cashFlow, inventory, customers, expenses, forecast, risk }
   * @param {Object} [options.logger]
   * @param {Object} [options.metrics]
   * @param {Function} [options.clock]
   */
  constructor(options = {}) {
    this.config = Object.freeze({ ...DEFAULT_CONFIG, ...(options.config || {}) });

    this.insightGenerator = options.insightGenerator || new AdvisorInsightGenerator();
    this.responseBuilder = options.responseBuilder || new AdvisorResponseBuilder();
    this.summarizer = options.summarizer || new AdvisorSummarizer();
    this.dataProviders = options.dataProviders || {};

    this.logger = options.logger || console;
    this.metrics = options.metrics || this._noopMetrics();
    this.clock = options.clock || (() => new Date());

    this.intentPatterns = this._buildIntentPatterns();
    this.entityPatterns = this._buildEntityPatterns();
  }

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /**
   * Process a natural-language question.
   * Never throws – always returns a structured result.
   *
   * @param {string} questionText
   * @param {Object} [context={}]
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   */
  async processQuestion(questionText, context = {}, options = {}) {
    const start = process.hrtime.bigint();
    const requestId = `q_${this.clock().getTime()}_${Math.random().toString(36).slice(2, 8)}`;

    this.logger.info?.({ event: 'question_start', requestId });

    try {
      // 1. Sanitize input
      const text = this._sanitizeQuestion(questionText);
      if (!text) {
        return this._emptyResult('Please provide a valid question.', requestId);
      }

      // 2. Intent + entities + keywords (before creating the model)
      const intent = this.determineIntent(text);
      const entities = this.extractEntities(text);
      const keywords = this.extractKeywords(text);

      // 3. Create question model (intent is required by AdvisorQuestion)
      const question = new AdvisorQuestion({
        text,
        intent,
        keywords,
        entities,
        context: context || {},
        askedAt: this.clock()
      });

      // 4. Gather data (with timeouts)
      const data = await this.gatherRelevantData(intent, entities, context);

      // 5. Generate insights
      const insights = this.insightGenerator.generate(data, context, {
        includeAll: false
      }) || [];

      // 6. Build answer
      const tone = this.determineTone(insights);
      const answerContext = this.determineContext(entities);

      const answer = this.responseBuilder.buildAnswer(insights, text, {
        tone,
        context: answerContext,
        ...options
      });

      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.metrics.histogram?.('advisor.question.duration_ms', durationMs);
      this.metrics.increment?.(`advisor.question.intent.${intent}`);
      this.logger.info?.({
        event: 'question_complete',
        requestId,
        intent,
        insightCount: insights.length,
        durationMs: Math.round(durationMs)
      });

      return {
        requestId,
        question: typeof question.toDisplay === 'function' ? question.toDisplay() : question,
        answer: typeof answer.toDisplay === 'function' ? answer.toDisplay() : answer,
        intent,
        intentLabel: this.getIntentLabel(intent),
        entities,
        keywords,
        dataKeys: Object.keys(data || {})
      };
    } catch (err) {
      this.logger.error?.({
        event: 'question_failed',
        requestId,
        error: err.message,
        stack: err.stack
      });
      this.metrics.increment?.('advisor.question.errors');
      return this._emptyResult(
        'I encountered an issue processing your question. Please try again or rephrase it.',
        requestId
      );
    }
  }

  /**
   * Determine intent from question text.
   * Uses longest-match so more specific phrases win
   * (e.g. "inventory turnover" beats bare "turnover").
   */
  determineIntent(text) {
    if (!text || typeof text !== 'string') {
      return ADVISOR_QUESTION_INTENT.GENERAL;
    }

    const lower = text.toLowerCase();
    let bestIntent = ADVISOR_QUESTION_INTENT.GENERAL;
    let bestLength = 0;

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (lower.includes(pattern) && pattern.length > bestLength) {
          bestIntent = intent;
          bestLength = pattern.length;
        }
      }
    }

    return bestIntent;
  }

  /**
   * Extract structured entities.
   */
  extractEntities(text) {
    const entities = {};
    if (!text || typeof text !== 'string') return entities;

    // Timeframes
    for (const tf of this.entityPatterns.timeframes) {
      if (tf.pattern.test(text)) {
        entities.timeframe = tf.value;
        break;
      }
    }

    // Products
    for (const p of this.entityPatterns.products) {
      const match = text.match(p.pattern);
      if (match) {
        entities.product = match[1];
        break;
      }
    }

    // Customers
    for (const c of this.entityPatterns.customers) {
      const match = text.match(c.pattern);
      if (match) {
        entities.customer = match[1];
        break;
      }
    }

    // Amounts
    for (const a of this.entityPatterns.amounts) {
      const match = text.match(a.pattern);
      if (match) {
        let value = match[1];
        if (a.value === 'amount_k') {
          value = parseInt(value, 10) * 1000;
        } else if (a.value === 'amount_m') {
          value = parseInt(value, 10) * 1_000_000;
        } else {
          value = parseInt(String(value).replace(/,/g, ''), 10);
        }
        if (!Number.isNaN(value)) {
          entities.amount = value;
        }
        break;
      }
    }

    return entities;
  }

  /**
   * Extract keywords (stop-word filtered).
   */
  extractKeywords(text) {
    if (!text || typeof text !== 'string') return [];

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    // Dedupe while preserving order
    const seen = new Set();
    const unique = [];
    for (const w of words) {
      if (!seen.has(w)) {
        seen.add(w);
        unique.push(w);
      }
    }

    return unique.slice(0, this.config.maxKeywords);
  }

  /**
   * Gather data from providers with timeout + isolation.
   */
  async gatherRelevantData(intent, entities, context) {
    const data = {};

    const fetchSafe = async (name, fn) => {
      if (typeof fn !== 'function') return;
      try {
        const result = await this._withTimeout(
          Promise.resolve().then(() => fn(context)),
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
        this.metrics.increment?.(`advisor.question.provider.${name}.errors`);
      }
    };

    // Always try core providers
    await Promise.all([
      fetchSafe('analytics', this.dataProviders.analytics?.getData?.bind(this.dataProviders.analytics)),
      fetchSafe('report', this.dataProviders.report?.getData?.bind(this.dataProviders.report))
    ]);

    // Intent-specific providers
    switch (intent) {
      case ADVISOR_QUESTION_INTENT.PROFIT:
      case ADVISOR_QUESTION_INTENT.PROFITABILITY:
        await fetchSafe(
          'analytics.profit',
          this.dataProviders.analytics?.getProfitData?.bind(this.dataProviders.analytics)
        );
        break;

      case ADVISOR_QUESTION_INTENT.CASH:
        await fetchSafe(
          'cashFlow',
          this.dataProviders.cashFlow?.getData?.bind(this.dataProviders.cashFlow)
        );
        break;

      case ADVISOR_QUESTION_INTENT.INVENTORY:
        await fetchSafe(
          'inventory',
          this.dataProviders.inventory?.getData?.bind(this.dataProviders.inventory)
        );
        break;

      case ADVISOR_QUESTION_INTENT.CUSTOMERS:
        await fetchSafe(
          'customers',
          this.dataProviders.customers?.getData?.bind(this.dataProviders.customers)
        );
        break;

      case ADVISOR_QUESTION_INTENT.EXPENSES:
        await fetchSafe(
          'expenses',
          this.dataProviders.expenses?.getData?.bind(this.dataProviders.expenses)
        );
        break;

      case ADVISOR_QUESTION_INTENT.FORECAST:
        await fetchSafe(
          'forecast',
          this.dataProviders.forecast?.getData?.bind(this.dataProviders.forecast)
        );
        break;

      case ADVISOR_QUESTION_INTENT.RISK:
        await fetchSafe(
          'risk',
          this.dataProviders.risk?.getData?.bind(this.dataProviders.risk)
        );
        break;

      default:
        // no extra providers
        break;
    }

    return data;
  }

  determineTone(insights) {
    if (!Array.isArray(insights) || insights.length === 0) {
      return this.config.defaultTone;
    }

    if (insights.some(i => i?.sentiment === ADVISOR_SENTIMENT.URGENT)) {
      return ADVISOR_TONE.URGENT;
    }
    if (insights.some(i => i?.sentiment === ADVISOR_SENTIMENT.NEGATIVE) && insights.length > 2) {
      return ADVISOR_TONE.ANALYTICAL;
    }
    return ADVISOR_TONE.CONVERSATIONAL;
  }

  determineContext(entities = {}) {
    if (!entities.timeframe) return this.config.defaultContext;

    const map = {
      today: ADVISOR_CONTEXT.REAL_TIME,
      yesterday: ADVISOR_CONTEXT.DAILY,
      this_week: ADVISOR_CONTEXT.WEEKLY,
      last_week: ADVISOR_CONTEXT.WEEKLY,
      this_month: ADVISOR_CONTEXT.MONTHLY,
      last_month: ADVISOR_CONTEXT.MONTHLY,
      this_year: ADVISOR_CONTEXT.YEARLY,
      last_year: ADVISOR_CONTEXT.YEARLY,
      quarter: ADVISOR_CONTEXT.MONTHLY
    };

    return map[entities.timeframe] || this.config.defaultContext;
  }

  getAvailableIntents() {
    return Object.values(ADVISOR_QUESTION_INTENT);
  }

  getIntentLabel(intent) {
    return QUESTION_INTENT_LABEL[intent] || intent || 'General';
  }

  isSupportedQuestion(text) {
    const intent = this.determineIntent(text);
    return intent !== ADVISOR_QUESTION_INTENT.GENERAL;
  }

  // ────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────

  _sanitizeQuestion(text) {
    if (text == null) return '';
    const cleaned = String(text).trim().replace(/\s+/g, ' ');
    if (!cleaned) return '';
    return cleaned.slice(0, this.config.maxQuestionLength);
  }

  _buildIntentPatterns() {
    return Object.freeze({
      [ADVISOR_QUESTION_INTENT.PERFORMANCE]: [
        'how is my business',
        'business performance',
        'how am i doing',
        'overall performance',
        'business health',
        'how is the company'
      ],
      [ADVISOR_QUESTION_INTENT.PROFIT]: [
        'profit',
        'profitability',
        'margin',
        'making money',
        'net profit',
        'gross profit',
        'profit margin',
        'why is profit'
      ],
      [ADVISOR_QUESTION_INTENT.REVENUE]: [
        'revenue',
        'sales',
        'income',
        // 'turnover' removed – ambiguous with "inventory turnover"
        'how much revenue',
        'sales performance',
        'revenue growth'
      ],
      [ADVISOR_QUESTION_INTENT.EXPENSES]: [
        'expenses',
        'costs',
        'spending',
        'operating expenses',
        'overhead',
        'why are expenses',
        'cost increase'
      ],
      [ADVISOR_QUESTION_INTENT.CASH]: [
        'cash',
        'cash flow',
        'liquidity',
        'runway',
        'burn rate',
        'cash position',
        'how much cash'
      ],
      [ADVISOR_QUESTION_INTENT.CUSTOMERS]: [
        'customers',
        'clients',
        'customer acquisition',
        'customer retention',
        'new customers',
        'churn'
      ],
      [ADVISOR_QUESTION_INTENT.INVENTORY]: [
        'inventory',
        'stock',
        'supply',
        'warehouse',
        'inventory turnover',
        'stock level'
      ],
      [ADVISOR_QUESTION_INTENT.RISK]: [
        'risk',
        'risk assessment',
        'what could go wrong',
        'threats',
        'vulnerability'
      ],
      [ADVISOR_QUESTION_INTENT.FORECAST]: [
        'forecast',
        'predict',
        'future',
        'outlook',
        'projection',
        'what will happen'
      ],
      [ADVISOR_QUESTION_INTENT.RECOMMENDATION]: [
        'what should i do',
        'recommend',
        'advice',
        'suggest',
        'action plan',
        'next steps'
      ],
      [ADVISOR_QUESTION_INTENT.COMPARISON]: [
        'compare',
        'vs',
        'versus',
        'difference between',
        'better than'
      ],
      [ADVISOR_QUESTION_INTENT.TREND]: [
        'trend',
        'trajectory',
        'direction',
        'moving',
        'changing',
        'over time'
      ],
      [ADVISOR_QUESTION_INTENT.BREAKDOWN]: [
        'breakdown',
        'break down',
        'categories',
        'by category',
        'detailed view'
      ]
    });
  }

  _buildEntityPatterns() {
    return Object.freeze({
      timeframes: Object.freeze([
        { pattern: /this month|current month/i, value: 'this_month' },
        { pattern: /last month|previous month/i, value: 'last_month' },
        { pattern: /this week|current week/i, value: 'this_week' },
        { pattern: /last week|previous week/i, value: 'last_week' },
        { pattern: /\btoday\b/i, value: 'today' },
        { pattern: /\byesterday\b/i, value: 'yesterday' },
        { pattern: /this year|current year/i, value: 'this_year' },
        { pattern: /last year|previous year/i, value: 'last_year' },
        { pattern: /\bquarter\b/i, value: 'quarter' },
        { pattern: /(\d+)\s*days?/i, value: 'days' },
        { pattern: /(\d+)\s*weeks?/i, value: 'weeks' },
        { pattern: /(\d+)\s*months?/i, value: 'months' }
      ]),
      products: Object.freeze([
        { pattern: /product\s+(\w+)/i, value: 'product' },
        { pattern: /item\s+(\w+)/i, value: 'product' }
      ]),
      customers: Object.freeze([
        { pattern: /customer\s+(\w+)/i, value: 'customer' },
        { pattern: /client\s+(\w+)/i, value: 'customer' }
      ]),
      amounts: Object.freeze([
        { pattern: /₦([\d,]+)/, value: 'amount' },
        { pattern: /([\d,]+)\s*naira/i, value: 'amount' },
        { pattern: /([\d,]+)k\b/i, value: 'amount_k' },
        { pattern: /([\d,]+)m\b/i, value: 'amount_m' }
      ])
    });
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

  _emptyResult(message, requestId) {
    return {
      requestId: requestId || 'unknown',
      question: null,
      answer: {
        type: ADVISOR_RESPONSE_TYPES.ANSWER,
        title: 'Unable to process question',
        content: message,
        summary: message,
        sentiment: ADVISOR_SENTIMENT.NEUTRAL,
        severity: ADVISOR_SEVERITY.INFO,
        insights: [],
        recommendations: [],
        actions: []
      },
      intent: ADVISOR_QUESTION_INTENT.GENERAL,
      intentLabel: QUESTION_INTENT_LABEL[ADVISOR_QUESTION_INTENT.GENERAL],
      entities: {},
      keywords: [],
      dataKeys: []
    };
  }

  _noopMetrics() {
    return {
      increment: () => {},
      histogram: () => {},
      gauge: () => {}
    };
  }
}

// Export intents so tests / other modules can stay in sync
module.exports = AdvisorQuestionHandler;
module.exports.ADVISOR_QUESTION_INTENT = ADVISOR_QUESTION_INTENT;
module.exports.QUESTION_INTENT_LABEL = QUESTION_INTENT_LABEL;