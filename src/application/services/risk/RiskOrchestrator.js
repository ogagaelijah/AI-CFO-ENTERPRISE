'use strict';

/**
 * RiskOrchestrator – SSOT v1.3.0-prod
 *
 * Coordinates all risk modules into a single immutable assessment package.
 * Designed for production scale:
 * • Parallel calculators with per-calculator error isolation
 * • Intelligence layer (anomaly / trend / persistence) in parallel
 * • Frozen outputs, zero top-level crash, duration metrics
 * • Fully injectable dependencies (testable without real repos)
 *
 * Does not break existing Risk Engine contracts, calculators, or rules.
 *
 * @version 1.3.0
 */

const calculatorsMod = require('./calculators');
const scoringMod = require('./scoring');
const RiskRules = require('./rules/RiskRules');
const AnomalyDetector = require('./intelligence/AnomalyDetector');
const RiskTrendAnalyzer = require('./intelligence/RiskTrendAnalyzer');
const RiskPersistenceAnalyzer = require('./intelligence/RiskPersistenceAnalyzer');
const { RiskContracts, RISK_TYPES, RISK_STATUS } = require('./contracts');

/**
 * Resolve a constructor from common CJS export shapes:
 * module.exports = Class
 * module.exports = { ClassName }
 * module.exports = { ClassName: Class, default: Class }
 * require('./calculators/CashRiskCalculator')
 */
function resolveCtor(mod, name, fallbackPath) {
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod[name] === 'function') return mod[name];
  if (mod && mod.default) {
    if (typeof mod.default === 'function') return mod.default;
    if (typeof mod.default[name] === 'function') return mod.default[name];
  }
  if (fallbackPath) {
    try {
      const m = require(fallbackPath);
      if (typeof m === 'function') return m;
      if (m && typeof m[name] === 'function') return m[name];
      if (m && typeof m.default === 'function') return m.default;
    } catch (_) {
      /* optional path */
    }
  }
  return null;
}

const CashFlowRiskCalculator = resolveCtor(
  calculatorsMod,
  'CashFlowRiskCalculator',
  './calculators/CashFlowRiskCalculator'
);
const RevenueRiskCalculator = resolveCtor(
  calculatorsMod,
  'RevenueRiskCalculator',
  './calculators/RevenueRiskCalculator'
);
const ProfitabilityRiskCalculator = resolveCtor(
  calculatorsMod,
  'ProfitabilityRiskCalculator',
  './calculators/ProfitabilityRiskCalculator'
);
const ExpenseRiskCalculator = resolveCtor(
  calculatorsMod,
  'ExpenseRiskCalculator',
  './calculators/ExpenseRiskCalculator'
);
const ReceivablesRiskCalculator = resolveCtor(
  calculatorsMod,
  'ReceivablesRiskCalculator',
  './calculators/ReceivablesRiskCalculator'
);
const PayablesRiskCalculator = resolveCtor(
  calculatorsMod,
  'PayablesRiskCalculator',
  './calculators/PayablesRiskCalculator'
);
const InventoryRiskCalculator = resolveCtor(
  calculatorsMod,
  'InventoryRiskCalculator',
  './calculators/InventoryRiskCalculator'
);

const RiskScoreCalculator = resolveCtor(
  scoringMod,
  'RiskScoreCalculator',
  './scoring/RiskScoreCalculator'
);
const RiskSeverityCalculator = resolveCtor(
  scoringMod,
  'RiskSeverityCalculator',
  './scoring/RiskSeverityCalculator'
);

function instantiate(Ctor, deps, label) {
  if (typeof Ctor !== 'function') {
    // Last-resort: RiskCalculatorRegistry
    try {
      const regMod = require('./calculators/RiskCalculatorRegistry');
      const Registry =
        typeof regMod === 'function'
          ? regMod
          : regMod.RiskCalculatorRegistry || regMod.default;
      if (typeof Registry === 'function') {
        const reg = new Registry(deps);
        if (reg && typeof reg.get === 'function') {
          const instance =
            reg.get(
              label.replace('RiskCalculator', '').replace('Calculator', '').toLowerCase()
            ) || reg.get(label);
          if (instance) return instance;
        }
        if (reg && reg.calculators && reg.calculators[label]) {
          const C = reg.calculators[label];
          if (typeof C === 'function') return new C(deps);
          if (C) return C;
        }
      }
    } catch (_) {
      /* no registry */
    }

    throw new TypeError(
      `[RiskOrchestrator] ${label} is not a constructor – check ./calculators and ./scoring exports`
    );
  }
  return new Ctor(deps);
}

