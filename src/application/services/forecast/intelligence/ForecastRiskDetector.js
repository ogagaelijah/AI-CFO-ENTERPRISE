// src/application/services/forecast/intelligence/ForecastRiskDetector.js
// SSOT v5.4.4-prod | Deterministic, Audited, Clamped, Zero-crash

/**
 * ForecastRiskDetector — risks across forecast metrics.
 * SSOT: Derives from Core Forecast + historical levels. No core recalculation.
 *
 * Scale: pure CPU, stateless, concurrent-safe, capped, frozen output.
 *
 * Inventory rule: only evaluate when forecasts.inventory is an object.
 * Missing inventory ≠ depleted stock.
 *
 * Overall severity: highest severity present among detected risks
 * (one CRITICAL → overall CRITICAL).
 */
class ForecastRiskDetector {
    static LIMITS = Object.freeze({
        VERSION: '5.4.4-prod',
        DEFAULT_CURRENCY: '₦',
        SEVERITY_WEIGHTS: Object.freeze({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }),
        DEFAULT_THRESHOLDS: Object.freeze({
            revenueDecline: 0.15,
            marginCompression: 0.20,
            cashDecline: 0.30,
            receivableGrowth: 0.30,
            expenseAcceleration: 0.15,
            inventorySafetyBuffer: 10,
            inventoryReorderBuffer: 20,
        }),
        CLAMPS: Object.freeze({
            THRESHOLD_MIN: 0.01,
            THRESHOLD_MAX: 0.99,
        }),
        MAX_CUSTOM_THRESHOLDS: 20,
    });

    static NOOP_LOGGER = Object.freeze({
        warn: () => {},
        info: () => {},
        error: () => {},
        debug: () => {},
    });

    /**
     * @param {{ logger?: object, currencySymbol?: string }} [opts]
     */
    constructor({
        logger,
        currencySymbol = ForecastRiskDetector.LIMITS.DEFAULT_CURRENCY,
    } = {}) {
        this.logger = logger && typeof logger.warn === 'function'
            ? logger
            : ForecastRiskDetector.NOOP_LOGGER;
        this.currency = currencySymbol || ForecastRiskDetector.LIMITS.DEFAULT_CURRENCY;
    }

    /**
     * @param {object} params
     * @param {object} [params.forecasts]
     * @param {object} [params.historicalData]
     * @param {object} [params.thresholds]
     * @param {Date}   [params.now]
     * @param {string} [params.requestId]
     * @param {string} [params.correlationId]
     */
    detect({
        forecasts = {},
        historicalData = {},
        thresholds = {},
        now = new Date(),
        requestId = null,
        correlationId = null,
    } = {}) {
        const started =
            typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now();
        const traceId = requestId || correlationId || this._traceId(now);
        const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
        const detectedAt = safeNow.toISOString();

        if (!forecasts || typeof forecasts !== 'object') {
            this.logger.warn('[ForecastRiskDetector] Invalid forecasts', { traceId });
            return this._freeze(this._emptyResult(safeNow, traceId, started));
        }

        const hist = historicalData && typeof historicalData === 'object' ? historicalData : {};
        const activeThresholds = this._mergeAndClampThresholds(thresholds);

        const risks = [
            this._detectRevenueDecline(forecasts, hist, activeThresholds, detectedAt),
            this._detectMarginCompression(forecasts, hist, activeThresholds, detectedAt),
            this._detectCashPressure(forecasts, hist, activeThresholds, detectedAt),
            this._detectInventoryShortage(forecasts, hist, activeThresholds, detectedAt),
            this._detectReceivablePressure(forecasts, hist, activeThresholds, detectedAt),
            this._detectExpenseAcceleration(forecasts, hist, activeThresholds, detectedAt),
        ].filter(Boolean);

        const criticalCount = risks.filter(r => r.severity === 'CRITICAL').length;
        const highCount = risks.filter(r => r.severity === 'HIGH').length;
        const mediumCount = risks.filter(r => r.severity === 'MEDIUM').length;
        const lowCount = risks.filter(r => r.severity === 'LOW').length;

        // Highest severity wins (one CRITICAL → overall CRITICAL)
        const overallSeverity =
            criticalCount > 0 ? 'CRITICAL' :
            highCount > 0 ? 'HIGH' :
            mediumCount > 0 ? 'MEDIUM' :
            lowCount > 0 ? 'LOW' : 'LOW';

        const durationMs =
            (typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now()) - started;

        return this._freeze({
            risks,
            overallSeverity,
            summary: this._generateSummary(risks, overallSeverity),
            counts: {
                critical: criticalCount,
                high: highCount,
                medium: mediumCount,
                low: lowCount,
                total: risks.length,
            },
            metadata: {
                generatedAt: detectedAt,
                riskDetectorVersion: ForecastRiskDetector.LIMITS.VERSION,
                traceId,
                requestId: traceId,
                thresholdsApplied: activeThresholds,
                baseSnapshot: this._snapshotInputs(forecasts, hist),
                durationMs: Math.round(durationMs * 1000) / 1000,
            },
        });
    }

