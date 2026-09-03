'use strict';

/**
 * Decision Engine - Main Orchestrator
 * Path: src/application/services/decision/DecisionEngine.js
 * @version 1.1.5-prod
 */

const Decision = require('../../../domain/entities/Decision');
const DecisionRuleEngine = require('./DecisionRuleEngine');
const DecisionConfidenceService = require('./DecisionConfidenceService');
const DecisionPriorityService = require('./DecisionPriorityService');
const DecisionScoringService = require('./DecisionScoringService');
const DecisionDeduplicationService = require('./DecisionDeduplicationService');
const DecisionLifecycleService = require('./DecisionLifecycleService');
const ImpactCalculator = require('./calculators/impactCalculator');
const ScenarioCalculator = require('./calculators/scenarioCalculator');
const BreakEvenCalculator = require('./calculators/breakEvenCalculator');

const {
  DECISION_PRIORITY,
  PRIORITY_ORDER,
} = require('./contracts/DecisionContracts');

const { ALL_RULES } = require('./rules');

const safeNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const safeObj = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

/**
 * Normalize confidence value coming from DecisionScoringService.
 * Accepts either a number or an object shaped like { score: number }.
 */
function extractConfidence(raw) {
  if (raw == null) return undefined;
  if (typeof raw === 'object') {
    return safeNumber(raw.score ?? raw.value, undefined);
  }
  return safeNumber(raw, undefined);
}

/**
 * Normalize priority value coming from DecisionScoringService / PriorityService.
 * Accepts either a string ('HIGH') or a rich object ({ priority: 'HIGH' }, { level: 'HIGH' }, etc.).
 * Always returns a plain string suitable for Decision validation & sorting.
 */
function extractPriority(raw) {
  if (raw == null) return undefined;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    return (
      raw.priority ||
      raw.level ||
      raw.value ||
      raw.name ||
      undefined
    );
  }
  return String(raw);
}

class DecisionEngine {
  constructor(options = {}) {
    const opts = safeObj(options);

    this.confidenceService = new DecisionConfidenceService();
    this.priorityService = new DecisionPriorityService();
    this.scoringService = new DecisionScoringService({
      confidenceService: this.confidenceService,
      priorityService: this.priorityService,
    });
    this.deduplicationService = new DecisionDeduplicationService({
      cooldownPeriod:
        opts.cooldownPeriod != null
          ? opts.cooldownPeriod
          : 7 * 24 * 60 * 60 * 1000,
    });
    this.lifecycleService = new DecisionLifecycleService();
    this.impactCalculator = new ImpactCalculator();
    this.scenarioCalculator = new ScenarioCalculator();
    this.breakEvenCalculator = new BreakEvenCalculator();

    this.ruleEngine = new DecisionRuleEngine({
      confidenceService: this.confidenceService,
      priorityService: this.priorityService,
    });
    this.ruleEngine.registerRules(ALL_RULES);

    this.config = {
      confidenceThreshold:
        opts.confidenceThreshold != null ? opts.confidenceThreshold : 60,
      minPriority: opts.minPriority || 'MEDIUM',
      minImpactThreshold:
        opts.minImpactThreshold != null ? opts.minImpactThreshold : 10,
      maxDecisions: opts.maxDecisions != null ? opts.maxDecisions : 50,
      cooldownPeriod:
        opts.cooldownPeriod != null
          ? opts.cooldownPeriod
          : 7 * 24 * 60 * 60 * 1000,
      ...opts,
    };

    // Freeze config so it cannot be mutated after construction
    Object.freeze(this.config);

    this.decisionHistory = Array.isArray(opts.decisionHistory)
      ? [...opts.decisionHistory]
      : [];
    this.deduplicationService.decisionHistory = this.decisionHistory;

    this.dataProviders = safeObj(opts.dataProviders);
  }