class RiskOrchestrator {
  static VERSION = '1.3.0';

  /**
   * @param {object} [deps] All dependencies optional – production wiring injects them.
   */
  constructor({
    cashFlowRiskCalculator = null,
    revenueRiskCalculator = null,
    profitabilityRiskCalculator = null,
    expenseRiskCalculator = null,
    receivablesRiskCalculator = null,
    payablesRiskCalculator = null,
    inventoryRiskCalculator = null,
    riskScoreCalculator = null,
    riskSeverityCalculator = null,
    riskRules = null,
    anomalyDetector = null,
    trendAnalyzer = null,
    persistenceAnalyzer = null,
    logger = console,
    reportService = null,
    saleRepository = null,
    expenseRepository = null,
    paymentRepository = null,
    debtorRepository = null,
    creditorRepository = null,
    inventoryRepository = null,
  } = {}) {
    this.logger = logger;

    // Domain calculators (injectable; resolved from flexible export shapes)
    this.cashRisk =
      cashFlowRiskCalculator ||
      instantiate(CashFlowRiskCalculator, { reportService, logger }, 'CashFlowRiskCalculator');
    this.revenueRisk =
      revenueRiskCalculator ||
      instantiate(RevenueRiskCalculator, { reportService, logger }, 'RevenueRiskCalculator');
    this.profitabilityRisk =
      profitabilityRiskCalculator ||
      instantiate(
        ProfitabilityRiskCalculator,
        { reportService, logger },
        'ProfitabilityRiskCalculator'
      );
    this.expenseRisk =
      expenseRiskCalculator ||
      instantiate(ExpenseRiskCalculator, { reportService, logger }, 'ExpenseRiskCalculator');
    this.receivablesRisk =
      receivablesRiskCalculator ||
      instantiate(
        ReceivablesRiskCalculator,
        { reportService, debtorRepository, logger },
        'ReceivablesRiskCalculator'
      );
    this.payablesRisk =
      payablesRiskCalculator ||
      instantiate(
        PayablesRiskCalculator,
        { reportService, creditorRepository, logger },
        'PayablesRiskCalculator'
      );
    this.inventoryRisk =
      inventoryRiskCalculator ||
      instantiate(
        InventoryRiskCalculator,
        { reportService, inventoryRepository, logger },
        'InventoryRiskCalculator'
      );

    // Scoring / rules / intelligence
    this.riskScoreCalculator =
      riskScoreCalculator ||
      instantiate(RiskScoreCalculator, { logger }, 'RiskScoreCalculator');
    this.riskSeverityCalculator =
      riskSeverityCalculator ||
      instantiate(RiskSeverityCalculator, { logger }, 'RiskSeverityCalculator');
    this.riskRules = riskRules || new RiskRules({ logger });
    this.anomalyDetector = anomalyDetector || new AnomalyDetector({ logger });
    this.trendAnalyzer = trendAnalyzer || new RiskTrendAnalyzer({ logger });
    this.persistenceAnalyzer =
      persistenceAnalyzer || new RiskPersistenceAnalyzer({ logger });

    // Optional infrastructure (not required for pure assess() with data bag)
    this.reportService = reportService;
    this.saleRepository = saleRepository;
    this.expenseRepository = expenseRepository;
    this.paymentRepository = paymentRepository;
    this.debtorRepository = debtorRepository;
    this.creditorRepository = creditorRepository;
    this.inventoryRepository = inventoryRepository;
  }

  // ─────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────