    _detectRevenueDecline(forecasts, historicalData, thresholds, detectedAt) {
        if (forecasts.revenue == null || typeof forecasts.revenue !== 'object') return null;

        const forecastValue = this._safeNumber(forecasts.revenue.forecast);
        const currentRevenue = this._safeNumber(historicalData.revenue);
        if (currentRevenue <= 0 || forecastValue < 0) return null;

        const declinePct = (currentRevenue - forecastValue) / currentRevenue;
        if (declinePct <= thresholds.revenueDecline) return null;

        const severity = declinePct > 0.30 ? 'CRITICAL' : declinePct > 0.20 ? 'HIGH' : 'MEDIUM';
        return this._buildRisk({
            metric: 'revenue',
            displayName: 'Revenue',
            type: 'REVENUE_DECLINE',
            severity,
            description: `Revenue forecasted to decline by ${(declinePct * 100).toFixed(1)}%`,
            trigger: `Current: ${this.currency}${Math.round(currentRevenue).toLocaleString()}, Forecast: ${this.currency}${Math.round(forecastValue).toLocaleString()}`,
            action: severity === 'CRITICAL'
                ? 'Immediate revenue review and sales intervention required'
                : 'Monitor sales pipeline and conversion rates',
            impact: currentRevenue - forecastValue,
            impactPct: declinePct,
            detectedAt,
        });
    }

    _detectMarginCompression(forecasts, historicalData, thresholds, detectedAt) {
        const hasGross = forecasts.grossMargin != null && typeof forecasts.grossMargin === 'object';
        const hasNet = forecasts.netMargin != null && typeof forecasts.netMargin === 'object';
        if (!hasGross && !hasNet) return null;

        const forecastValue = this._safeNumber(
            forecasts.grossMargin?.forecast ?? forecasts.netMargin?.forecast
        );
        const currentMargin = this._safeNumber(
            historicalData.grossMargin ?? historicalData.netMargin
        );
        if (currentMargin <= 0) return null;

        const compressionPct = (currentMargin - forecastValue) / currentMargin;
        if (compressionPct <= thresholds.marginCompression) return null;

        const severity = compressionPct > 0.30 ? 'CRITICAL' : compressionPct > 0.20 ? 'HIGH' : 'MEDIUM';
        return this._buildRisk({
            metric: 'margin',
            displayName: 'Profit Margin',
            type: 'MARGIN_COMPRESSION',
            severity,
            description: `Profit margin forecasted to compress by ${(compressionPct * 100).toFixed(1)}%`,
            trigger: `Current: ${currentMargin.toFixed(1)}%, Forecast: ${forecastValue.toFixed(1)}%`,
            action: severity === 'CRITICAL'
                ? 'Immediate pricing and COGS review required'
                : 'Review pricing strategy and cost drivers',
            impact: compressionPct,
            impactPct: compressionPct,
            detectedAt,
        });
    }