  async generateDecisions(context = {}, options = {}) {
    const ctx = safeObj(context);
    const opts = safeObj(options);
    const includeImpact = opts.includeImpact !== false;
    const includeScenarios = Boolean(opts.includeScenarios);
    const categories = Array.isArray(opts.categories) ? opts.categories : [];
    const types = Array.isArray(opts.types) ? opts.types : [];
    const limit =
      opts.limit != null
        ? safeNumber(opts.limit, this.config.maxDecisions)
        : this.config.maxDecisions;

    const data = await this.gatherData(ctx);
    const rawDecisions = await this.ruleEngine.evaluate(data, ctx);
    const scoredDecisions = await this.scoreDecisions(rawDecisions, data, ctx);
    const deduplicatedDecisions = this.deduplicateDecisions(scoredDecisions);
    const filteredDecisions = this.filterDecisions(deduplicatedDecisions, {
      categories,
      types,
    });
    const sortedDecisions = this.sortByPriority(filteredDecisions);
    const limitedDecisions = sortedDecisions.slice(0, Math.max(0, limit));

    let decisionsWithImpact = limitedDecisions;
    if (includeImpact) {
      decisionsWithImpact = await this.addImpactCalculations(
        limitedDecisions,
        data,
        ctx
      );
    }

    let decisionsWithScenarios = decisionsWithImpact;
    if (includeScenarios) {
      decisionsWithScenarios = await this.addScenarioAnalysis(
        decisionsWithImpact,
        data,
        ctx
      );
    }

    const summary = this.generateSummary(decisionsWithScenarios);
    const formattedDecisions = decisionsWithScenarios.map((d) =>
      typeof d.toDisplay === 'function' ? d.toDisplay() : d
    );

    this.addToHistory(decisionsWithScenarios);

    return {
      correlationId: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      generatedAt: new Date(),
      context: {
        businessId: ctx.businessId || '1',
        industry: ctx.industry || 'unknown',
      },
      summary,
      decisions: formattedDecisions,
      fullDecisions: decisionsWithScenarios,
      metrics: this.getMetrics(decisionsWithScenarios),
    };
  }

