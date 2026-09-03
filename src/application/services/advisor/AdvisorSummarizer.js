/**
 * Advisor Summarizer – Production v2.0
 *
 * Generates concise, human-readable summaries from business data + insights.
 * Fully SSOT-compliant, defensive, observable, and ready for horizontal scale.
 *
 * @version 2.0.0
 * @schema 2026-09
 */

'use strict';

const {
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  ADVISOR_CATEGORIES,
  CATEGORY_LABEL
} = require('./contracts/AdvisorContracts');

// ──────────────────────────────────────────────────────────────
// SSOT Configuration
// ──────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  maxSummaryLength: 500,
  defaultTone: ADVISOR_TONE.CONVERSATIONAL,
  currencySymbol: '₦',
  locale: 'en-NG',

  // Thresholds (decimals)
  revenue: {
    strongGrowth: 0.10,
    decline: -0.05,
    highGrowthOpp: 0.15
  },
  margin: {
    significantChange: 0.02
  },
  cash: {
    strongMonths: 6,
    declinePct: -0.10
  },
  customer: {
    acquisitionGrowth: 0.20,
    concentrationRisk: 0.40
  },
  product: {
    highGrowth: 0.30
  },
  expense: {
    growthMultiplier: 2.0,
    minGrowth: 0.05
  },

  maxWins: 5,
  maxConcerns: 5,
  maxOpportunities: 5,
  maxRecommendations: 8,
  maxTakeaways: 3
});

class AdvisorSummarizer {
  /**
   * @param {Object} [options]
   * @param {Object} [options.config]
   * @param {Object} [options.logger]
   * @param {Object} [options.metrics]
   * @param {Function} [options.clock]
   */
  constructor(options = {}) {
    this.config = this._mergeConfig(DEFAULT_CONFIG, options.config || {});
    this.maxSummaryLength = options.maxSummaryLength ?? this.config.maxSummaryLength;
    this.defaultTone = options.defaultTone || this.config.defaultTone;

    this.logger = options.logger || console;
    this.metrics = options.metrics || this._noopMetrics();
    this.clock = options.clock || (() => new Date());
  }

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /**
   * Generate a full summary object.
   * Never throws – returns a safe empty summary on failure.
   *
   * @param {Object} data
   * @param {Array}  [insights=[]]
   * @param {Object} [options={}]
   * @returns {Object}
   */
  summarize(data = {}, insights = [], options = {}) {
    const start = process.hrtime.bigint();

    try {
      const safeData = data && typeof data === 'object' ? data : {};
      const safeInsights = Array.isArray(insights) ? insights : [];

      const {
        context = ADVISOR_CONTEXT.MONTHLY,
        tone = this.defaultTone,
        maxLength = this.maxSummaryLength
      } = options;

      const metrics = this.extractKeyMetrics(safeData);
      const wins = this.identifyWins(safeData, safeInsights).slice(0, this.config.maxWins);
      const concerns = this.identifyConcerns(safeData, safeInsights).slice(0, this.config.maxConcerns);
      const opportunities = this.identifyOpportunities(safeData, safeInsights)
        .slice(0, this.config.maxOpportunities);

      let summary = this.generateSummaryText(
        safeData, metrics, wins, concerns, opportunities, context, tone
      );

      if (summary.length > maxLength) {
        summary = summary.slice(0, maxLength - 1) + '…';
      }

      const takeaways = this.generateTakeaways(wins, concerns, opportunities)
        .slice(0, this.config.maxTakeaways);
      const recommendations = this.generateRecommendations(wins, concerns, opportunities, safeData)
        .slice(0, this.config.maxRecommendations);

      const result = Object.freeze({
        summary,
        metrics: Object.freeze(metrics),
        wins: Object.freeze(wins),
        concerns: Object.freeze(concerns),
        opportunities: Object.freeze(opportunities),
        takeaways: Object.freeze(takeaways),
        recommendations: Object.freeze(recommendations),
        context,
        generatedAt: this.clock()
      });

      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.metrics.histogram?.('advisor.summarizer.duration_ms', durationMs);
      this.metrics.gauge?.('advisor.summarizer.win_count', wins.length);
      this.metrics.gauge?.('advisor.summarizer.concern_count', concerns.length);
      this.logger.info?.({
        event: 'summary_complete',
        context,
        wins: wins.length,
        concerns: concerns.length,
        durationMs: Math.round(durationMs)
      });

      return result;
    } catch (err) {
      this.logger.error?.({
        event: 'summary_failed',
        error: err.message,
        stack: err.stack
      });
      this.metrics.increment?.('advisor.summarizer.errors');
      return this._emptySummary(options);
    }
  }