    _detectCashPressure(forecasts, historicalData, thresholds, detectedAt) {
        if (forecasts.cashFlow == null || typeof forecasts.cashFlow !== 'object') return null;

        const forecastValue = this._safeNumber(forecasts.cashFlow.forecast);
        const currentCash = this._safeNumber(historicalData.cash ?? historicalData.cashFlow);

        if (forecastValue < 0) {
            return this._buildRisk({
                metric: 'cashFlow',
                displayName: 'Cash Flow',
                type: 'CASH_PRESSURE',
                severity: 'CRITICAL',
                description: `Negative cash flow forecasted: ${this.currency}${Math.round(Math.abs(forecastValue)).toLocaleString()}`,
                trigger: `Forecast: ${this.currency}${Math.round(forecastValue).toLocaleString()}`,
                action: 'Immediate cash flow review, expense reduction, and financing options required',
                impact: Math.abs(forecastValue),
                impactPct: 1,
                detectedAt,
            });
        }

        if (currentCash > 0) {
            const declinePct = (currentCash - forecastValue) / currentCash;
            if (declinePct > thresholds.cashDecline) {
                const severity = declinePct > 0.50 ? 'CRITICAL' : declinePct > 0.30 ? 'HIGH' : 'MEDIUM';
                return this._buildRisk({
                    metric: 'cashFlow',
                    displayName: 'Cash Flow',
                    type: 'CASH_PRESSURE',
                    severity,
                    description: `Cash flow forecasted to decline by ${(declinePct * 100).toFixed(1)}%`,
                    trigger: `Current: ${this.currency}${Math.round(currentCash).toLocaleString()}, Forecast: ${this.currency}${Math.round(forecastValue).toLocaleString()}`,
                    action: severity === 'CRITICAL'
                        ? 'Immediate cash management and collections required'
                        : 'Monitor cash position and AR',
                    impact: currentCash - forecastValue,
                    impactPct: declinePct,
                    detectedAt,
                });
            }
        }
        return null;
    }

    _detectInventoryShortage(forecasts, historicalData, thresholds, detectedAt) {
        if (forecasts.inventory == null || typeof forecasts.inventory !== 'object') {
            return null;
        }

        const forecastValue = this._safeNumber(forecasts.inventory.forecast);
        const safetyStock =
            this._safeNumber(forecasts.inventory.safetyStock) || thresholds.inventorySafetyBuffer;
        const reorderLevel =
            this._safeNumber(forecasts.inventory.reorderLevel) || thresholds.inventoryReorderBuffer;

        if (forecastValue <= 0) {
            return this._buildRisk({
                metric: 'inventory',
                displayName: 'Inventory',
                type: 'INVENTORY_SHORTAGE',
                severity: 'CRITICAL',
                description: 'Inventory forecasted to be depleted',
                trigger: `Stock: ${Math.round(forecastValue)} units`,
                action: 'Place immediate emergency reorder with expedited shipping',
                impact: Math.abs(forecastValue),
                impactPct: 1,
                detectedAt,
            });
        }
        if (forecastValue <= safetyStock) {
            return this._buildRisk({
                metric: 'inventory',
                displayName: 'Inventory',
                type: 'INVENTORY_SHORTAGE',
                severity: 'HIGH',
                description: `Inventory forecasted below safety stock (${Math.round(safetyStock)} units)`,
                trigger: `Stock: ${Math.round(forecastValue)} units`,
                action: 'Place reorder immediately to avoid stockout',
                impact: safetyStock - forecastValue,
                impactPct: safetyStock > 0 ? (safetyStock - forecastValue) / safetyStock : 1,
                detectedAt,
            });
        }
        if (forecastValue <= reorderLevel) {
            return this._buildRisk({
                metric: 'inventory',
                displayName: 'Inventory',
                type: 'INVENTORY_SHORTAGE',
                severity: 'MEDIUM',
                description: `Inventory forecasted below reorder level (${Math.round(reorderLevel)} units)`,
                trigger: `Stock: ${Math.round(forecastValue)} units`,
                action: 'Place reorder within 7 days',
                impact: reorderLevel - forecastValue,
                impactPct: reorderLevel > 0 ? (reorderLevel - forecastValue) / reorderLevel : 1,
                detectedAt,
            });
        }
        return null;
    }