  /**
   * Full risk assessment package.
   *
   * @param {object} params
   * @param {number|string} [params.userId]
   * @param {number|string} [params.businessId]
   * @param {object} [params.data] Structured domain data bag
   * @param {object} [params.previousRisks] Prior assessment scores by domain
   * @param {object} [params.options]
   * @returns {Promise<Readonly<object>>}
   */
  async assess({
    userId,
    businessId,
    data = {},
    previousRisks = null,
    options = {},
  } = {}) {
    const startTime = Date.now();
    const safeData = data && typeof data === 'object' ? data : {};

    try {
      // STEP 1: Domain calculators in parallel (error-isolated)
      const calculatorTasks = [
        this._safeRun(
          () =>
            this.cashRisk.calculate({
              userId,
              businessId,
              currentCash: safeData?.cash?.current || 0,
              cashData: this._asArray(safeData?.cash?.history),
              previousRisk: previousRisks?.cash,
            }),
          'cash',
          RISK_TYPES.CASH_FLOW
        ),
        this._safeRun(
          () =>
            this.revenueRisk.calculate({
              userId,
              businessId,
              revenueData: this._asArray(safeData?.revenue?.history),
              previousRisk: previousRisks?.revenue,
            }),
          'revenue',
          RISK_TYPES.REVENUE
        ),
        this._safeRun(
          () =>
            this.profitabilityRisk.calculate({
              userId,
              businessId,
              marginData: this._asArray(safeData?.profitability?.history),
              marginType: safeData?.profitability?.type || 'gross',
              previousRisk: previousRisks?.profitability,
            }),
          'profitability',
          RISK_TYPES.PROFITABILITY
        ),
        this._safeRun(
          () =>
            this.expenseRisk.calculate({
              userId,
              businessId,
              expenseData: this._asArray(safeData?.expenses?.history),
              revenueGrowth: Number(safeData?.revenue?.growth) || 0,
              categoryData: safeData?.expenses?.categories || null,
              previousRisk: previousRisks?.expenses,
            }),
          'expenses',
          RISK_TYPES.EXPENSE
        ),
        this._safeRun(
          () =>
            this.receivablesRisk.calculate({
              userId,
              businessId,
              receivablesData: this._asArray(safeData?.receivables?.history),
              agingData: safeData?.receivables?.aging || null,
              previousRisk: previousRisks?.receivables,
            }),
          'receivables',
          RISK_TYPES.RECEIVABLES
        ),
        this._safeRun(
          () =>
            this.payablesRisk.calculate({
              userId,
              businessId,
              payablesData: this._asArray(safeData?.payables?.history),
              agingData: safeData?.payables?.aging || null,
              previousRisk: previousRisks?.payables,
            }),
          'payables',
          RISK_TYPES.PAYABLES
        ),
        this._safeRun(
          () =>
            this.inventoryRisk.calculate({
              userId,
              businessId,
              inventoryData: this._asArray(safeData?.inventory?.history),
              revenueGrowth: Number(safeData?.revenue?.growth) || 0,
              lowStockItems: Number(safeData?.inventory?.lowStockItems) || 0,
              inventoryDetails: safeData?.inventory?.details || null,
              previousRisk: previousRisks?.inventory,
            }),
          'inventory',
          RISK_TYPES.INVENTORY
        ),
      ];

      const [
        cashRisk,
        revenueRisk,
        profitabilityRisk,
        expenseRisk,
        receivablesRisk,
        payablesRisk,
        inventoryRisk,
      ] = await Promise.all(calculatorTasks);

      const allRisks = [
        cashRisk,
        revenueRisk,
        profitabilityRisk,
        expenseRisk,
        receivablesRisk,
        payablesRisk,
        inventoryRisk,
      ].filter((r) => r && (r.id || r.type));

      // STEP 2–4: Intelligence layer in parallel
      const [anomalies, trendResults, persistenceResults] = await Promise.all([
        this._detectAnomalies(safeData),
        Promise.resolve(
          this.trendAnalyzer.analyzeMultiple(
            allRisks.map((r) => ({
              id: r.id,
              type: r.type,
              history: this._buildHistory(r, previousRisks),
            }))
          )
        ),
        Promise.resolve(
          this.persistenceAnalyzer.analyzeMultiple(
            allRisks.map((r) => ({
              id: r.id,
              type: r.type,
              history: this._buildHistory(r, previousRisks),
            }))
          )
        ),
      ]);

      // STEP 5: Aggregate scoring
      const scoreResult = this.riskScoreCalculator.calculate({
        risks: allRisks,
        metrics: { forecastImpact: Number(safeData?.forecast?.impact) || 0 },
      });

      // STEP 6: Immutable assessment package
      const packageResult = {
        generatedAt: new Date().toISOString(),
        risks: Object.freeze({
          cash: cashRisk,
          revenue: revenueRisk,
          profitability: profitabilityRisk,
          expenses: expenseRisk,
          receivables: receivablesRisk,
          payables: payablesRisk,
          inventory: inventoryRisk,
          all: Object.freeze(allRisks),
        }),
        anomalies: Object.freeze(anomalies),
        trends: Object.freeze(trendResults),
        persistence: Object.freeze(persistenceResults),
        scoring: Object.freeze(scoreResult),
        rules: Object.freeze(this.riskRules.snapshot()),
        executiveSummary: Object.freeze(
          this._buildExecutiveSummary({
            allRisks,
            scoreResult,
            trendResults,
            persistenceResults,
            anomalies,
          })
        ),
        recommendations: Object.freeze(this._generateRecommendations(allRisks)),
        summary: Object.freeze({
          overallScore: scoreResult.overallScore,
          overallSeverity: scoreResult.severity,
          riskCount: allRisks.length,
          criticalRisks: allRisks.filter((r) => r.severity === 'CRITICAL').length,
          highRisks: allRisks.filter((r) => r.severity === 'HIGH').length,
          mediumRisks: allRisks.filter((r) => r.severity === 'MEDIUM').length,
          lowRisks: allRisks.filter((r) => r.severity === 'LOW').length,
        }),
        metadata: Object.freeze({
          userId,
          businessId,
          generatedAt: new Date().toISOString(),
          version: RiskOrchestrator.VERSION,
          durationMs: Date.now() - startTime,
        }),
      };

      return Object.freeze(packageResult);
    } catch (error) {
      this.logger.error?.('[RiskOrchestrator] assess failed', {
        userId,
        businessId,
        error: error?.message,
        stack: error?.stack,
      });
      return Object.freeze({
        generatedAt: new Date().toISOString(),
        error: true,
        reason: 'ORCHESTRATION_ERROR',
        risks: Object.freeze({ all: Object.freeze([]) }),
        anomalies: Object.freeze({}),
        trends: Object.freeze({ results: Object.freeze({}) }),
        persistence: Object.freeze({ results: Object.freeze({}) }),
        scoring: Object.freeze({ overallScore: 0, severity: 'LOW' }),
        executiveSummary: Object.freeze({
          overallRisk: { score: 0, severity: 'LOW', label: 'Low' },
          summary: 'Risk assessment failed.',
        }),
        recommendations: Object.freeze([]),
        summary: Object.freeze({
          overallScore: 0,
          overallSeverity: 'LOW',
          riskCount: 0,
          criticalRisks: 0,
          highRisks: 0,
          mediumRisks: 0,
          lowRisks: 0,
        }),
        metadata: Object.freeze({
          userId,
          businessId,
          version: RiskOrchestrator.VERSION,
          durationMs: Date.now() - startTime,
        }),
      });
    }
  }