  summarizeDaily(data, insights = []) {
    return this.summarize(data, insights, {
      context: ADVISOR_CONTEXT.DAILY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      maxLength: 300
    });
  }

  summarizeWeekly(data, insights = []) {
    return this.summarize(data, insights, {
      context: ADVISOR_CONTEXT.WEEKLY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      maxLength: 400
    });
  }

  summarizeMonthly(data, insights = []) {
    return this.summarize(data, insights, {
      context: ADVISOR_CONTEXT.MONTHLY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      maxLength: 500
    });
  }

  summarizeYearly(data, insights = []) {
    return this.summarize(data, insights, {
      context: ADVISOR_CONTEXT.YEARLY,
      tone: ADVISOR_TONE.PROFESSIONAL,
      maxLength: 700
    });
  }

  summarizeForecast(data, insights = []) {
    return this.summarize(data, insights, {
      context: ADVISOR_CONTEXT.FORECAST,
      tone: ADVISOR_TONE.ANALYTICAL,
      maxLength: 400
    });
  }

  // ────────────────────────────────────────────────────────────
  // Core Extraction
  // ────────────────────────────────────────────────────────────

  extractKeyMetrics(data) {
    const metrics = {};

    if (data.revenue != null) {
      metrics.revenue = data.revenue;
      metrics.revenueFormatted = this.formatCurrency(data.revenue);
    }
    if (data.revenueGrowth != null) {
      metrics.revenueGrowth = data.revenueGrowth;
      metrics.revenueGrowthFormatted = this.formatPercentage(data.revenueGrowth);
    }
    if (data.grossMargin != null) {
      metrics.grossMargin = data.grossMargin;
      metrics.grossMarginFormatted = this.formatPercentage(data.grossMargin);
    }
    if (data.netProfit != null) {
      metrics.netProfit = data.netProfit;
      metrics.netProfitFormatted = this.formatCurrency(data.netProfit);
    }
    if (data.currentCash != null) {
      metrics.currentCash = data.currentCash;
      metrics.currentCashFormatted = this.formatCurrency(data.currentCash);
    }
    if (data.cashTrend != null) {
      metrics.cashTrend = data.cashTrend;
      metrics.cashTrendFormatted = this.formatPercentage(data.cashTrend);
    }
    if (data.newCustomers != null) {
      metrics.newCustomers = data.newCustomers;
    }
    if (data.repeatRate != null) {
      metrics.repeatRate = data.repeatRate;
      metrics.repeatRateFormatted = this.formatPercentage(data.repeatRate);
    }
    if (data.inventoryTurnover != null) {
      metrics.inventoryTurnover = data.inventoryTurnover;
    }

    return metrics;
  }