    _detectReceivablePressure(forecasts, historicalData, thresholds, detectedAt) {
        if (forecasts.receivables == null || typeof forecasts.receivables !== 'object') return null;

        const forecastValue = this._safeNumber(forecasts.receivables.forecast);
        const currentAR = this._safeNumber(historicalData.receivables ?? historicalData.ar);
        if (currentAR <= 0 || forecastValue <= 0) return null;

        const growthPct = (forecastValue - currentAR) / currentAR;
        if (growthPct <= thresholds.receivableGrowth) return null;

        const severity = growthPct > 0.60 ? 'CRITICAL' : growthPct > 0.40 ? 'HIGH' : 'MEDIUM';
        return this._buildRisk({
            metric: 'receivables',
            displayName: 'Accounts Receivable',
            type: 'RECEIVABLE_PRESSURE',
            severity,
            description: `Receivables forecasted to grow by ${(growthPct * 100).toFixed(1)}%`,
            trigger: `Current: ${this.currency}${Math.round(currentAR).toLocaleString()}, Forecast: ${this.currency}${Math.round(forecastValue).toLocaleString()}`,
            action: severity === 'CRITICAL'
                ? 'Immediate collection effort and credit hold review required'
                : 'Review credit terms and DSO',
            impact: forecastValue - currentAR,
            impactPct: growthPct,
            detectedAt,
        });
    }

    _detectExpenseAcceleration(forecasts, historicalData, thresholds, detectedAt) {
        if (forecasts.expenses == null || typeof forecasts.expenses !== 'object') return null;

        const forecastValue = this._safeNumber(forecasts.expenses.forecast);
        const currentExpenses = this._safeNumber(historicalData.expenses);
        const revenueTrend = this._safeNumber(historicalData.revenueTrend);
        if (currentExpenses <= 0 || forecastValue <= 0) return null;

        const growthPct = (forecastValue - currentExpenses) / currentExpenses;
        if (growthPct <= thresholds.expenseAcceleration) return null;

        let description = `Expenses forecasted to grow by ${(growthPct * 100).toFixed(1)}%`;
        let severity = growthPct > 0.40 ? 'HIGH' : growthPct > 0.25 ? 'MEDIUM' : 'LOW';

        if (revenueTrend > 0 && growthPct > revenueTrend * 1.5) {
            description += ` (expenses growing ${(growthPct / revenueTrend).toFixed(1)}x faster than revenue)`;
            if (severity === 'LOW') severity = 'MEDIUM';
        }

        return this._buildRisk({
            metric: 'expenses',
            displayName: 'Operating Expenses',
            type: 'EXPENSE_ACCELERATION',
            severity,
            description,
            trigger: `Current: ${this.currency}${Math.round(currentExpenses).toLocaleString()}, Forecast: ${this.currency}${Math.round(forecastValue).toLocaleString()}`,
            action: severity === 'HIGH'
                ? 'Immediate expense category review required'
                : 'Monitor expense categories vs revenue',
            impact: forecastValue - currentExpenses,
            impactPct: growthPct,
            detectedAt,
        });
    }

    _buildRisk({
        metric, displayName, type, severity, description, trigger, action, impact, impactPct, detectedAt,
    }) {
        return {
            id: `${type}_${detectedAt}`,
            metric,
            displayName,
            type,
            severity,
            description,
            trigger,
            action,
            impact: this._safeNumber(impact),
            impactPct: this._clamp(impactPct, 0, 1),
            detectedAt,
        };
    }

