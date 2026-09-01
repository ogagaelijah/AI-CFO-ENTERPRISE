// src/application/services/forecast/ForecastOrchestrator.js
// SSOT v5.5.0-prod | Deterministic · Audited · Capped · Zero-crash · BFS-Frozen · Partial-Failure-Tolerant
'use strict';

const {
    RevenueForecastCalculator,
    SalesVolumeForecastCalculator,
    COGSForecastCalculator,
    ExpenseForecastCalculator,
    ProfitForecastCalculator,
    CashFlowForecastCalculator,
    ReceivablesForecastCalculator,
    PayablesForecastCalculator,
    InventoryForecastCalculator,
    DemandForecastCalculator,
} = require('./core');

const { ScenarioEngine, WhatIfEngine } = require('./scenarios');
const {
    ConfidenceEngine,
    ForecastAccuracyEngine,
    ForecastRiskDetector,
} = require('./intelligence');

/**
 * @typedef {Object} ForecastOrchestratorLimits
 * @property {string} VERSION
 * @property {number} MAX_WHATIF_CHANGES
 * @property {number} MAX_PARALLEL_METRICS
 * @property {number} FREEZE_DEPTH_LIMIT
 * @property {number} MAX_ARRAY_FREEZE_SIZE
 * @property {Readonly<Record<string, number>>} HORIZON_DAYS
 * @property {Readonly<Record<string, string>>} LABELS
 */

/**
 * ForecastOrchestrator – Single entry point for all forecasting.
 * Coordinates Core + Scenarios + Intelligence. Never recalculates.
 * Enterprise guarantees: partial-failure tolerant, fully frozen output,
 * deterministic, audited, hard-capped, zero unhandled crashes.
 */
class ForecastOrchestrator {
    /** @type {Readonly<ForecastOrchestratorLimits>} */
    static LIMITS = Object.freeze({
        VERSION: '5.5.0-prod',
        MAX_WHATIF_CHANGES: 10,
        MAX_PARALLEL_METRICS: 10,
        FREEZE_DEPTH_LIMIT: 4,
        MAX_ARRAY_FREEZE_SIZE: 5_000,
        HORIZON_DAYS: Object.freeze({
            '7D': 7,
            '14D': 14,
            '30D': 30,
            '60D': 60,
            '90D': 90,
            '6M': 180,
            '12M': 365,
        }),
        LABELS: Object.freeze({
            '7D': '7 Days',
            '14D': '14 Days',
            '30D': '30 Days',
            '60D': '60 Days',
            '90D': '90 Days',
            '6M': '6 Months',
            '12M': '12 Months',
        }),
    });

    static NOOP_LOGGER = Object.freeze({
        warn: () => {},
        info: () => {},
        error: () => {},
        debug: () => {},
    });

    static EMPTY_FORECAST = Object.freeze({
        forecast: 0,
        available: false,
        reason: 'INSUFFICIENT_DATA',
    });

