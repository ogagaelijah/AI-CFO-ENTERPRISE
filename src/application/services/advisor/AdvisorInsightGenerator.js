/**
 * Advisor Insight Generator – Production v2.0
 *
 * Generates high-signal conversational insights from consolidated business data.
 * Consumes Analytics, Forecast, Risk, Decision, and Report engines.
 * Fully SSOT-compliant, observable, defensive, and ready for horizontal scale.
 *
 * @version 2.0.0
 * @schema 2026-09
 */

'use strict';

const {
  ADVISOR_CATEGORIES: ADVISOR_INSIGHT_CATEGORIES,
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_CONTEXT
} = require('./contracts/AdvisorContracts');
const { AdvisorInsight } = require('./contracts/AdvisorDataTypes');
const {
  ALL_INSIGHT_TEMPLATES,
  getTemplateById
} = require('./templates/insightTemplates');

// ──────────────────────────────────────────────────────────────
// SSOT: Single Source of Truth for all tunable parameters
// ──────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = Object.freeze({
  confidenceThreshold: 55,
  maxInsights: 25,
  minSeverityToKeep: 'INFO', // CRITICAL | HIGH | MEDIUM | LOW | INFO
  currencySymbol: '₦',
  locale: 'en-NG',

  // Thresholds (all ratios are decimals)
  revenue: {
    highGrowth: 0.15,
    moderateGrowth: 0.05,
    decline: -0.05
  },
  margin: {
    significantChange: 0.03
  },
  cash: {
    strongMonths: 6,
    warningMonths: 3,
    declinePct: 0.10
  },
  inventory: {
    turnoverImprove: 1.10,
    turnoverDecline: 0.90,
    lowStockDays: 14,
    excessWeeks: 12
  },
  customer: {
    concentrationRisk: 0.40,
    acquisitionGrowth: 15
  },
  expense: {
    growthMultiplier: 2.0,
    minGrowth: 0.05
  },
  performance: {
    excellent: 80,
    moderate: 60
  },

  severityOrder: Object.freeze({
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4
  }),

  // Title map – SSOT for display titles
  titleMap: Object.freeze({
    REVENUE_HIGH_GROWTH_OPPORTUNITY: '🌟 Revenue Growth Opportunity',
    REVENUE_GROWTH_POSITIVE: '📈 Revenue Growing',
    REVENUE_GROWTH_NEGATIVE: '⚠️ Revenue Declining',
    REVENUE_STAGNANT: '📊 Revenue Flat',
    PROFIT_MARGIN_IMPROVING: '📈 Margin Improving',
    PROFIT_MARGIN_DECLINING: '⚠️ Margin Declining',
    PROFIT_DECLINE_REVENUE_GROWTH: '📉 Profit Decline Warning',
    CASH_SHORTAGE_WARNING: '🚨 Cash Shortage Warning',
    CASH_POSITION_STRONG: '💪 Strong Cash Position',
    CASH_POSITION_DECLINING: '⚠️ Cash Declining',
    CASH_FLOW_POSITIVE: '✅ Positive Cash Flow',
    CASH_FLOW_NEGATIVE: '❌ Negative Cash Flow',
    LOW_STOCK_WARNING: '⚠️ Low Stock Alert',
    EXCESS_INVENTORY: '📦 Excess Inventory',
    INVENTORY_TURNOVER_IMPROVING: '📈 Inventory Turnover Improving',
    INVENTORY_TURNOVER_DECLINING: '📉 Inventory Turnover Declining',
    CUSTOMER_CONCENTRATION_RISK: '⚠️ Customer Concentration Risk',
    CUSTOMER_ACQUISITION_GROWING: '🌟 Customer Acquisition Growing',
    RISK_DETECTED: '⚠️ Risk Detected',
    MULTIPLE_RISKS_DETECTED: '🚨 Multiple Risks Detected',
    EXPENSE_GROWTH_ALERT: '⚠️ Expense Growth Alert',
    EXPENSE_ANOMALY: '⚠️ Expense Anomaly',
    GROWTH_OPPORTUNITY_PRODUCT: '🌟 Product Growth Opportunity',
    GROWTH_OPPORTUNITY_MARKET: '🌟 Market Expansion Opportunity'
  })
});