  /**
   * Lightweight summary – same pipeline, smaller projection.
   */
  async quickAssess({ userId, businessId, data } = {}) {
    const result = await this.assess({ userId, businessId, data });
    return {
      overallScore: result.summary?.overallScore,
      overallSeverity: result.summary?.overallSeverity,
      criticalCount: result.summary?.criticalRisks,
      highCount: result.summary?.highRisks,
      topRisks: result.executiveSummary?.topRisk
        ? [result.executiveSummary.topRisk]
        : [],
      summary:
        typeof result.executiveSummary?.summary === 'string'
          ? result.executiveSummary.summary
          : String(result.executiveSummary?.summary || ''),
    };
  }

  /**
   * Filter historical snapshots by risk type.
   * Pure helper – does not hit storage.
   *
   * @param {string} riskType
   * @param {Array<object>|null} historicalSnapshots
   * @returns {Array<object>}
   */
  getRiskHistory(riskType, historicalSnapshots) {
    if (!Array.isArray(historicalSnapshots) || !riskType) return [];
    return historicalSnapshots
      .filter(
        (s) =>
          s &&
          (s.riskType === riskType || s.type === riskType || s.domain === riskType)
      )
      .map((s) => ({
        score: Number.isFinite(Number(s.score)) ? Number(s.score) : 0,
        timestamp: s.timestamp || s.detectedAt || s.date || null,
        status: s.status || RISK_STATUS.ACTIVE,
        riskType: s.riskType || s.type || riskType,
      }));
  }

  // ─────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────

  async _safeRun(fn, riskKey, riskType) {
    try {
      const result = await fn();
      if (result && typeof result === 'object') {
        return result;
      }
      return this._fallbackRisk(riskKey, riskType, 'Empty calculator result');
    } catch (error) {
      this.logger.error?.(`[RiskOrchestrator] ${riskKey} calculator failed`, {
        error: error?.message,
      });
      return this._fallbackRisk(riskKey, riskType, error?.message);
    }
  }