  async gatherData(context) {
    const data = {
      analytics: {},
      forecast: {},
      risk: {},
      report: {},
      inventory: {},
      customers: {},
      suppliers: {},
      expenses: {},
      cashFlow: {},
      workingCapital: {},
      raw: {},
    };

    // Include every provider the rules may need
    const keys = [
      'analytics',
      'forecast',
      'risk',
      'report',
      'inventory',
      'customers',
      'suppliers',
      'cashFlow',
      'expenses',
      'workingCapital',
    ];

    await Promise.all(
      keys.map(async (key) => {
        const provider = this.dataProviders[key];
        if (!provider || typeof provider.getData !== 'function') return;
        try {
          data[key] = await provider.getData(context);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to fetch ${key} data:`, error.message);
        }
      })
    );

    return this.flattenData(data);
  }

  flattenData(data) {
    const d = safeObj(data);
    const flat = {
      ...safeObj(d.analytics),
      ...safeObj(d.forecast),
      ...safeObj(d.risk),
      ...safeObj(d.report),
      ...safeObj(d.inventory),
      ...safeObj(d.customers),
      ...safeObj(d.suppliers),
      ...safeObj(d.expenses),
      ...safeObj(d.cashFlow),
      ...safeObj(d.workingCapital),
      _raw: d,
    };

    if (d.analytics) {
      flat.kpis = safeObj(d.analytics.kpis);
      flat.ratios = safeObj(d.analytics.ratios);
      flat.trends = safeObj(d.analytics.trends);
    }
    if (d.forecast) {
      flat.projections = safeObj(d.forecast.projections);
    }
    if (d.risk) {
      flat.risks = Array.isArray(d.risk.risks) ? d.risk.risks : [];
      flat.riskScores = safeObj(d.risk.scores);
    }

    // Explicit aliases so rules can read stable top-level fields
    if (d.cashFlow) {
      const cf = safeObj(d.cashFlow);
      if (cf.currentCash != null) flat.currentCash = cf.currentCash;
      if (cf.projectedCash != null) flat.projectedCash = cf.projectedCash;
      if (cf.dailyBurn != null) flat.dailyBurn = cf.dailyBurn;
      if (cf.history != null) flat.cashHistory = cf.history;
    }
    if (d.inventory) {
      const inv = safeObj(d.inventory);
      if (Array.isArray(inv.items)) flat.items = inv.items;
      if (inv.totalValue != null) flat.inventoryValue = inv.totalValue;
      if (inv.turnover != null) flat.inventoryTurnover = inv.turnover;
    }
    if (d.customers) {
      const cu = safeObj(d.customers);
      if (Array.isArray(cu.topCustomers)) flat.topCustomers = cu.topCustomers;
      if (cu.totalRevenue != null) flat.customerTotalRevenue = cu.totalRevenue;
    }
    if (d.suppliers) {
      const su = safeObj(d.suppliers);
      if (Array.isArray(su.topSuppliers)) flat.topSuppliers = su.topSuppliers;
      if (su.totalPurchases != null) {
        flat.supplierTotalPurchases = su.totalPurchases;
      }
    }
    if (d.expenses) {
      const ex = safeObj(d.expenses);
      if (Array.isArray(ex.categories)) flat.expenseCategories = ex.categories;
      if (ex.total != null) flat.expenseTotal = ex.total;
      if (ex.growth != null) flat.expenseGrowth = ex.growth;
    }

    return flat;
  }

  async scoreDecisions(decisions, data, context) {
    const list = Array.isArray(decisions) ? decisions : [];
    const ctx = safeObj(context);
    const scored = [];

    for (const decision of list) {
      // Infer a meaningful financial impact from evidence when the
      // decision ships with a zero/placeholder impact. This keeps
      // realistic cash-flow style decisions from being discarded by
      // the minImpactThreshold during unit tests and normal operation.
      let impact = decision.impact || { financialImpact: 0 };
      if (safeNumber(impact.financialImpact) < this.config.minImpactThreshold) {
        const ev = safeObj(decision.evidence);
        if (ev.currentCash != null && ev.projectedCash != null) {
          impact = {
            financialImpact: Math.abs(
              safeNumber(ev.currentCash) - safeNumber(ev.projectedCash)
            ),
          };
        } else if (ev.financialImpact != null) {
          impact = { financialImpact: safeNumber(ev.financialImpact) };
        }
      }

      const scoring = this.scoringService.score(
        {
          evidence: decision.evidence || {},
          timeframe: decision.timeframe || 'MEDIUM_TERM',
          severity: decision.severity || 'INFO',
          impact,
          relatedEntity: decision.relatedEntity || 'BUSINESS',
          isForecast: Boolean(decision.isForecast),
        },
        {
          businessSize: ctx.businessSize || 10_000_000,
          focus: ctx.focus || null,
        },
        {
          requiredFields: decision.requiredFields || [],
          confidenceThreshold: this.config.confidenceThreshold,
          minImpactThreshold: this.config.minImpactThreshold,
          minPriority: this.config.minPriority,
        }
      );

      if (scoring.shouldGenerate) {
        const conf = extractConfidence(scoring.confidence);
        const prio = extractPriority(scoring.priority);

        // Immutable: create a brand-new Decision that carries the scored
        // values and the full scoring metadata.
        const scoredDecision = new Decision({
          ...decision.toJSON(),
          confidence: conf,
          priority: prio,
          scoring,
        });

        scored.push(scoredDecision);
      }
    }
    return scored;
  }

  deduplicateDecisions(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];
    const unique = [];
    const seen = new Map();

    for (const decision of list) {
      const fingerprint =
        typeof decision.getFingerprint === 'function'
          ? decision.getFingerprint()
          : `${decision.type}:${decision.relatedEntity}:${decision.relatedEntityId}`;

      if (seen.has(fingerprint)) {
        const existing = seen.get(fingerprint);
        if (safeNumber(decision.confidence) > safeNumber(existing.confidence)) {
          const index = unique.indexOf(existing);
          if (index !== -1) {
            unique[index] = decision;
            seen.set(fingerprint, decision);
          }
        }
        continue;
      }

      const dedupResult = this.deduplicationService.shouldGenerate(
        {
          type: decision.type,
          relatedEntity: decision.relatedEntity,
          relatedEntityId: decision.relatedEntityId,
          severity: decision.severity,
          priority: decision.priority,
        },
        unique,
        this.decisionHistory
      );

      if (dedupResult.shouldGenerate) {
        unique.push(decision);
        seen.set(fingerprint, decision);
      }
    }
    return unique;
  }

  filterDecisions(decisions, filters = {}) {
    const list = Array.isArray(decisions) ? decisions : [];
    const categories = Array.isArray(filters.categories)
      ? filters.categories
      : [];
    const types = Array.isArray(filters.types) ? filters.types : [];
    if (!categories.length && !types.length) return list;

    return list.filter((d) => {
      const okCat = !categories.length || categories.includes(d.category);
      const okType = !types.length || types.includes(d.type);
      return okCat && okType;
    });
  }

  sortByPriority(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];

    // Guarantee a correct ascending order (lower number = higher priority)
    // even when PRIORITY_ORDER from contracts is incomplete or inverted.
    const order = {
      ...(PRIORITY_ORDER || {}),
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
    };

    return [...list].sort((a, b) => {
      const pa =
        order[a.priority] ??
        order[String(a.priority || '').toUpperCase()] ??
        99;
      const pb =
        order[b.priority] ??
        order[String(b.priority || '').toUpperCase()] ??
        99;
      return pa - pb;
    });
  }

  async addImpactCalculations(decisions, data, context) {
    const list = Array.isArray(decisions) ? decisions : [];
    return Promise.all(
      list.map(async (decision) => {
        let impact = null;
        try {
          const impactType = this.getImpactType(decision.type);
          if (impactType) {
            impact = this.impactCalculator.calculate({
              type: impactType,
              currentState: this.extractCurrentState(decision, data),
              proposedChange: this.extractProposedChange(decision),
              businessContext: context,
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(
            `Failed to calculate impact for decision ${decision.id}:`,
            error.message
          );
        }

        // Immutable: return a new Decision that carries the impact result
        return new Decision({
          ...decision.toJSON(),
          impactResult: impact,
        });
      })
    );
  }

  async addScenarioAnalysis(decisions, data, context) {
    const list = Array.isArray(decisions) ? decisions : [];
    return Promise.all(
      list.map(async (decision) => {
        let scenarios = null;
        try {
          const t = String(decision.type || '');
          if (t.includes('PRICE') || t.includes('MARGIN')) {
            scenarios = this.generatePriceScenarios(decision, data, context);
          } else if (t.includes('COST') || t.includes('EXPENSE')) {
            scenarios = this.generateCostScenarios(decision, data, context);
          } else if (t.includes('REVENUE') || t.includes('GROWTH')) {
            scenarios = this.generateRevenueScenarios(decision, data, context);
          } else if (t.includes('INVENTORY') || t.includes('STOCK')) {
            scenarios = this.generateInventoryScenarios(
              decision,
              data,
              context
            );
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(
            `Failed to generate scenarios for decision ${decision.id}:`,
            error.message
          );
        }

        // Immutable: return a new Decision that carries the scenarios
        return new Decision({
          ...decision.toJSON(),
          scenarios,
        });
      })
    );
  }

  getImpactType(decisionType) {
    const typeMap = {
      PRICE_INCREASE_OPPORTUNITY: 'PRICE_CHANGE',
      PRICE_SENSITIVITY_ALERT: 'PRICE_CHANGE',
      MARGIN_COMPRESSION: 'PRICE_CHANGE',
      COST_CONTROL_OPPORTUNITY: 'COST_SAVING',
      SUPPLIER_COST_INCREASE: 'COST_SAVING',
      REVENUE_GROWTH_OPPORTUNITY: 'REVENUE_GROWTH',
      PRODUCT_GROWTH_LEADER: 'REVENUE_GROWTH',
      EXPENSE_ANOMALY: 'EXPENSE_REDUCTION',
      EXPENSE_GROWTH_ALERT: 'EXPENSE_REDUCTION',
      WORKING_CAPITAL_PRESSURE: 'WORKING_CAPITAL',
      WORKING_CAPITAL_OPTIMIZATION: 'WORKING_CAPITAL',
      LIQUIDITY_RISK: 'WORKING_CAPITAL',
    };
    return typeMap[decisionType] || null;
  }

  extractCurrentState(decision, data) {
    return {
      ...safeObj(data),
      ...safeObj(decision && decision.evidence),
    };
  }

  extractProposedChange(decision) {
    const change = {};
    const evidence = safeObj(decision && decision.evidence);
    if (evidence.suggestedPrice != null) {
      change.priceChangePercent = evidence.suggestedPrice;
    }
    if (evidence.suggestedCost != null) {
      change.savingPercent = evidence.suggestedCost;
    }
    return change;
  }

  generatePriceScenarios(decision, data, context) {
    const currentPrice = safeNumber(data.currentPrice, 1000);
    const currentVolume = safeNumber(data.currentVolume, 1000);
    const currentMargin = safeNumber(data.currentMargin, 0.3);
    return this.scenarioCalculator.runScenarios({
      scenarios: [
        {
          name: '5% Price Increase',
          type: 'PRICE_CHANGE',
          currentState: { currentPrice, currentVolume, currentMargin },
          proposedChange: { priceChangePercent: 0.05 },
        },
        {
          name: '10% Price Increase',
          type: 'PRICE_CHANGE',
          currentState: { currentPrice, currentVolume, currentMargin },
          proposedChange: { priceChangePercent: 0.1 },
        },
        {
          name: '5% Price Decrease',
          type: 'PRICE_CHANGE',
          currentState: { currentPrice, currentVolume, currentMargin },
          proposedChange: { priceChangePercent: -0.05 },
        },
      ],
      businessContext: context,
      comparisonMetric: 'profitImpact',
    });
  }

  generateCostScenarios(decision, data, context) {
    const currentCost = safeNumber(data.currentCost, 700);
    const annualVolume = safeNumber(data.annualVolume, 10000);
    const currentMargin = safeNumber(data.currentMargin, 0.3);
    const currentRevenue = safeNumber(data.currentRevenue, 10_000_000);
    return this.scenarioCalculator.runScenarios({
      scenarios: [
        {
          name: '5% Cost Reduction',
          type: 'COST_SAVING',
          currentState: {
            currentCost,
            annualVolume,
            currentMargin,
            currentRevenue,
          },
          proposedChange: { savingPercent: 0.05 },
        },
        {
          name: '10% Cost Reduction',
          type: 'COST_SAVING',
          currentState: {
            currentCost,
            annualVolume,
            currentMargin,
            currentRevenue,
          },
          proposedChange: { savingPercent: 0.1 },
        },
        {
          name: '15% Cost Reduction',
          type: 'COST_SAVING',
          currentState: {
            currentCost,
            annualVolume,
            currentMargin,
            currentRevenue,
          },
          proposedChange: { savingPercent: 0.15 },
        },
      ],
      businessContext: context,
      comparisonMetric: 'profitImpact',
    });
  }

  generateRevenueScenarios(decision, data, context) {
    const currentRevenue = safeNumber(data.currentRevenue, 10_000_000);
    const currentMargin = safeNumber(data.currentMargin, 0.3);
    const investment = safeNumber(data.investment, 500_000);
    return this.scenarioCalculator.runScenarios({
      scenarios: [
        {
          name: '10% Revenue Growth',
          type: 'REVENUE_GROWTH',
          currentState: { currentRevenue, currentMargin },
          proposedChange: { targetGrowth: 0.1, investment },
        },
        {
          name: '20% Revenue Growth',
          type: 'REVENUE_GROWTH',
          currentState: { currentRevenue, currentMargin },
          proposedChange: { targetGrowth: 0.2, investment },
        },
        {
          name: '30% Revenue Growth',
          type: 'REVENUE_GROWTH',
          currentState: { currentRevenue, currentMargin },
          proposedChange: { targetGrowth: 0.3, investment },
        },
      ],
      businessContext: context,
      comparisonMetric: 'profitImpact',
    });
  }

  generateInventoryScenarios(decision, data, context) {
    const currentStock = safeNumber(data.currentStock, 100);
    const reorderLevel = safeNumber(data.reorderLevel, 50);
    return this.scenarioCalculator.runScenarios({
      scenarios: [
        {
          name: 'Order to Reorder Level',
          type: 'VOLUME_CHANGE',
          currentState: {
            currentVolume: currentStock,
            currentPrice: safeNumber(data.currentPrice, 1000),
            currentCost: safeNumber(data.currentCost, 700),
            currentMargin: safeNumber(data.currentMargin, 0.3),
          },
          proposedChange: {
            volumeChangePercent:
              currentStock !== 0
                ? (reorderLevel - currentStock) / currentStock
                : 0,
          },
        },
      ],
      businessContext: context,
      comparisonMetric: 'profitImpact',
    });
  }

  generateSummary(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];
    const summary = {
      total: list.length,
      byPriority: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0, OPPORTUNITY: 0 },
      byCategory: {},
      averageConfidence: 0,
      totalImpact: 0,
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
      totalConfidence += safeNumber(decision.confidence);
      if (decision.impactResult && decision.impactResult.profitImpact) {
        summary.totalImpact += safeNumber(decision.impactResult.profitImpact);
      }
    }
    summary.averageConfidence =
      list.length > 0 ? Math.round(totalConfidence / list.length) : 0;
    return summary;
  }

  getMetrics(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];
    return {
      total: list.length,
      averageConfidence:
        list.length > 0
          ? Math.round(
              list.reduce((s, d) => s + safeNumber(d.confidence), 0) /
                list.length
            )
          : 0,
      priorities: list.map((d) => d.priority),
      categories: [...new Set(list.map((d) => d.category))],
      types: [...new Set(list.map((d) => d.type))],
      hasImpact: list.some((d) => d.impactResult != null),
      hasScenarios: list.some((d) => d.scenarios != null),
    };
  }

  addToHistory(decisions) {
    const incoming = Array.isArray(decisions) ? decisions : [];
    for (const d of incoming) {
      this.decisionHistory.push(d);
    }
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory = this.decisionHistory.slice(-1000);
    }
    this.deduplicationService.decisionHistory = this.decisionHistory;
  }

  getByCategory(decisions, category) {
    return (Array.isArray(decisions) ? decisions : []).filter(
      (d) => d.category === category
    );
  }

  getByPriority(decisions, priority) {
    return (Array.isArray(decisions) ? decisions : []).filter(
      (d) => d.priority === priority
    );
  }

  getTopDecisions(decisions, n = 5) {
    return this.sortByPriority(decisions).slice(0, n);
  }

  getCriticalDecisions(decisions) {
    return this.getByPriority(decisions, DECISION_PRIORITY.CRITICAL);
  }

  getActionableDecisions(decisions) {
    return this.lifecycleService.getActionable(
      Array.isArray(decisions) ? decisions : []
    );
  }

  getSummaryForDisplay(decisions) {
    const list = Array.isArray(decisions) ? decisions : [];
    const summary = this.generateSummary(list);
    return {
      summary,
      topDecisions: this.getTopDecisions(list, 5).map((d) =>
        typeof d.toDisplay === 'function' ? d.toDisplay() : d
      ),
      criticalDecisions: this.getCriticalDecisions(list).map((d) =>
        typeof d.toDisplay === 'function' ? d.toDisplay() : d
      ),
      actionableCount: this.getActionableDecisions(list).length,
      totalImpact: summary.totalImpact,
    };
  }
}

module.exports = DecisionEngine;