  identifyWins(data, insights) {
    const wins = [];
    const cfg = this.config;

    if (data.revenueGrowth != null && data.revenueGrowth > cfg.revenue.strongGrowth) {
      wins.push({
        category: ADVISOR_CATEGORIES.REVENUE,
        title: 'Strong revenue growth',
        description: `Revenue grew by ${this.formatPercentage(data.revenueGrowth)} over the period.`,
        metric: data.revenueGrowth,
        confidence: 85
      });
    }

    if (data.grossMargin != null && data.previousGrossMargin != null) {
      const improvement = data.grossMargin - data.previousGrossMargin;
      if (improvement > cfg.margin.significantChange) {
        wins.push({
          category: ADVISOR_CATEGORIES.PROFITABILITY,
          title: 'Margin improvement',
          description: `Gross margin improved from ${this.formatPercentage(data.previousGrossMargin)} to ${this.formatPercentage(data.grossMargin)}.`,
          metric: improvement,
          confidence: 80
        });
      }
    }

    if (data.currentCash != null && data.monthlyExpenses > 0) {
      const months = data.currentCash / data.monthlyExpenses;
      if (months > cfg.cash.strongMonths) {
        wins.push({
          category: ADVISOR_CATEGORIES.CASH,
          title: 'Strong cash position',
          description: `Cash covers ${Math.floor(months)} months of expenses.`,
          metric: months,
          confidence: 90
        });
      }
    }

    if (data.newCustomers != null && data.newCustomerGrowth != null) {
      if (data.newCustomerGrowth > cfg.customer.acquisitionGrowth) {
        wins.push({
          category: ADVISOR_CATEGORIES.CUSTOMER,
          title: 'Strong customer acquisition',
          description: `New customers grew by ${this.formatPercentage(data.newCustomerGrowth)} (${data.newCustomers} new customers).`,
          metric: data.newCustomers,
          confidence: 75
        });
      }
    }

    if (data.inventoryTurnover != null && data.previousInventoryTurnover != null) {
      if (data.inventoryTurnover > data.previousInventoryTurnover) {
        wins.push({
          category: ADVISOR_CATEGORIES.INVENTORY,
          title: 'Improved inventory turnover',
          description: `Inventory turnover improved from ${data.previousInventoryTurnover.toFixed(1)}x to ${data.inventoryTurnover.toFixed(1)}x.`,
          metric: data.inventoryTurnover,
          confidence: 70
        });
      }
    }

    // Positive insights (non-INFO)
    for (const insight of insights) {
      if (
        insight?.sentiment === ADVISOR_SENTIMENT.POSITIVE &&
        insight.severity !== ADVISOR_SEVERITY.INFO
      ) {
        wins.push({
          category: insight.category || ADVISOR_CATEGORIES.GENERAL,
          title: insight.title || 'Positive development',
          description: insight.summary || insight.content || '',
          metric: insight.confidence,
          confidence: insight.confidence || 70
        });
      }
    }

    return wins;
  }

  identifyConcerns(data, insights) {
    const concerns = [];
    const cfg = this.config;

    if (data.revenueGrowth != null && data.revenueGrowth < cfg.revenue.decline) {
      concerns.push({
        category: ADVISOR_CATEGORIES.REVENUE,
        title: 'Revenue declining',
        description: `Revenue declined by ${this.formatPercentage(Math.abs(data.revenueGrowth))} over the period.`,
        severity: ADVISOR_SEVERITY.HIGH,
        confidence: 85
      });
    }

    if (data.grossMargin != null && data.previousGrossMargin != null) {
      const decline = data.previousGrossMargin - data.grossMargin;
      if (decline > cfg.margin.significantChange) {
        concerns.push({
          category: ADVISOR_CATEGORIES.PROFITABILITY,
          title: 'Margin decline',
          description: `Gross margin declined from ${this.formatPercentage(data.previousGrossMargin)} to ${this.formatPercentage(data.grossMargin)}.`,
          severity: ADVISOR_SEVERITY.HIGH,
          confidence: 80
        });
      }
    }

    if (data.cashTrend != null && data.cashTrend < cfg.cash.declinePct) {
      concerns.push({
        category: ADVISOR_CATEGORIES.CASH,
        title: 'Cash declining',
        description: `Cash balance declined by ${this.formatPercentage(Math.abs(data.cashTrend))} over the period.`,
        severity: ADVISOR_SEVERITY.HIGH,
        confidence: 85
      });
    }

    if (data.projectedCash != null && data.minimumCashThreshold != null) {
      if (data.projectedCash < data.minimumCashThreshold) {
        concerns.push({
          category: ADVISOR_CATEGORIES.CASH,
          title: 'Cash shortage risk',
          description: `Projected cash (${this.formatCurrency(data.projectedCash)}) is below minimum threshold (${this.formatCurrency(data.minimumCashThreshold)}).`,
          severity: ADVISOR_SEVERITY.CRITICAL,
          confidence: 90
        });
      }
    }

    if (data.customerConcentration != null && data.customerConcentration > cfg.customer.concentrationRisk) {
      concerns.push({
        category: ADVISOR_CATEGORIES.CUSTOMER,
        title: 'Customer concentration risk',
        description: `${Math.round(data.customerConcentration * 100)}% of revenue comes from a single customer.`,
        severity: ADVISOR_SEVERITY.HIGH,
        confidence: 75
      });
    }

    if (data.expenseGrowth != null && data.revenueGrowth != null) {
      if (
        data.expenseGrowth > data.revenueGrowth * cfg.expense.growthMultiplier &&
        data.expenseGrowth > cfg.expense.minGrowth
      ) {
        concerns.push({
          category: ADVISOR_CATEGORIES.EXPENSE,
          title: 'Expense growth outpacing revenue',
          description: `Expenses grew ${this.formatPercentage(data.expenseGrowth)} vs revenue ${this.formatPercentage(data.revenueGrowth)}.`,
          severity: ADVISOR_SEVERITY.MEDIUM,
          confidence: 75
        });
      }
    }

    // Negative / urgent insights
    for (const insight of insights) {
      if (
        insight?.sentiment === ADVISOR_SENTIMENT.NEGATIVE ||
        insight?.sentiment === ADVISOR_SENTIMENT.URGENT
      ) {
        concerns.push({
          category: insight.category || ADVISOR_CATEGORIES.GENERAL,
          title: insight.title || 'Concern',
          description: insight.summary || insight.content || '',
          severity: insight.severity || ADVISOR_SEVERITY.MEDIUM,
          confidence: insight.confidence || 70
        });
      }
    }

    return concerns;
  }