  _fallbackRisk(riskKey, riskType, message) {
    return Object.freeze({
      id: riskKey,
      type: riskType || riskKey,
      title: `${riskKey} risk`,
      score: 0,
      severity: 'LOW',
      status: RISK_STATUS.UNKNOWN || 'UNKNOWN',
      message: message || 'Calculator failed',
      recommendation: 'Review data inputs and retry.',
      impact: { financial: 0 },
      metrics: Object.freeze({}),
      warnings: Object.freeze([]),
      confidence: 0.05,
    });
  }

  async _detectAnomalies(data) {
    const anomalies = {};
    try {
      const series = [
        {
          key: 'revenue',
          history: data?.revenue?.history,
          metric: 'revenue',
          display: 'Revenue',
        },
        {
          key: 'expenses',
          history: data?.expenses?.history,
          metric: 'expenses',
          display: 'Expenses',
        },
        {
          key: 'sales',
          history: data?.sales?.history,
          metric: 'sales',
          display: 'Sales',
        },
      ];

      for (const s of series) {
        const hist = this._asArray(s.history);
        if (hist.length < 5) continue;
        const values = hist.map((d) => {
          if (d == null) return 0;
          if (typeof d === 'number') return d;
          return Number(d.value) || 0;
        });
        try {
          anomalies[s.key] = this.anomalyDetector.detect({
            values,
            metric: s.metric,
            metricDisplayName: s.display,
          });
        } catch (err) {
          this.logger.warn?.(
            `[RiskOrchestrator] anomaly detect failed for ${s.key}`,
            { error: err?.message }
          );
        }
      }
    } catch (err) {
      this.logger.error?.('[RiskOrchestrator] _detectAnomalies failed', {
        error: err?.message,
      });
    }
    return anomalies;
  }