    /**
     * @param {Object} [deps]
     */
    constructor({
        revenueForecast,
        salesVolumeForecast,
        cogsForecast,
        expenseForecast,
        profitForecast,
        cashFlowForecast,
        receivablesForecast,
        payablesForecast,
        inventoryForecast,
        demandForecast,
        scenarioEngine,
        whatIfEngine,
        confidenceEngine,
        accuracyEngine,
        riskDetector,
        trendAnalyzer,
        seasonalityDetector,
        volatilityAnalyzer,
        saleRepository,
        expenseRepository,
        paymentRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        reportService,
        logger = ForecastOrchestrator.NOOP_LOGGER,
        limits = null,
    } = {}) {
        this.logger =
            logger && typeof logger.warn === 'function'
                ? logger
                : ForecastOrchestrator.NOOP_LOGGER;

        this.LIMITS = Object.freeze({
            ...ForecastOrchestrator.LIMITS,
            ...(limits || {}),
        });

        // Core calculators (DI + safe defaults)
        this.revenueForecast =
            revenueForecast ||
            new RevenueForecastCalculator({
                reportService,
                trendAnalyzer,
                seasonalityDetector,
                volatilityAnalyzer,
            });
        this.salesVolumeForecast =
            salesVolumeForecast ||
            new SalesVolumeForecastCalculator({
                reportService,
                trendAnalyzer,
                volatilityAnalyzer,
            });
        this.cogsForecast =
            cogsForecast ||
            new COGSForecastCalculator({
                reportService,
                inventoryRepository,
                trendAnalyzer,
                volatilityAnalyzer,
            });
        this.expenseForecast =
            expenseForecast ||
            new ExpenseForecastCalculator({
                reportService,
                expenseRepository,
                trendAnalyzer,
                volatilityAnalyzer,
            });
        this.profitForecast =
            profitForecast || new ProfitForecastCalculator({ reportService });
        this.cashFlowForecast =
            cashFlowForecast ||
            new CashFlowForecastCalculator({
                reportService,
                paymentRepository,
                trendAnalyzer,
                volatilityAnalyzer,
            });
        this.receivablesForecast =
            receivablesForecast ||
            new ReceivablesForecastCalculator({
                reportService,
                debtorRepository,
                trendAnalyzer,
                volatilityAnalyzer,
            });
        this.payablesForecast =
            payablesForecast ||
            new PayablesForecastCalculator({
                reportService,
                creditorRepository,
                trendAnalyzer,
                volatilityAnalyzer,
            });
        this.inventoryForecast =
            inventoryForecast ||
            new InventoryForecastCalculator({
                reportService,
                inventoryRepository,
                trendAnalyzer,
                volatilityAnalyzer,
            });
        this.demandForecast =
            demandForecast ||
            new DemandForecastCalculator({
                reportService,
                saleRepository,
                trendAnalyzer,
                seasonalityDetector,
                volatilityAnalyzer,
            });

        // Scenario / Intelligence engines
        this.scenarioEngine =
            scenarioEngine ||
            new ScenarioEngine({
                revenueForecast: this.revenueForecast,
                cogsForecast: this.cogsForecast,
                expenseForecast: this.expenseForecast,
                profitForecast: this.profitForecast,
                cashFlowForecast: this.cashFlowForecast,
            });
        this.whatIfEngine =
            whatIfEngine ||
            new WhatIfEngine({
                revenueForecast: this.revenueForecast,
                cogsForecast: this.cogsForecast,
                expenseForecast: this.expenseForecast,
                profitForecast: this.profitForecast,
            });
        this.confidenceEngine =
            confidenceEngine ||
            new ConfidenceEngine({
                trendAnalyzer,
                seasonalityDetector,
                volatilityAnalyzer,
            });
        this.accuracyEngine = accuracyEngine || new ForecastAccuracyEngine();
        this.riskDetector =
            riskDetector ||
            new ForecastRiskDetector({ trendAnalyzer, volatilityAnalyzer });

        // Repositories (kept for future real hydration)
        this.saleRepository = saleRepository;
        this.expenseRepository = expenseRepository;
        this.paymentRepository = paymentRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
        this.reportService = reportService;
    }