    _generateSummary(risks, overallSeverity) {
        if (risks.length === 0) return 'No significant risks detected';
        const counts = risks.reduce((acc, r) => {
            acc[r.severity] = (acc[r.severity] || 0) + 1;
            return acc;
        }, {});
        const parts = Object.entries(counts).map(([sev, count]) => `${count} ${sev.toLowerCase()}`);
        const riskTypes = [...new Set(risks.map(r => r.type))].join(', ');
        return `Overall risk: ${overallSeverity} — ${parts.join(', ')}. Key areas: ${riskTypes}`;
    }

    _mergeAndClampThresholds(overrides) {
        const F = ForecastRiskDetector.LIMITS;
        const o = overrides && typeof overrides === 'object' ? overrides : {};
        const merged = { ...F.DEFAULT_THRESHOLDS, ...o };

        return {
            revenueDecline: this._clamp(merged.revenueDecline, F.CLAMPS.THRESHOLD_MIN, F.CLAMPS.THRESHOLD_MAX),
            marginCompression: this._clamp(merged.marginCompression, F.CLAMPS.THRESHOLD_MIN, F.CLAMPS.THRESHOLD_MAX),
            cashDecline: this._clamp(merged.cashDecline, F.CLAMPS.THRESHOLD_MIN, F.CLAMPS.THRESHOLD_MAX),
            receivableGrowth: this._clamp(merged.receivableGrowth, F.CLAMPS.THRESHOLD_MIN, F.CLAMPS.THRESHOLD_MAX),
            expenseAcceleration: this._clamp(merged.expenseAcceleration, F.CLAMPS.THRESHOLD_MIN, F.CLAMPS.THRESHOLD_MAX),
            inventorySafetyBuffer: Math.max(0, this._safeNumber(merged.inventorySafetyBuffer)),
            inventoryReorderBuffer: Math.max(0, this._safeNumber(merged.inventoryReorderBuffer)),
        };
    }

    _snapshotInputs(forecasts, historicalData) {
        return {
            revenue: this._safeNumber(forecasts.revenue?.forecast),
            margin: this._safeNumber(forecasts.grossMargin?.forecast ?? forecasts.netMargin?.forecast),
            cashFlow: this._safeNumber(forecasts.cashFlow?.forecast),
            inventory: forecasts.inventory != null
                ? this._safeNumber(forecasts.inventory?.forecast)
                : null,
            historicalKeys: Object.keys(historicalData || {}).length,
        };
    }

    _emptyResult(now, traceId, started) {
        const durationMs =
            (typeof performance !== 'undefined' && performance.now
                ? performance.now()
                : Date.now()) - (started || Date.now());
        return {
            risks: [],
            overallSeverity: 'LOW',
            summary: 'No analysis — invalid forecasts input',
            counts: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
            metadata: {
                generatedAt: now.toISOString(),
                riskDetectorVersion: ForecastRiskDetector.LIMITS.VERSION,
                traceId,
                requestId: traceId,
                thresholdsApplied: null,
                baseSnapshot: null,
                durationMs: Math.round(durationMs * 1000) / 1000,
                error: 'INVALID_FORECASTS',
            },
        };
    }

    _freeze(obj) {
        if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
        Object.freeze(obj);
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val && typeof val === 'object') this._freeze(val);
        }
        return obj;
    }

    _traceId(now) {
        const t = (now instanceof Date ? now.getTime() : Date.now()).toString(36);
        const r = Math.random().toString(36).slice(2, 10);
        return `risk_${t}_${r}`;
    }

    _clamp(val, min, max) {
        return Math.max(min, Math.min(max, this._safeNumber(val)));
    }

    _safeNumber(val) {
        const num = Number(val);
        return Number.isFinite(num) ? num : 0;
    }
}

module.exports = ForecastRiskDetector;