class AdvisorInsightGenerator {
  /**
   * @param {Object} options
   * @param {number} [options.confidenceThreshold]
   * @param {Array}  [options.templates]
   * @param {Object} [options.config]           – partial override of DEFAULT_CONFIG
   * @param {Object} [options.logger]           – { info, warn, error, debug }
   * @param {Object} [options.metrics]          – { increment, histogram, gauge }
   * @param {Function} [options.clock]          – () => Date (for testability)
   */
  constructor(options = {}) {
    this.config = this._mergeConfig(DEFAULT_CONFIG, options.config || {});
    this.confidenceThreshold = options.confidenceThreshold ?? this.config.confidenceThreshold;
    this.templates = options.templates || ALL_INSIGHT_TEMPLATES;
    this.logger = options.logger || console;
    this.metrics = options.metrics || this._noopMetrics();
    this.clock = options.clock || (() => new Date());

    this.generatedInsights = [];
    this._lastGenerationId = null;
  }

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /**
   * Generate insights from consolidated engine data.
   * Always returns a new array (immutable contract).
   *
   * @param {Object} data
   * @param {Object} [context={}]
   * @param {Object} [options={}]
   * @returns {AdvisorInsight[]}
   */
  generate(data = {}, context = {}, options = {}) {
    const start = process.hrtime.bigint();
    const generationId = `ins_${this.clock().getTime()}_${Math.random().toString(36).slice(2, 9)}`;
    this._lastGenerationId = generationId;

    this.logger.info?.({ event: 'insight_generation_start', generationId });

    try {
      this._validateInput(data);

      const {
        categories = [],
        includeAll = false,
        minConfidence = this.confidenceThreshold,
        maxInsights = this.config.maxInsights
      } = options;

      const insights = [];

      // Early category filter for performance when caller already knows what they want
      const shouldRun = (cat) => categories.length === 0 || categories.includes(cat);

      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.REVENUE)) {
        insights.push(...this._safeGenerate('revenue', () => this.generateRevenueInsights(data, context)));
      }
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.PROFITABILITY)) {
        insights.push(...this._safeGenerate('profitability', () => this.generateProfitabilityInsights(data, context)));
      }
      // FIXED: real SSOT value is CASH (not CASH_FLOW)
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.CASH)) {
        insights.push(...this._safeGenerate('cashflow', () => this.generateCashFlowInsights(data, context)));
      }
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.INVENTORY)) {
        insights.push(...this._safeGenerate('inventory', () => this.generateInventoryInsights(data, context)));
      }
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.CUSTOMER)) {
        insights.push(...this._safeGenerate('customer', () => this.generateCustomerInsights(data, context)));
      }
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.RISK)) {
        insights.push(...this._safeGenerate('risk', () => this.generateRiskInsights(data, context)));
      }
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.EXPENSE)) {
        insights.push(...this._safeGenerate('expense', () => this.generateExpenseInsights(data, context)));
      }
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.GROWTH)) {
        insights.push(...this._safeGenerate('growth', () => this.generateGrowthInsights(data, context)));
      }
      if (shouldRun(ADVISOR_INSIGHT_CATEGORIES.PERFORMANCE)) {
        insights.push(...this._safeGenerate('performance', () => this.generatePerformanceInsights(data, context)));
      }

      // Filter
      let filtered = insights;
      if (categories.length > 0) {
        filtered = filtered.filter(i => categories.includes(i.category));
      }
      if (!includeAll) {
        filtered = filtered.filter(i => i.confidence >= minConfidence);
      }

      // Sort by severity (SSOT order)
      filtered.sort((a, b) => {
        const order = this.config.severityOrder;
        return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      });

      // Hard cap for production safety
      if (filtered.length > maxInsights) {
        this.logger.warn?.({
          event: 'insight_cap_reached',
          generationId,
          original: filtered.length,
          capped: maxInsights
        });
        filtered = filtered.slice(0, maxInsights);
      }

      // Attach generation metadata WITHOUT mutating frozen AdvisorInsight instances
      const enriched = filtered.map(i => {
        // Object.create keeps the original prototype + methods while allowing new properties
        const wrapper = Object.create(i);
        wrapper.meta = Object.freeze({
          generationId,
          schemaVersion: '2.0.0',
          generatedAt: this.clock().toISOString()
        });
        return wrapper;
      });

      this.generatedInsights = enriched;

      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.metrics.histogram?.('advisor.insight.generation.duration_ms', durationMs);
      this.metrics.gauge?.('advisor.insight.count', enriched.length);
      this.logger.info?.({
        event: 'insight_generation_complete',
        generationId,
        count: enriched.length,
        durationMs: Math.round(durationMs)
      });

      return enriched;
    } catch (err) {
      this.logger.error?.({
        event: 'insight_generation_failed',
        generationId,
        error: err.message,
        stack: err.stack
      });
      this.metrics.increment?.('advisor.insight.generation.errors');
      // Never throw to caller in production – return empty safe set
      return [];
    }
  }

  getInsights() {
    return [...this.generatedInsights]; // defensive copy
  }

  getInsightsByCategory(category) {
    return this.generatedInsights.filter(i => i.category === category);
  }

  getInsightsBySeverity(severity) {
    return this.generatedInsights.filter(i => i.severity === severity);
  }

  clear() {
    this.generatedInsights = [];
  }

  // ────────────────────────────────────────────────────────────
  // Insight Generators (defensive)
  // ────────────────────────────────────────────────────────────

  generateRevenueInsights(data, context) {
    const insights = [];
    const { revenue, revenueGrowth, period = 'month' } = data;
    if (revenueGrowth == null || revenue == null) return insights;

    const cfg = this.config.revenue;
    const growthPct = (revenueGrowth * 100).toFixed(1);

    if (revenueGrowth > cfg.highGrowth) {
      const t = this.findTemplate('REVENUE_HIGH_GROWTH_OPPORTUNITY');
      if (t) {
        insights.push(this.createInsight(t, {
          growth: growthPct,
          driver: this.identifyGrowthDriver(data)
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    } else if (revenueGrowth > cfg.moderateGrowth) {
      const t = this.findTemplate('REVENUE_GROWTH_POSITIVE');
      if (t) {
        insights.push(this.createInsight(t, {
          growth: growthPct,
          period,
          driver: this.identifyGrowthDriver(data) || 'market demand'
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    } else if (revenueGrowth < cfg.decline) {
      const t = this.findTemplate('REVENUE_GROWTH_NEGATIVE');
      if (t) {
        insights.push(this.createInsight(t, {
          decline: Math.abs(revenueGrowth * 100).toFixed(1),
          period,
          factors: this.identifyRevenueDeclineFactors(data) || 'declining demand'
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    } else {
      const t = this.findTemplate('REVENUE_STAGNANT');
      if (t) {
        insights.push(this.createInsight(t, {
          period,
          growth: growthPct
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    }
    return insights;
  }

  generateProfitabilityInsights(data, context) {
    const insights = [];
    const {
      grossMargin,
      previousGrossMargin,
      revenueGrowth,
      profitGrowth
    } = data;

    if (grossMargin == null || previousGrossMargin == null) return insights;

    const marginChange = grossMargin - previousGrossMargin;
    const cfg = this.config.margin;

    if (marginChange > cfg.significantChange) {
      const t = this.findTemplate('PROFIT_MARGIN_IMPROVING');
      if (t) {
        insights.push(this.createInsight(t, {
          previousMargin: (previousGrossMargin * 100).toFixed(1),
          currentMargin: (grossMargin * 100).toFixed(1),
          driver: this.identifyMarginDriver(data, 'improving')
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    } else if (marginChange < -cfg.significantChange) {
      const t = this.findTemplate('PROFIT_MARGIN_DECLINING');
      if (t) {
        insights.push(this.createInsight(t, {
          previousMargin: (previousGrossMargin * 100).toFixed(1),
          currentMargin: (grossMargin * 100).toFixed(1),
          driver: this.identifyMarginDriver(data, 'declining')
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    }

    if (revenueGrowth > 0.05 && profitGrowth != null && profitGrowth < -0.05) {
      const t = this.findTemplate('PROFIT_DECLINE_REVENUE_GROWTH');
      if (t) {
        insights.push(this.createInsight(t, {
          revenueGrowth: (revenueGrowth * 100).toFixed(1),
          profitDecline: Math.abs(profitGrowth * 100).toFixed(1),
          topExpenseCategory: this.identifyTopExpenseCategory(data)
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    }
    return insights;
  }

  generateCashFlowInsights(data, context) {
    const insights = [];
    const {
      currentCash,
      previousCash,
      projectedCash,
      monthlyExpenses,
      cashFlow
    } = data;

    if (currentCash == null) return insights;
    const cfg = this.config.cash;

    if (projectedCash != null && monthlyExpenses != null && monthlyExpenses > 0) {
      const minimumThreshold = monthlyExpenses * cfg.warningMonths;
      if (projectedCash < minimumThreshold) {
        const t = this.findTemplate('CASH_SHORTAGE_WARNING');
        if (t) {
          insights.push(this.createInsight(t, {
            projectedCash: this.formatCurrency(projectedCash),
            minimumThreshold: this.formatCurrency(minimumThreshold)
          }, { source: 'FORECAST', context: context.context || 'REAL_TIME' }));
        }
      }
    }

    if (monthlyExpenses != null && monthlyExpenses > 0 && currentCash / monthlyExpenses > cfg.strongMonths) {
      const t = this.findTemplate('CASH_POSITION_STRONG');
      if (t) {
        insights.push(this.createInsight(t, {
          cashAmount: this.formatCurrency(currentCash),
          months: Math.floor(currentCash / monthlyExpenses)
        }, { source: 'REPORT', context: context.context || 'REAL_TIME' }));
      }
    }

    if (previousCash != null && previousCash > 0 && currentCash < previousCash * (1 - cfg.declinePct)) {
      const decline = ((previousCash - currentCash) / previousCash) * 100;
      if (decline > 10) {
        const runway = monthlyExpenses > 0 ? Math.floor(currentCash / monthlyExpenses) : 'unknown';
        const t = this.findTemplate('CASH_POSITION_DECLINING');
        if (t) {
          insights.push(this.createInsight(t, {
            decline: decline.toFixed(1),
            period: context.period || 'month',
            runway,
            topExpense: this.identifyTopExpenseCategory(data)
          }, { source: 'REPORT', context: context.context || 'MONTHLY' }));
        }
      }
    }

    if (cashFlow != null) {
      if (cashFlow > 0) {
        const t = this.findTemplate('CASH_FLOW_POSITIVE');
        if (t) {
          insights.push(this.createInsight(t, {
            cashFlowAmount: this.formatCurrency(cashFlow),
            growth: data.cashFlowGrowth != null ? (data.cashFlowGrowth * 100).toFixed(1) : 'positive'
          }, { source: 'REPORT', context: context.context || 'MONTHLY' }));
        }
      } else if (cashFlow < 0) {
        const t = this.findTemplate('CASH_FLOW_NEGATIVE');
        if (t) {
          insights.push(this.createInsight(t, {
            cashFlowAmount: this.formatCurrency(Math.abs(cashFlow))
          }, { source: 'REPORT', context: context.context || 'MONTHLY' }));
        }
      }
    }
    return insights;
  }

  generateInventoryInsights(data, context) {
    const insights = [];
    const { inventoryItems, inventoryTurnover, previousInventoryTurnover } = data;
    if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) return insights;

    const cfg = this.config.inventory;

    if (inventoryTurnover != null && previousInventoryTurnover != null) {
      if (inventoryTurnover > previousInventoryTurnover * cfg.turnoverImprove) {
        const t = this.findTemplate('INVENTORY_TURNOVER_IMPROVING');
        if (t) {
          insights.push(this.createInsight(t, {
            turnover: inventoryTurnover.toFixed(1),
            previousTurnover: previousInventoryTurnover.toFixed(1)
          }, { source: 'INVENTORY', context: context.context || 'MONTHLY' }));
        }
      } else if (inventoryTurnover < previousInventoryTurnover * cfg.turnoverDecline) {
        const t = this.findTemplate('INVENTORY_TURNOVER_DECLINING');
        if (t) {
          insights.push(this.createInsight(t, {
            turnover: inventoryTurnover.toFixed(1),
            previousTurnover: previousInventoryTurnover.toFixed(1)
          }, { source: 'INVENTORY', context: context.context || 'MONTHLY' }));
        }
      }
    }

    for (const item of inventoryItems) {
      if (!item || typeof item !== 'object') continue;

      // Low stock
      if (item.stock != null && item.reorderLevel != null && item.stock <= item.reorderLevel) {
        const weeklySales = item.weeklySales || 0;
        const daysToStockout = weeklySales > 0 ? (item.stock / weeklySales) * 7 : Infinity;
        if (daysToStockout < cfg.lowStockDays) {
          const t = this.findTemplate('LOW_STOCK_WARNING');
          if (t) {
            insights.push(this.createInsight(t, {
              itemName: item.name || 'Item',
              stockLevel: item.stock,
              days: Math.ceil(daysToStockout)
            }, { source: 'INVENTORY', context: context.context || 'REAL_TIME' }));
          }
        }
      }

      // Excess stock
      if (item.weeklySales > 0) {
        const weeksOfStock = item.stock / item.weeklySales;
        if (weeksOfStock > cfg.excessWeeks) {
          const t = this.findTemplate('EXCESS_INVENTORY');
          if (t) {
            const value = item.stock * (item.unitCost || 0);
            insights.push(this.createInsight(t, {
              itemName: item.name || 'Item',
              stockLevel: item.stock,
              weeksOfStock: Math.round(weeksOfStock),
              value: this.formatCurrency(value)
            }, { source: 'INVENTORY', context: context.context || 'REAL_TIME' }));
          }
        }
      }
    }
    return insights;
  }

  generateCustomerInsights(data, context) {
    const insights = [];
    const { topCustomers, totalRevenue, newCustomers, repeatRate } = data;
    if (!Array.isArray(topCustomers) || topCustomers.length === 0) return insights;

    const cfg = this.config.customer;

    if (totalRevenue > 0) {
      const topRevenue = topCustomers[0]?.revenue || 0;
      const concentration = (topRevenue / totalRevenue) * 100;
      if (concentration > cfg.concentrationRisk * 100) {
        const t = this.findTemplate('CUSTOMER_CONCENTRATION_RISK');
        if (t) {
          insights.push(this.createInsight(t, {
            concentration: concentration.toFixed(1),
            customerName: topCustomers[0]?.name || 'top customer'
          }, { source: 'CUSTOMER', context: context.context || 'MONTHLY' }));
        }
      }
    }

    if (newCustomers != null && newCustomers > 0) {
      const growth = data.newCustomerGrowth ?? 10;
      if (growth > cfg.acquisitionGrowth) {
        const t = this.findTemplate('CUSTOMER_ACQUISITION_GROWING');
        if (t) {
          insights.push(this.createInsight(t, {
            growth: growth.toFixed(1),
            channel: this.identifyAcquisitionChannel(data) || 'marketing'
          }, { source: 'CUSTOMER', context: context.context || 'MONTHLY' }));
        }
      }
    }
    return insights;
  }

  generateRiskInsights(data, context) {
    const insights = [];
    const { risks } = data;
    if (!Array.isArray(risks) || risks.length === 0) return insights;

    const critical = risks.filter(r => r && (r.severity === 'CRITICAL' || r.severity === 'HIGH'));
    if (critical.length === 0) return insights;

    if (critical.length === 1) {
      const risk = critical[0];
      const t = this.findTemplate('RISK_DETECTED');
      if (t) {
        insights.push(this.createInsight(t, {
          riskDescription: risk.description || risk.type || 'Unknown risk',
          riskLevel: risk.severity || 'HIGH',
          recommendedAction: risk.recommendation || 'Review and address immediately'
        }, { source: 'RISK', context: context.context || 'REAL_TIME' }));
      }
    } else {
      const t = this.findTemplate('MULTIPLE_RISKS_DETECTED');
      if (t) {
        insights.push(this.createInsight(t, {
          riskList: critical.map(r => r.type || r.description).filter(Boolean).join(', '),
          criticalRisk: critical[0]?.type || 'unknown'
        }, { source: 'RISK', context: context.context || 'REAL_TIME' }));
      }
    }
    return insights;
  }

  generateExpenseInsights(data, context) {
    const insights = [];
    const { expenseCategories, expenseGrowth, revenueGrowth } = data;
    if (!Array.isArray(expenseCategories) || expenseCategories.length === 0) return insights;

    const cfg = this.config.expense;

    if (expenseGrowth != null && revenueGrowth != null) {
      if (expenseGrowth > revenueGrowth * cfg.growthMultiplier && expenseGrowth > cfg.minGrowth) {
        const t = this.findTemplate('EXPENSE_GROWTH_ALERT');
        if (t) {
          insights.push(this.createInsight(t, {
            categoryName: this.identifyTopExpenseCategory(data) || 'Expenses',
            growth: (expenseGrowth * 100).toFixed(1),
            period: context.period || 'month',
            revenueGrowth: (revenueGrowth * 100).toFixed(1)
          }, { source: 'EXPENSE', context: context.context || 'MONTHLY' }));
        }
      }
    }

    for (const category of expenseCategories) {
      if (category?.anomaly === true) {
        const t = this.findTemplate('EXPENSE_ANOMALY');
        if (t) {
          insights.push(this.createInsight(t, {
            categoryName: category.name || 'Expense',
            amount: this.formatCurrency(category.amount),
            normalRange: this.formatCurrency(category.normalRange ?? category.amount * 0.8)
          }, { source: 'EXPENSE', context: context.context || 'REAL_TIME' }));
        }
      }
    }
    return insights;
  }

  generateGrowthInsights(data, context) {
    const insights = [];
    const { productGrowth, newCustomers, repeatRate } = data;

    if (productGrowth != null && productGrowth > 0.25) {
      const t = this.findTemplate('GROWTH_OPPORTUNITY_PRODUCT');
      if (t) {
        insights.push(this.createInsight(t, {
          productName: data.topProduct || 'Product',
          growth: (productGrowth * 100).toFixed(1)
        }, { source: 'ANALYTICS', context: context.context || 'MONTHLY' }));
      }
    }

    if (newCustomers != null && repeatRate != null && newCustomers > 20 && repeatRate > 0.35) {
      const t = this.findTemplate('GROWTH_OPPORTUNITY_MARKET');
      if (t) {
        insights.push(this.createInsight(t, {
          newCustomerGrowth: data.newCustomerGrowth != null ? data.newCustomerGrowth.toFixed(1) : 'strong',
          repeatRate: (repeatRate * 100).toFixed(1)
        }, { source: 'CUSTOMER', context: context.context || 'MONTHLY' }));
      }
    }
    return insights;
  }

  generatePerformanceInsights(data, context) {
    const insights = [];
    const score = this.calculatePerformanceScore(data);
    const cfg = this.config.performance;

    if (score >= cfg.excellent) {
      insights.push(this.createPerformanceInsight(
        'Strong overall performance',
        'Your business is performing well across key metrics. Revenue, margins, and cash position are healthy.',
        ADVISOR_SENTIMENT.POSITIVE,
        ADVISOR_SEVERITY.INFO
      ));
    } else if (score >= cfg.moderate) {
      insights.push(this.createPerformanceInsight(
        'Moderate performance',
        'Your business is performing adequately, but margins and cash flow need attention.',
        ADVISOR_SENTIMENT.NEUTRAL,
        ADVISOR_SEVERITY.MEDIUM
      ));
    } else {
      insights.push(this.createPerformanceInsight(
        'Performance needs attention',
        'Multiple metrics are below target. Prioritise cash-flow management and margin recovery.',
        ADVISOR_SENTIMENT.NEGATIVE,
        ADVISOR_SEVERITY.HIGH
      ));
    }
    return insights;
  }

  // ────────────────────────────────────────────────────────────
  // Core Helpers
  // ────────────────────────────────────────────────────────────

  createInsight(template, data, context = {}) {
    const content = this.fillTemplate(template.template, data);
    const confidence = this.calculateConfidence(data, context);

    return new AdvisorInsight({
      category: template.category,
      title: this.generateTitle(template),
      content,
      summary: this.generateSummary(template, data),
      sentiment: template.sentiment || ADVISOR_SENTIMENT.NEUTRAL,
      severity: this.determineSeverity(template, data),
      evidence: data,
      recommendations: this.generateRecommendations(template, data),
      data,
      source: context.source || 'ADVISOR',
      generatedAt: this.clock(),
      confidence,
      tone: context.tone || 'CONVERSATIONAL',
      context: context.context || 'MONTHLY'
    });
  }

  createPerformanceInsight(title, content, sentiment, severity) {
    return new AdvisorInsight({
      category: ADVISOR_INSIGHT_CATEGORIES.PERFORMANCE,
      title,
      content,
      summary: title,
      sentiment,
      severity,
      evidence: {},
      recommendations: [],
      data: {},
      source: 'ADVISOR',
      generatedAt: this.clock(),
      confidence: 85,
      tone: 'PROFESSIONAL',
      context: 'MONTHLY'
    });
  }

  fillTemplate(template, data) {
    if (typeof template !== 'string') return '';
    return Object.entries(data).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '');
    }, template);
  }

  generateTitle(template) {
    return this.config.titleMap[template.id] || template.id || 'Insight';
  }

  generateSummary(template, data) {
    const content = this.fillTemplate(template.template, data);
    const first = content.split('.')[0] + '.';
    return first.length > 110 ? first.slice(0, 107) + '…' : first;
  }

  determineSeverity(template, data) {
    if (template.severity) return template.severity;

    if (data.decline && parseFloat(data.decline) > 30) return ADVISOR_SEVERITY.CRITICAL;
    if (data.concentration && parseFloat(data.concentration) > 60) return ADVISOR_SEVERITY.CRITICAL;
    return ADVISOR_SEVERITY.MEDIUM;
  }

  generateRecommendations(template, data) {
    const map = {
      CASH_SHORTAGE_WARNING: [
        'Review discretionary expenses immediately',
        'Accelerate receivable collections',
        'Evaluate short-term financing options'
      ],
      PROFIT_MARGIN_DECLINING: [
        'Review pricing strategy',
        'Audit supplier costs',
        'Identify quick cost-reduction opportunities'
      ],
      LOW_STOCK_WARNING: [
        `Reorder ${data.itemName || 'stock'} immediately`,
        'Review reorder points and lead times'
      ],
      CUSTOMER_CONCENTRATION_RISK: [
        'Accelerate customer diversification',
        'Strengthen retention programmes for key accounts'
      ],
      EXPENSE_GROWTH_ALERT: [
        'Deep-dive top expense categories',
        'Implement temporary cost controls'
      ]
    };

    return map[template.id] || (
      (template.sentiment === 'NEGATIVE' || template.sentiment === 'URGENT')
        ? ['Review this area carefully', 'Define corrective actions']
        : []
    );
  }

  calculateConfidence(data, context) {
    let score = 72;
    const keys = Object.keys(data || {});
    if (keys.length < 3) score -= 18;
    else if (keys.length < 5) score -= 8;

    if (data.lastUpdated) {
      const days = (this.clock() - new Date(data.lastUpdated)) / 86_400_000;
      if (days > 30) score -= 20;
      else if (days > 14) score -= 10;
    }

    if (context.source === 'FORECAST') score -= 12;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  calculatePerformanceScore(data) {
    let score = 0;
    let total = 0;

    if (data.revenueGrowth != null) {
      total++;
      if (data.revenueGrowth > 0.15) score += 100;
      else if (data.revenueGrowth > 0.05) score += 70;
      else if (data.revenueGrowth > 0) score += 50;
      else score += 20;
    }
    if (data.grossMargin != null) {
      total++;
      if (data.grossMargin > 0.35) score += 100;
      else if (data.grossMargin > 0.25) score += 70;
      else if (data.grossMargin > 0.15) score += 50;
      else score += 20;
    }
    if (data.currentCash != null && data.monthlyExpenses > 0) {
      total++;
      const months = data.currentCash / data.monthlyExpenses;
      if (months > 6) score += 100;
      else if (months > 3) score += 70;
      else if (months > 1) score += 50;
      else score += 20;
    }
    if (data.netProfit != null && data.revenue > 0) {
      total++;
      const m = data.netProfit / data.revenue;
      if (m > 0.15) score += 100;
      else if (m > 0.08) score += 70;
      else if (m > 0.03) score += 50;
      else score += 20;
    }
    return total > 0 ? Math.round(score / total) : 50;
  }

  // ────────────────────────────────────────────────────────────
  // Utilities
  // ────────────────────────────────────────────────────────────

  findTemplate(id) {
    return this.templates.find(t => t.id === id) || null;
  }

  identifyGrowthDriver(data) {
    return data.topProduct || data.topCustomer || (data.newCustomers > 0 ? 'new customer acquisition' : 'increased demand');
  }

  identifyRevenueDeclineFactors(data) {
    return data.declineFactors || data.competitorActivity || 'declining demand';
  }

  identifyMarginDriver(data, direction) {
    if (direction === 'improving') {
      return data.costReduction ? 'cost reduction initiatives'
        : data.priceIncrease ? 'pricing improvements' : 'operational efficiency';
    }
    return data.costIncrease ? 'increasing supplier costs'
      : data.priceDecline ? 'pricing pressure' : 'cost increases';
  }

  identifyTopExpenseCategory(data) {
    if (!Array.isArray(data.expenseCategories) || data.expenseCategories.length === 0) {
      return 'Operating expenses';
    }
    return [...data.expenseCategories]
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))[0]?.name || 'Expenses';
  }

  identifyAcquisitionChannel(data) {
    return data.topChannel || 'marketing';
  }

  formatCurrency(amount) {
    if (amount == null || Number.isNaN(amount)) return `${this.config.currencySymbol}0`;
    return `${this.config.currencySymbol}${Math.round(amount).toLocaleString(this.config.locale)}`;
  }

  // ────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────

  _validateInput(data) {
    if (data == null || typeof data !== 'object') {
      throw new TypeError('data must be a non-null object');
    }
  }

  _safeGenerate(name, fn) {
    try {
      return fn() || [];
    } catch (err) {
      this.logger.warn?.({ event: 'generator_failed', generator: name, error: err.message });
      this.metrics.increment?.(`advisor.insight.generator.${name}.errors`);
      return [];
    }
  }

  _mergeConfig(base, override) {
    // Shallow + nested freeze for safety
    const merged = { ...base, ...override };
    if (override.revenue) merged.revenue = { ...base.revenue, ...override.revenue };
    if (override.margin) merged.margin = { ...base.margin, ...override.margin };
    if (override.cash) merged.cash = { ...base.cash, ...override.cash };
    if (override.inventory) merged.inventory = { ...base.inventory, ...override.inventory };
    if (override.customer) merged.customer = { ...base.customer, ...override.customer };
    if (override.expense) merged.expense = { ...base.expense, ...override.expense };
    if (override.performance) merged.performance = { ...base.performance, ...override.performance };
    return Object.freeze(merged);
  }

  _noopMetrics() {
    return {
      increment: () => {},
      histogram: () => {},
      gauge: () => {}
    };
  }
}

module.exports = AdvisorInsightGenerator;