  /**
   * Build a minimal score history for trend/persistence analyzers.
   * Prefer explicit risk.history; otherwise synthesize from current + previous.
   */
  _buildHistory(risk, previousRisks) {
    if (risk?.history && Array.isArray(risk.history) && risk.history.length) {
      return risk.history;
    }

    const history = [];
    const now = risk?.detectedAt || new Date().toISOString();

    if (risk?.score !== undefined && risk?.score !== null) {
      history.push({
        score: Number(risk.score) || 0,
        timestamp: now,
        status: risk.status || RISK_STATUS.ACTIVE,
      });
    }

    // previousScore on the risk contract
    if (risk?.previousScore !== null && risk?.previousScore !== undefined) {
      const weekAgo = new Date(
        new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      history.unshift({
        score: Number(risk.previousScore) || 0,
        timestamp: weekAgo,
        status: RISK_STATUS.ACTIVE,
      });
    } else if (previousRisks && risk?.type) {
      // Map type → previousRisks domain key when possible
      const typeToKey = {
        [RISK_TYPES.CASH_FLOW]: 'cash',
        [RISK_TYPES.REVENUE]: 'revenue',
        [RISK_TYPES.PROFITABILITY]: 'profitability',
        [RISK_TYPES.EXPENSE]: 'expenses',
        [RISK_TYPES.RECEIVABLES]: 'receivables',
        [RISK_TYPES.PAYABLES]: 'payables',
        [RISK_TYPES.INVENTORY]: 'inventory',
      };
      const key = typeToKey[risk.type];
      const prev = key ? previousRisks[key] : null;
      if (prev && prev.score !== undefined) {
        const weekAgo = new Date(
          new Date(now).getTime() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();
        history.unshift({
          score: Number(prev.score) || 0,
          timestamp: weekAgo,
          status: RISK_STATUS.ACTIVE,
        });
      }
    }

    return history;
  }

  _buildExecutiveSummary({
    allRisks,
    scoreResult,
    trendResults,
    persistenceResults,
    anomalies,
  }) {
    const criticalRisks = allRisks.filter((r) => r.severity === 'CRITICAL');
    const trendMap = trendResults?.results || {};
    const persistenceMap = persistenceResults?.results || {};
    const anomalyMap = anomalies || {};

    const worseningRisks = Object.values(trendMap).filter(
      (r) => r.direction === 'WORSENING'
    );
    const improvingRisks = Object.values(trendMap).filter(
      (r) => r.direction === 'IMPROVING'
    );
    const stableRisks = Object.values(trendMap).filter(
      (r) => r.direction === 'STABLE'
    );
    const persistentRisks = Object.values(persistenceMap).filter(
      (r) => r.isPersistent
    );
    const entrenchedRisks = Object.values(persistenceMap).filter(
      (r) => r.isEntrenched
    );

    const topRisk =
      allRisks.length > 0
        ? allRisks.reduce((a, b) => ((a.score || 0) > (b.score || 0) ? a : b))
        : null;

    const anomalyList = Object.values(anomalyMap);
    const anomalyCount = anomalyList.filter((a) => a && a.hasAnomalies).length;

    return {
      overallRisk: {
        score: scoreResult.overallScore,
        severity: scoreResult.severity,
        label: RiskContracts.getSeverityLabel(scoreResult.severity),
      },
      riskDistribution: {
        critical: criticalRisks.length,
        high: allRisks.filter((r) => r.severity === 'HIGH').length,
        medium: allRisks.filter((r) => r.severity === 'MEDIUM').length,
        low: allRisks.filter((r) => r.severity === 'LOW').length,
      },
      topRisk: topRisk
        ? {
            type: topRisk.type,
            title: topRisk.title,
            score: topRisk.score,
            severity: topRisk.severity,
          }
        : null,
      trends: {
        worsening: worseningRisks.length,
        improving: improvingRisks.length,
        stable: stableRisks.length,
        overallDirection: trendResults?.summary?.overallDirection || 'STABLE',
      },
      persistence: {
        persistent: persistentRisks.length,
        entrenched: entrenchedRisks.length,
      },
      anomalies: {
        total: anomalyCount,
        critical: anomalyList.filter((a) => a && a.hasCritical).length,
        high: anomalyList.filter((a) => a && a.hasHigh).length,
      },
      summary: this._generateSummaryText({
        allRisks,
        scoreResult,
        trendResults,
        persistenceResults,
        anomalies,
      }),
    };
  }

  _generateSummaryText({
    allRisks,
    scoreResult,
    trendResults,
    persistenceResults,
    anomalies,
  }) {
    const severityLabel = RiskContracts.getSeverityLabel(
      scoreResult.severity
    ).toLowerCase();
    const criticalCount = allRisks.filter(
      (r) => r.severity === 'CRITICAL'
    ).length;
    const highCount = allRisks.filter((r) => r.severity === 'HIGH').length;

    let text = `Overall business risk is ${severityLabel} (${scoreResult.overallScore}/100).`;

    if (criticalCount > 0) {
      text += ` ${criticalCount} critical risk(s) require immediate attention.`;
    } else if (highCount > 0) {
      text += ` ${highCount} high risk(s) require monitoring.`;
    } else {
      text += ` No critical risks detected.`;
    }

    const worsening = Object.values(trendResults?.results || {}).filter(
      (r) => r.direction === 'WORSENING'
    ).length;
    if (worsening > 0) text += ` ${worsening} risk(s) are worsening.`;

    const persistent = Object.values(persistenceResults?.results || {}).filter(
      (r) => r.isPersistent
    ).length;
    if (persistent > 0) text += ` ${persistent} risk(s) are persistent.`;

    const anomalyCount = Object.values(anomalies || {}).filter(
      (a) => a && a.hasAnomalies
    ).length;
    if (anomalyCount > 0) text += ` ${anomalyCount} anomaly(ies) detected.`;

    return text;
  }

  _generateRecommendations(risks) {
    const recommendations = [];
    const list = Array.isArray(risks) ? risks : [];

    for (const risk of list.filter((r) => r.severity === 'CRITICAL')) {
      recommendations.push({
        priority: 'CRITICAL',
        riskType: risk.type,
        title: risk.title,
        recommendation: risk.recommendation || 'Immediate action required',
        impact: risk.impact?.financial ?? null,
        timeframe: 'Immediate',
      });
    }
    for (const risk of list.filter((r) => r.severity === 'HIGH')) {
      recommendations.push({
        priority: 'HIGH',
        riskType: risk.type,
        title: risk.title,
        recommendation: risk.recommendation || 'Action required soon',
        impact: risk.impact?.financial ?? null,
        timeframe: 'Short-term',
      });
    }
    return recommendations;
  }

  _asArray(val) {
    return Array.isArray(val) ? val : [];
  }
}

module.exports = RiskOrchestrator;