  identifyOpportunities(data, insights) {
    const opportunities = [];
    const cfg = this.config;

    if (data.revenueGrowth != null && data.revenueGrowth > cfg.revenue.highGrowthOpp) {
      opportunities.push({
        category: ADVISOR_CATEGORIES.REVENUE,
        title: 'Revenue growth opportunity',
        description: `Revenue is growing at ${this.formatPercentage(data.revenueGrowth)}. Consider expanding into new markets or segments.`,
        potential: 'HIGH',
        confidence: 70
      });
    }

    if (data.productGrowth != null && data.productGrowth > cfg.product.highGrowth) {
      opportunities.push({
        category: ADVISOR_CATEGORIES.GROWTH,
        title: 'Product growth leader',
        description: `${data.topProduct || 'Top product'} is growing at ${this.formatPercentage(data.productGrowth)}. Consider increasing investment.`,
        potential: 'HIGH',
        confidence: 75
      });
    }

    if (data.grossMargin != null && data.industryAverageMargin != null) {
      if (data.grossMargin < data.industryAverageMargin * 0.8) {
        opportunities.push({
          category: ADVISOR_CATEGORIES.PROFITABILITY,
          title: 'Margin improvement opportunity',
          description: `Current margin (${this.formatPercentage(data.grossMargin)}) is below industry average (${this.formatPercentage(data.industryAverageMargin)}).`,
          potential: 'MEDIUM',
          confidence: 60
        });
      }
    }

    // Positive INFO insights → opportunities
    for (const insight of insights) {
      if (
        insight?.sentiment === ADVISOR_SENTIMENT.POSITIVE &&
        insight.severity === ADVISOR_SEVERITY.INFO
      ) {
        opportunities.push({
          category: insight.category || ADVISOR_CATEGORIES.GENERAL,
          title: insight.title || 'Opportunity',
          description: insight.summary || insight.content || '',
          potential: 'MEDIUM',
          confidence: insight.confidence || 70
        });
      }
    }

    return opportunities;
  }

  // ────────────────────────────────────────────────────────────
  // Text Generation
  // ────────────────────────────────────────────────────────────

  generateSummaryText(data, metrics, wins, concerns, opportunities, context, tone) {
    const parts = [];
    const period = this.getPeriodLabel(context);

    parts.push(this.generateOpening(metrics, wins, concerns, period, tone));

    const metricsHighlight = this.generateMetricsHighlight(metrics);
    if (metricsHighlight) parts.push(metricsHighlight);

    if (wins.length > 0) parts.push(this.generateWinSummary(wins));
    if (concerns.length > 0) parts.push(this.generateConcernSummary(concerns));
    if (opportunities.length > 0) parts.push(this.generateOpportunitySummary(opportunities));

    parts.push(this.generateClosing(wins, concerns, period, tone));

    return parts.join('\n\n');
  }