    /**
     * Primary entry point. Always returns a fully frozen package.
     * Never throws to the caller.
     *
     * @param {Object} params
     * @param {string} params.userId
     * @param {string} params.businessId
     * @param {string} [params.horizon='30D']
     * @param {Object|null} [params.historicalData]
     * @param {Array|null} [params.whatIfChanges]
     * @param {Date} [params.now]
     * @param {string|null} [params.traceId]
     * @returns {Promise<Object>} Frozen forecast package
     */
    async generate({
        userId,
        businessId,
        horizon = '30D',
        historicalData = null,
        whatIfChanges = null,
        now = new Date(),
        traceId = null,
    } = {}) {
        const F = this.LIMITS;
        const started =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        const safeNow =
            now instanceof Date && !Number.isNaN(now.getTime())
                ? now
                : new Date();
        const tid = traceId || this._traceId(safeNow);

        // ── 1. Hard validation ──────────────────────────────────────────────
        if (!userId || !businessId) {
            this.logger.warn(
                '[ForecastOrchestrator] Missing userId or businessId',
                { traceId: tid }
            );
            return this._freeze(
                this._errorPackage('INVALID_PARAMS', safeNow, tid)
            );
        }

        if (!F.HORIZON_DAYS[horizon]) {
            this.logger.warn(
                '[ForecastOrchestrator] Invalid horizon, falling back to 30D',
                { traceId: tid, horizon }
            );
            horizon = '30D';
        }

        try {
            // ── 2. Data hydration ───────────────────────────────────────────
            const data =
                historicalData ||
                (await this._fetchHistoricalData(userId, businessId, tid));

            if (
                !data ||
                typeof data !== 'object' ||
                Object.keys(data).length === 0
            ) {
                throw new Error(
                    'Historical data hydration yielded an empty package context.'
                );
            }

            const period = this._buildPeriod(horizon, safeNow);

            // ── 3. Independent core metrics (true parallel) ─────────────────
            // These do not depend on any other forecast result.
            const independentResults = await Promise.allSettled([
                this._safeForecast(
                    this.revenueForecast,
                    {
                        userId,
                        businessId,
                        historicalData: data.revenue || [],
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'revenue'
                ),
                this._safeForecast(
                    this.salesVolumeForecast,
                    {
                        userId,
                        businessId,
                        historicalData: data.salesVolume || [],
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'salesVolume'
                ),
                this._safeForecast(
                    this.expenseForecast,
                    {
                        userId,
                        businessId,
                        historicalData: data.expenses || [],
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'expenses'
                ),
                this._safeForecast(
                    this.receivablesForecast,
                    {
                        userId,
                        businessId,
                        currentReceivables: data.currentReceivables || 0,
                        historicalCollections: data.collections || [],
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'receivables'
                ),
                this._safeForecast(
                    this.payablesForecast,
                    {
                        userId,
                        businessId,
                        currentPayables: data.currentPayables || 0,
                        historicalPayments: data.supplierPayments || [],
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'payables'
                ),
                this._safeForecast(
                    this.demandForecast,
                    {
                        userId,
                        businessId,
                        historicalDemand: data.demand || [],
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'demand'
                ),
            ]);

            const [
                revenueResult,
                salesVolumeResult,
                expenseResult,
                receivablesResult,
                payablesResult,
                demandResult,
            ] = independentResults.map((r) =>
                r.status === 'fulfilled'
                    ? r.value
                    : ForecastOrchestrator.EMPTY_FORECAST
            );

            // ── 4. COGS (depends on salesVolume) ────────────────────────────
            // Run as its own step so the finished result is available for profit.
            const cogsResult = await this._safeForecast(
                this.cogsForecast,
                {
                    userId,
                    businessId,
                    historicalData: data.cogs || [],
                    salesVolumeForecastData: salesVolumeResult,
                    horizon,
                    period,
                    traceId: tid,
                },
                'cogs'
            );

            // ── 5. Remaining dependents (profit needs cogs) ─────────────────
            const dependentResults = await Promise.allSettled([
                this._safeForecast(
                    this.profitForecast,
                    {
                        userId,
                        businessId,
                        revenueForecastData: revenueResult,
                        cogsForecastData: cogsResult,
                        expenseForecastData: expenseResult,
                        horizon,
                        period,
                        otherIncome: data.otherIncome || 0,
                        traceId: tid,
                    },
                    'profit'
                ),
                this._safeForecast(
                    this.cashFlowForecast,
                    {
                        userId,
                        businessId,
                        openingCash: data.openingCash || 0,
                        revenueForecastData: revenueResult,
                        expenseForecastData: expenseResult,
                        historicalPayments: data.payments || [],
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'cashFlow'
                ),
                this._safeForecast(
                    this.inventoryForecast,
                    {
                        userId,
                        businessId,
                        historicalInventory: data.inventory || [],
                        purchaseHistory: data.purchases || [],
                        salesVolumeForecastData: salesVolumeResult,
                        horizon,
                        period,
                        traceId: tid,
                    },
                    'inventory'
                ),
            ]);

            const [profitFinal, cashFlowFinal, inventoryResult] =
                dependentResults.map((r) =>
                    r.status === 'fulfilled'
                        ? r.value
                        : ForecastOrchestrator.EMPTY_FORECAST
                );

            // ── 6. Base forecast snapshot (numbers only) ────────────────────
            const baseForecast = Object.freeze({
                revenue: revenueResult?.forecast ?? 0,
                salesVolume: salesVolumeResult?.forecast ?? 0,
                cogs: cogsResult?.forecast ?? 0,
                expenses: expenseResult?.forecast ?? 0,
                profit: profitFinal?.forecast ?? 0,
                cashFlow: cashFlowFinal?.forecast ?? 0,
                receivables: receivablesResult?.forecast ?? 0,
                payables: payablesResult?.forecast ?? 0,
                inventory: inventoryResult?.forecast ?? 0,
                demand: demandResult?.forecast ?? 0,
            });

            // ── 7. Scenarios ────────────────────────────────────────────────
            let scenarios = null;
            try {
                scenarios = await this.scenarioEngine.generate({
                    baseForecast,
                    historicalData: data.historical || [],
                    horizon,
                    period,
                    traceId: tid,
                });
            } catch (err) {
                this.logger.warn(
                    '[ForecastOrchestrator] Scenario generation failed',
                    { traceId: tid, error: err.message }
                );
                scenarios = Object.freeze({
                    available: false,
                    reason: 'SCENARIO_ERROR',
                });
            }

            // ── 8. What-If (hard capped) ────────────────────────────────────
            let whatIfResult = null;
            const rawChanges = this._safeArray(whatIfChanges);
            const changes = rawChanges.slice(0, F.MAX_WHATIF_CHANGES);

            if (rawChanges.length > F.MAX_WHATIF_CHANGES) {
                this.logger.warn(
                    '[ForecastOrchestrator] whatIfChanges truncated',
                    {
                        traceId: tid,
                        original: rawChanges.length,
                        capped: F.MAX_WHATIF_CHANGES,
                    }
                );
            }

            if (changes.length > 0) {
                try {
                    whatIfResult = await this.whatIfEngine.analyze({
                        baseForecast,
                        changes,
                        historicalData: data.historical || [],
                        horizon,
                        traceId: tid,
                    });
                } catch (err) {
                    this.logger.warn(
                        '[ForecastOrchestrator] What-If analysis failed',
                        { traceId: tid, error: err.message }
                    );
                    whatIfResult = Object.freeze({
                        available: false,
                        reason: 'WHATIF_ERROR',
                    });
                }
            }

            // ── 9. Confidence ───────────────────────────────────────────────
            let confidenceResults = null;
            try {
                confidenceResults = this.confidenceEngine.compare(
                    {
                        revenue: {
                            historicalData: (data.revenue || []).map(
                                (d) => d?.value ?? 0
                            ),
                            historicalRecords: data.revenue || [],
                            forecast: revenueResult,
                        },
                        profit: {
                            historicalData: (data.profit || []).map(
                                (d) => d?.value ?? 0
                            ),
                            historicalRecords: data.profit || [],
                            forecast: profitFinal,
                        },
                        cashFlow: {
                            historicalData: (data.cashFlow || []).map(
                                (d) => d?.value ?? 0
                            ),
                            historicalRecords: data.cashFlow || [],
                            forecast: cashFlowFinal,
                        },
                        inventory: {
                            historicalData: (data.inventory || []).map(
                                (d) => d?.value ?? 0
                            ),
                            historicalRecords: data.inventory || [],
                            forecast: inventoryResult,
                        },
                    },
                    { now: safeNow, traceId: tid }
                );
            } catch (err) {
                this.logger.warn(
                    '[ForecastOrchestrator] Confidence engine failed',
                    { traceId: tid, error: err.message }
                );
                confidenceResults = Object.freeze({ available: false });
            }

            // ── 10. Risk detection ──────────────────────────────────────────
            const grossMargin =
                baseForecast.revenue > 0
                    ? ((baseForecast.revenue - baseForecast.cogs) /
                          baseForecast.revenue) *
                      100
                    : 0;
            const netMargin =
                baseForecast.revenue > 0
                    ? (baseForecast.profit / baseForecast.revenue) * 100
                    : 0;

            let riskResults = null;
            try {
                riskResults = this.riskDetector.detect({
                    forecasts: {
                        revenue: revenueResult,
                        profit: profitFinal,
                        cashFlow: cashFlowFinal,
                        inventory: {
                            ...inventoryResult,
                            safetyStock: data.safetyStock,
                            reorderLevel: data.reorderLevel,
                        },
                        receivables: receivablesResult,
                        expenses: expenseResult,
                        grossMargin: { forecast: grossMargin },
                        netMargin: { forecast: netMargin },
                    },
                    historicalData: {
                        revenue: data.currentRevenue || 0,
                        cash: data.openingCash || 0,
                        receivables: data.currentReceivables || 0,
                        expenses: data.currentExpenses || 0,
                        grossMargin: data.currentGrossMargin || 0,
                        netMargin: data.currentNetMargin || 0,
                        inventory: {
                            safetyStock: data.safetyStock,
                            reorderLevel: data.reorderLevel,
                        },
                    },
                    traceId: tid,
                });
            } catch (err) {
                this.logger.warn(
                    '[ForecastOrchestrator] Risk detector failed',
                    { traceId: tid, error: err.message }
                );
                riskResults = Object.freeze({
                    risks: [],
                    overallSeverity: 'UNKNOWN',
                });
            }

            // ── 11. Assemble final payload ──────────────────────────────────
            const durationMs =
                (typeof performance !== 'undefined' && performance.now
                    ? performance.now()
                    : Date.now()) - started;

            const payload = {
                generatedAt: safeNow.toISOString(),
                horizon,
                period,
                baseForecast: {
                    revenue: revenueResult,
                    salesVolume: salesVolumeResult,
                    cogs: cogsResult,
                    expenses: expenseResult,
                    profit: profitFinal,
                    cashFlow: cashFlowFinal,
                    receivables: receivablesResult,
                    payables: payablesResult,
                    inventory: inventoryResult,
                    demand: demandResult,
                },
                scenarios,
                whatIf: whatIfResult,
                confidence: confidenceResults,
                risks: riskResults,
                summary: this._generateExecutiveSummary({
                    revenueResult,
                    profitResult: profitFinal,
                    cashFlowResult: cashFlowFinal,
                    riskResults,
                    confidenceResults,
                }),
                metadata: {
                    orchestratorVersion: F.VERSION,
                    traceId: tid,
                    requestId: tid,
                    userId,
                    businessId,
                    horizon,
                    period,
                    dataPoints: {
                        revenue: (data.revenue || []).length,
                        profit: (data.profit || []).length,
                        cashFlow: (data.cashFlow || []).length,
                        inventory: (data.inventory || []).length,
                    },
                    warnings: this._collectWarnings({
                        revenueResult,
                        profitFinal,
                        cashFlowFinal,
                        independentResults,
                        dependentResults,
                    }),
                    durationMs: Math.round(durationMs * 100) / 100,
                    partialSuccess:
                        independentResults.some(
                            (r) => r.status === 'rejected'
                        ) ||
                        dependentResults.some((r) => r.status === 'rejected'),
                },
            };

            this.logger.info('[ForecastOrchestrator] generate completed', {
                traceId: tid,
                durationMs: payload.metadata.durationMs,
                horizon,
                partialSuccess: payload.metadata.partialSuccess,
            });

            return this._freeze(payload, 0);
        } catch (e) {
            this.logger.error('[ForecastOrchestrator] generate failed', {
                traceId: tid,
                error: e.message,
                stack: e.stack,
            });
            return this._freeze(
                this._errorPackage(
                    'ORCHESTRATION_ERROR',
                    safeNow,
                    tid,
                    e.message
                )
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Safe wrapper around any forecast calculator.
     * Never throws; returns EMPTY_FORECAST on failure.
     */
    async _safeForecast(calculator, params, metricName) {
        try {
            if (!calculator || typeof calculator.forecast !== 'function') {
                this.logger.warn(
                    `[ForecastOrchestrator] Missing calculator for ${metricName}`,
                    { traceId: params.traceId }
                );
                return ForecastOrchestrator.EMPTY_FORECAST;
            }
            const result = await calculator.forecast(params);
            return result && typeof result === 'object'
                ? result
                : ForecastOrchestrator.EMPTY_FORECAST;
        } catch (err) {
            this.logger.warn(
                `[ForecastOrchestrator] ${metricName} forecast failed`,
                {
                    traceId: params.traceId,
                    error: err.message,
                }
            );
            return {
                ...ForecastOrchestrator.EMPTY_FORECAST,
                reason: `CALCULATOR_ERROR:${metricName}`,
            };
        }
    }

    _collectWarnings({
        revenueResult,
        profitFinal,
        cashFlowFinal,
        independentResults = [],
        dependentResults = [],
    }) {
        const warnings = [];

        if (!revenueResult?.available)
            warnings.push('revenue: INSUFFICIENT_DATA');
        if (!profitFinal?.available)
            warnings.push('profit: INSUFFICIENT_DATA');
        if (!cashFlowFinal?.available)
            warnings.push('cashFlow: INSUFFICIENT_DATA');

        [...independentResults, ...dependentResults].forEach((r, idx) => {
            if (r.status === 'rejected') {
                warnings.push(`metric_${idx}: REJECTED`);
            }
        });

        return warnings.length > 0 ? Object.freeze(warnings) : undefined;
    }

    _generateExecutiveSummary({
        revenueResult,
        profitResult,
        cashFlowResult,
        riskResults,
        confidenceResults,
    }) {
        const revenueForecast = revenueResult?.forecast ?? 0;
        const profitForecast = profitResult?.forecast ?? 0;
        const cashFlowForecast = cashFlowResult?.forecast ?? 0;

        const revenueConfidence =
            confidenceResults?.results?.revenue?.score ?? 0;
        const profitConfidence =
            confidenceResults?.results?.profit?.score ?? 0;
        const cashConfidence =
            confidenceResults?.results?.cashFlow?.score ?? 0;

        const risks = riskResults?.risks || [];
        const criticalRisks = risks.filter((r) => r.severity === 'CRITICAL');
        const highRisks = risks.filter((r) => r.severity === 'HIGH');

        return this._freeze(
            {
                revenue: {
                    forecast: revenueForecast,
                    confidence: revenueConfidence,
                },
                profit: {
                    forecast: profitForecast,
                    confidence: profitConfidence,
                },
                cashFlow: {
                    forecast: cashFlowForecast,
                    confidence: cashConfidence,
                },
                risks: {
                    critical: criticalRisks.length,
                    high: highRisks.length,
                    total: risks.length,
                    overallSeverity: riskResults?.overallSeverity || 'LOW',
                },
                status: this._determineOverallStatus({
                    profitForecast,
                    cashFlowForecast,
                    criticalRisks,
                    highRisks,
                }),
            },
            0
        );
    }

    _determineOverallStatus({
        profitForecast,
        cashFlowForecast,
        criticalRisks,
        highRisks,
    }) {
        if (criticalRisks.length > 0) return 'CRITICAL';
        if (profitForecast < 0) return 'WARNING';
        if (cashFlowForecast < 0) return 'WARNING';
        if (highRisks.length > 2) return 'WARNING';
        if (profitForecast > 0 && cashFlowForecast > 0) return 'POSITIVE';
        return 'NEUTRAL';
    }

    _buildPeriod(horizon, now) {
        const F = this.LIMITS;
        const days = F.HORIZON_DAYS[horizon] || 30;
        const start = new Date(now);
        const end = new Date(now);
        end.setDate(end.getDate() + days);

        return Object.freeze({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            label: F.LABELS[horizon] || '30 Days',
            horizon,
            days,
        });
    }

    /**
     * Placeholder for real data hydration.
     * In production this should be replaced with parallel repository calls
     * + caching + circuit-breaker.
     */
    async _fetchHistoricalData(userId, businessId, traceId) {
        try {
            return {
                revenue: [],
                salesVolume: [],
                cogs: [],
                expenses: [],
                profit: [],
                cashFlow: [],
                receivables: [],
                payables: [],
                inventory: [],
                demand: [],
                payments: [],
                collections: [],
                supplierPayments: [],
                purchases: [],
                historical: [],
                openingCash: 0,
                currentReceivables: 0,
                currentPayables: 0,
                currentRevenue: 0,
                currentExpenses: 0,
                currentGrossMargin: 0,
                currentNetMargin: 0,
                otherIncome: 0,
                safetyStock: null,
                reorderLevel: null,
            };
        } catch (e) {
            this.logger.error(
                '[ForecastOrchestrator] _fetchHistoricalData failed',
                { traceId, error: e.message }
            );
            throw e;
        }
    }

    _errorPackage(reason, now, traceId, message = null) {
        return {
            generatedAt: now.toISOString(),
            error: reason,
            message,
            metadata: {
                orchestratorVersion: this.LIMITS.VERSION,
                traceId,
                requestId: traceId,
            },
        };
    }

    /**
     * Production-grade BFS freeze.
     * - Depth-limited
     * - Large arrays are sealed (not deep-frozen) to protect memory
     * - Idempotent
     */
    _freeze(root, depth = 0) {
        const F = this.LIMITS;
        if (
            root === null ||
            typeof root !== 'object' ||
            Object.isFrozen(root)
        ) {
            return root;
        }
        if (depth > F.FREEZE_DEPTH_LIMIT) {
            return Object.seal(root);
        }

        const queue = [[root, depth]];

        while (queue.length > 0) {
            const [current, d] = queue.shift();

            if (
                current === null ||
                typeof current !== 'object' ||
                Object.isFrozen(current)
            ) {
                continue;
            }

            if (
                Array.isArray(current) &&
                current.length > F.MAX_ARRAY_FREEZE_SIZE
            ) {
                Object.seal(current);
                continue;
            }

            if (d >= F.FREEZE_DEPTH_LIMIT && Array.isArray(current)) {
                Object.seal(current);
                continue;
            }

            Object.freeze(current);

            for (const key of Object.keys(current)) {
                const val = current[key];
                if (val && typeof val === 'object' && !Object.isFrozen(val)) {
                    queue.push([val, d + 1]);
                }
            }
        }

        return root;
    }

    _traceId(now) {
        const t = (
            now instanceof Date ? now.getTime() : Date.now()
        ).toString(36);
        return `orch_${t}_${Math.random().toString(36).slice(2, 8)}`;
    }

    _safeArray(arr) {
        return Array.isArray(arr) ? arr : [];
    }
}

module.exports = ForecastOrchestrator;