  generateOpening(metrics, wins, concerns, period, tone) {
    const hasWins = wins.length > 0;
    const hasConcerns = concerns.length > 0;

    if (hasWins && !hasConcerns) {
      return `📈 **${period} Performance Summary:** Your business performed well this ${period.toLowerCase()}. Here are the highlights.`;
    }
    if (!hasWins && hasConcerns) {
      return `⚠️ **${period} Performance Summary:** Several areas require attention this ${period.toLowerCase()}. Here's what you need to know.`;
    }
    if (hasWins && hasConcerns) {
      return `📊 **${period} Performance Summary:** Mixed results this ${period.toLowerCase()} with both wins and areas needing attention.`;
    }
    return `📊 **${period} Performance Summary:** Here's how your business performed this ${period.toLowerCase()}.`;
  }

  generateMetricsHighlight(metrics) {
    const highlights = [];

    if (metrics.revenueFormatted && metrics.revenueGrowthFormatted) {
      const direction = metrics.revenueGrowth >= 0 ? '↑' : '↓';
      highlights.push(`Revenue: ${metrics.revenueFormatted} (${direction}${Math.abs(metrics.revenueGrowth * 100).toFixed(1)}%)`);
    }
    if (metrics.grossMarginFormatted) {
      highlights.push(`Gross Margin: ${metrics.grossMarginFormatted}`);
    }
    if (metrics.currentCashFormatted) {
      highlights.push(`Cash Balance: ${metrics.currentCashFormatted}`);
    }

    return highlights.length > 0 ? `**Key Metrics:** ${highlights.join(' | ')}` : null;
  }

  generateWinSummary(wins) {
    const texts = wins.slice(0, 3).map(w => `✅ ${w.title}: ${w.description}`);
    return `**Wins:**\n${texts.join('\n')}`;
  }

  generateConcernSummary(concerns) {
    const texts = concerns.slice(0, 3).map(c => {
      const emoji = c.severity === ADVISOR_SEVERITY.CRITICAL ? '🚨' : '⚠️';
      return `${emoji} ${c.title}: ${c.description}`;
    });
    return `**Areas Needing Attention:**\n${texts.join('\n')}`;
  }

  generateOpportunitySummary(opportunities) {
    const texts = opportunities.slice(0, 3).map(o => `💡 ${o.title}: ${o.description}`);
    return `**Opportunities:**\n${texts.join('\n')}`;
  }

  generateClosing(wins, concerns, period, tone) {
    const hasWins = wins.length > 0;
    const hasConcerns = concerns.length > 0;

    if (hasWins && !hasConcerns) {
      return `✅ **Overall:** Great performance this ${period.toLowerCase()}. Keep up the momentum! Continue monitoring key metrics to sustain this growth.`;
    }
    if (!hasWins && hasConcerns) {
      return `⚠️ **Overall:** This ${period.toLowerCase()} showed challenges that need addressing. Focus on the areas identified above and consider a review of your strategy.`;
    }
    if (hasWins && hasConcerns) {
      return `📊 **Overall:** Mixed results. Address the concerns while building on your wins. Balance is key to sustainable growth.`;
    }
    return `📊 **Overall:** Review the details above and let me know if you need more information on any specific area.`;
  }

  generateTakeaways(wins, concerns, opportunities) {
    const takeaways = [];

    if (wins[0]) {
      takeaways.push({ type: 'win', text: wins[0].title, detail: wins[0].description });
    }
    if (concerns[0]) {
      takeaways.push({ type: 'concern', text: concerns[0].title, detail: concerns[0].description });
    }
    if (opportunities[0]) {
      takeaways.push({ type: 'opportunity', text: opportunities[0].title, detail: opportunities[0].description });
    }

    return takeaways;
  }

  generateRecommendations(wins, concerns, opportunities, data) {
    const recommendations = [];

    for (const concern of concerns) {
      recommendations.push({
        priority: concern.severity || ADVISOR_SEVERITY.MEDIUM,
        text: `Address ${concern.title.toLowerCase()}: ${concern.description}`,
        category: concern.category
      });
    }

    for (const opp of opportunities) {
      if (opp.potential === 'HIGH') {
        recommendations.push({
          priority: ADVISOR_SEVERITY.MEDIUM,
          text: `Pursue ${opp.title.toLowerCase()}: ${opp.description}`,
          category: opp.category
        });
      }
    }

    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    recommendations.sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));

    return recommendations;
  }

  // ────────────────────────────────────────────────────────────
  // Utilities
  // ────────────────────────────────────────────────────────────

  getPeriodLabel(context) {
    // Prefer SSOT category labels where possible, otherwise simple map
    const labels = {
      [ADVISOR_CONTEXT.DAILY]: 'Daily',
      [ADVISOR_CONTEXT.WEEKLY]: 'Weekly',
      [ADVISOR_CONTEXT.MONTHLY]: 'Monthly',
      [ADVISOR_CONTEXT.YEARLY]: 'Yearly',
      [ADVISOR_CONTEXT.FORECAST]: 'Forecast',
      [ADVISOR_CONTEXT.REAL_TIME]: 'Real-time',
      [ADVISOR_CONTEXT.HISTORICAL]: 'Historical'
    };
    return labels[context] || 'Period';
  }

  formatCurrency(amount) {
    if (amount == null || Number.isNaN(amount)) {
      return `${this.config.currencySymbol}0`;
    }
    return `${this.config.currencySymbol}${Math.round(amount).toLocaleString(this.config.locale)}`;
  }

  formatPercentage(value) {
    if (value == null || Number.isNaN(value)) return '0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  }

  formatForDisplay(summaryResult) {
    if (!summaryResult) return null;
    return {
      summary: summaryResult.summary,
      metrics: summaryResult.metrics,
      wins: [...(summaryResult.wins || [])],
      concerns: [...(summaryResult.concerns || [])],
      opportunities: [...(summaryResult.opportunities || [])],
      takeaways: [...(summaryResult.takeaways || [])],
      recommendations: [...(summaryResult.recommendations || [])],
      context: summaryResult.context,
      generatedAt: summaryResult.generatedAt instanceof Date
        ? summaryResult.generatedAt.toISOString()
        : summaryResult.generatedAt
    };
  }

  formatForText(summaryResult) {
    if (!summaryResult) return '';

    let text = `${summaryResult.summary}\n\n`;

    if (summaryResult.wins?.length) {
      text += '---\nWins:\n';
      for (const win of summaryResult.wins) {
        text += `✅ ${win.title}: ${win.description}\n`;
      }
      text += '\n';
    }

    if (summaryResult.concerns?.length) {
      text += '---\nAreas Needing Attention:\n';
      for (const concern of summaryResult.concerns) {
        const emoji = concern.severity === ADVISOR_SEVERITY.CRITICAL ? '🚨' : '⚠️';
        text += `${emoji} ${concern.title}: ${concern.description}\n`;
      }
      text += '\n';
    }

    if (summaryResult.opportunities?.length) {
      text += '---\nOpportunities:\n';
      for (const opp of summaryResult.opportunities) {
        text += `💡 ${opp.title}: ${opp.description}\n`;
      }
      text += '\n';
    }

    if (summaryResult.recommendations?.length) {
      text += '---\nRecommendations:\n';
      for (const rec of summaryResult.recommendations) {
        text += `• ${rec.text}\n`;
      }
    }

    return text;
  }

  // ────────────────────────────────────────────────────────────
  // Private
  // ────────────────────────────────────────────────────────────

  _emptySummary(options = {}) {
    return Object.freeze({
      summary: 'No significant insights available at this time.',
      metrics: Object.freeze({}),
      wins: Object.freeze([]),
      concerns: Object.freeze([]),
      opportunities: Object.freeze([]),
      takeaways: Object.freeze([]),
      recommendations: Object.freeze([]),
      context: options.context || ADVISOR_CONTEXT.MONTHLY,
      generatedAt: this.clock()
    });
  }

  _mergeConfig(base, override) {
    const merged = { ...base, ...override };
    if (override.revenue) merged.revenue = { ...base.revenue, ...override.revenue };
    if (override.margin) merged.margin = { ...base.margin, ...override.margin };
    if (override.cash) merged.cash = { ...base.cash, ...override.cash };
    if (override.customer) merged.customer = { ...base.customer, ...override.customer };
    if (override.product) merged.product = { ...base.product, ...override.product };
    if (override.expense) merged.expense = { ...base.expense, ...override.expense };
    return Object.freeze(merged);
  }

  _noopMetrics() {
    return { increment: () => {}, histogram: () => {}, gauge: () => {} };
  }
}

module.exports = AdvisorSummarizer;