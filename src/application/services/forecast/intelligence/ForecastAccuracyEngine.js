// src/application/services/forecast/intelligence/ForecastAccuracyEngine.js
// SSOT v5.4.4-prod | Deterministic, Audited, Capped, Zero-crash

/**
 * ForecastAccuracyEngine — forecast vs actual performance.
 *
 * SSOT: Aggregates derive only from the capped in-memory ring per metric.
 * Scale: Per-metric ring (O(1) update), metric cap, frozen outputs, NOOP logger.
 *
 * NOTE: This is an in-process accuracy buffer. For multi-instance / durable
 * history, persist via exportState() / importState() or an external store.
 */
class ForecastAccuracyEngine {
    static LIMITS = Object.freeze({
        VERSION: '5.4.4-prod',
        MAX_HISTORY_PER_METRIC: 500,
        MAX_METRICS: 50,
        TREND_WINDOW: 10,
        MIN_HISTORY_FLOOR: 50,
        MAX_HISTORY_CEIL: 5000,
        ACCURACY_THRESHOLDS: Object.freeze({
            EXCELLENT: 5,
            GOOD: 15,
            FAIR: 30,
        }),
    });

    static NOOP_LOGGER = Object.freeze({
        warn: () => {},
        info: () => {},
        error: () => {},
        debug: () => {},
    });

    /**
     * @param {{ logger?: object, maxHistoryPerMetric?: number }} [opts]
     */
    constructor({
        logger,
        maxHistoryPerMetric = ForecastAccuracyEngine.LIMITS.MAX_HISTORY_PER_METRIC,
    } = {}) {
        this.logger = logger && typeof logger.warn === 'function'
            ? logger
            : ForecastAccuracyEngine.NOOP_LOGGER;

        const F = ForecastAccuracyEngine.LIMITS;
        this.maxHistoryPerMetric = Math.max(
            F.MIN_HISTORY_FLOOR,
            Math.min(F.MAX_HISTORY_CEIL, this._safeNumber(maxHistoryPerMetric) || F.MAX_HISTORY_PER_METRIC)
        );

        /** @type {Map<string, { ring: object[], sumAbs: number, sumPct: number, sumSigned: number, over: number, under: number, exact: number }>} */
        this._metrics = new Map();
    }

    /**
     * Record one forecast vs actual observation.
     * @param {object} params
     * @param {string} params.metric
     * @param {number} params.forecast
     * @param {number} params.actual
     * @param {string} [params.period]
     * @param {object} [params.metadata]
     * @param {Date}   [params.now]
     * @param {string} [params.traceId]
     * @param {string} [params.requestId]
     */
    record({
        metric,
        forecast,
        actual,
        period = null,
        metadata = {},
        now = new Date(),
        traceId = null,
        requestId = null,
    } = {}) {
        if (!metric || typeof metric !== 'string') {
            this.logger.warn('[ForecastAccuracyEngine] Invalid metric');
            return this._freeze(this._emptyRecord());
        }

        const f = this._safeNumber(forecast);
        const a = this._safeNumber(actual);
        const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
        const timestamp = safeNow.toISOString();
        const tid = requestId || traceId || this._traceId(safeNow);

        const absoluteError = Math.abs(f - a);
        const percentageError =
            f !== 0 ? (absoluteError / Math.abs(f)) * 100 : a === 0 ? 0 : 100;
        const direction = f > a ? 'OVER' : f < a ? 'UNDER' : 'EXACT';
        const signedError = direction === 'OVER' ? absoluteError : direction === 'UNDER' ? -absoluteError : 0;

        const entry = this._freeze({
            id: `${metric}_${timestamp}`,
            metric,
            period,
            forecast: f,
            actual: a,
            absoluteError: this._round2(absoluteError),
            percentageError: this._round2(percentageError),
            signedError: this._round2(signedError),
            direction,
            metadata: metadata && typeof metadata === 'object' ? { ...metadata } : {},
            timestamp,
            traceId: tid,
        });

        const state = this._ensureMetric(metric);
        if (!state) {
            return this._freeze({
                ...this._emptyRecord(),
                metric,
                status: 'METRIC_LIMIT',
                accuracy: 'N/A',
            });
        }

        // Ring: drop oldest and reverse its contribution (O(1))
        if (state.ring.length >= this.maxHistoryPerMetric) {
            const old = state.ring.shift();
            this._subtractEntry(state, old);
        }

        state.ring.push(entry);
        this._addEntry(state, entry);

        const view = this._metricView(metric, state);

        return this._freeze({
            metric,
            period,
            forecast: f,
            actual: a,
            absoluteError: entry.absoluteError,
            percentageError: entry.percentageError,
            direction,
            runningCumulativeError: view.cumulativeError,
            averageErrorOverTime: view.averageError,
            averagePercentageError: view.averagePercentageError,
            records: view.records,
            bias: view.bias,
            status: view.status,
            trend: view.trend,
            accuracy: view.accuracy,
            traceId: tid,
        });
    }

    getMetrics(metric) {
        if (!metric || typeof metric !== 'string') {
            return this._freeze(this._emptyMetrics('unknown'));
        }
        const state = this._metrics.get(metric);
        if (!state) return this._freeze(this._emptyMetrics(metric));
        return this._freeze(this._metricView(metric, state));
    }

    /**
     * @param {string|null} [metric]
     * @param {number} [limit=100]
     */
    getHistory(metric = null, limit = 100) {
        const cap = Math.max(1, Math.min(1000, this._safeNumber(limit) || 100));
        if (metric) {
            const state = this._metrics.get(metric);
            const ring = state ? state.ring : [];
            return this._freeze(ring.slice(-cap));
        }
        // Cross-metric: merge by timestamp (bounded)
        const all = [];
        for (const state of this._metrics.values()) {
            for (const r of state.ring) all.push(r);
        }
        all.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
        return this._freeze(all.slice(-cap));
    }

    /**
     * @param {{ now?: Date }} [opts]
     */
    getSummary({ now = new Date() } = {}) {
        const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
        const metrics = Array.from(this._metrics.keys());
        const results = {};
        let totalRecords = 0;
        let sumPct = 0;
        let scored = 0;

        for (const metric of metrics) {
            const view = this._metricView(metric, this._metrics.get(metric));
            totalRecords += view.records;
            results[metric] = {
                records: view.records,
                averageError: view.averageError,
                averagePercentageError: view.averagePercentageError,
                bias: view.bias,
                status: view.status,
                trend: view.trend,
                accuracy: view.accuracy,
            };
            if (view.records >= 1) {
                sumPct += view.averagePercentageError;
                scored += 1;
            }
        }

        const avgError = scored > 0 ? sumPct / scored : 0;

        return this._freeze({
            totalRecords,
            metricCount: metrics.length,
            metrics: results,
            bestMetric: this._findBestMetric(),
            worstMetric: this._findWorstMetric(),
            summary: `${totalRecords} records across ${metrics.length} metrics, avg error: ${avgError.toFixed(1)}%`,
            generatedAt: safeNow.toISOString(),
            engineVersion: ForecastAccuracyEngine.LIMITS.VERSION,
            maxHistoryPerMetric: this.maxHistoryPerMetric,
        });
    }

    clear() {
        this._metrics.clear();
    }

    /** Snapshot for persistence / warm start across processes */
    exportState() {
        const metrics = {};
        for (const [key, state] of this._metrics.entries()) {
            metrics[key] = {
                ring: state.ring.map(r => ({ ...r, metadata: { ...r.metadata } })),
                sumAbs: state.sumAbs,
                sumPct: state.sumPct,
                sumSigned: state.sumSigned,
                over: state.over,
                under: state.under,
                exact: state.exact,
            };
        }
        return this._freeze({
            version: ForecastAccuracyEngine.LIMITS.VERSION,
            maxHistoryPerMetric: this.maxHistoryPerMetric,
            metrics,
        });
    }

    /** Restore from exportState() */
    importState(snapshot) {
        if (!snapshot || typeof snapshot !== 'object' || !snapshot.metrics) {
            this.logger.warn('[ForecastAccuracyEngine] Invalid importState snapshot');
            return false;
        }
        this._metrics.clear();
        const entries = Object.entries(snapshot.metrics);
        for (let i = 0; i < entries.length && this._metrics.size < ForecastAccuracyEngine.LIMITS.MAX_METRICS; i++) {
            const [metric, data] = entries[i];
            if (!metric || !data || !Array.isArray(data.ring)) continue;
            const ring = data.ring
                .slice(-this.maxHistoryPerMetric)
                .map(r => this._freeze({ ...r, metadata: { ...(r.metadata || {}) } }));

            // Recompute aggregates from ring (source of truth)
            const state = {
                ring: [],
                sumAbs: 0,
                sumPct: 0,
                sumSigned: 0,
                over: 0,
                under: 0,
                exact: 0,
            };
            for (const entry of ring) {
                state.ring.push(entry);
                this._addEntry(state, entry);
            }
            this._metrics.set(metric, state);
        }
        return true;
    }

    // ── internals ──────────────────────────────────────────────

    _ensureMetric(metric) {
        if (this._metrics.has(metric)) return this._metrics.get(metric);
        if (this._metrics.size >= ForecastAccuracyEngine.LIMITS.MAX_METRICS) {
            this.logger.warn(
                `[ForecastAccuracyEngine] Max metrics ${ForecastAccuracyEngine.LIMITS.MAX_METRICS} reached`,
                { metric }
            );
            return null;
        }
        const state = {
            ring: [],
            sumAbs: 0,
            sumPct: 0,
            sumSigned: 0,
            over: 0,
            under: 0,
            exact: 0,
        };
        this._metrics.set(metric, state);
        return state;
    }

    _addEntry(state, entry) {
        state.sumAbs += entry.absoluteError;
        state.sumPct += entry.percentageError;
        state.sumSigned += entry.signedError;
        if (entry.direction === 'OVER') state.over += 1;
        else if (entry.direction === 'UNDER') state.under += 1;
        else state.exact += 1;
    }

    _subtractEntry(state, entry) {
        state.sumAbs = Math.max(0, state.sumAbs - entry.absoluteError);
        state.sumPct = Math.max(0, state.sumPct - entry.percentageError);
        state.sumSigned -= entry.signedError;
        if (entry.direction === 'OVER') state.over = Math.max(0, state.over - 1);
        else if (entry.direction === 'UNDER') state.under = Math.max(0, state.under - 1);
        else state.exact = Math.max(0, state.exact - 1);
    }

    _metricView(metric, state) {
        const records = state.ring.length;
        const averageError = records > 0 ? state.sumAbs / records : 0;
        const averagePercentageError = records > 0 ? state.sumPct / records : 0;
        const cumulativeError = state.sumSigned;
        const bias = records > 0 ? state.sumSigned / records : 0;
        const recent = state.ring.slice(-ForecastAccuracyEngine.LIMITS.TREND_WINDOW).map(r => r.percentageError);

        return {
            metric,
            records,
            totalError: this._round2(state.sumAbs),
            averageError: this._round2(averageError),
            averagePercentageError: this._round2(averagePercentageError),
            cumulativeError: this._round2(cumulativeError),
            bias: this._round2(bias),
            overCount: state.over,
            underCount: state.under,
            exactCount: state.exact,
            status: this._determineStatus(records, averagePercentageError),
            trend: this._detectTrend(recent),
            accuracy: this._accuracyGrade(averagePercentageError),
        };
    }

    _determineStatus(records, avgPct) {
        if (records < 3) return 'INSUFFICIENT_DATA';
        const T = ForecastAccuracyEngine.LIMITS.ACCURACY_THRESHOLDS;
        if (avgPct < T.EXCELLENT) return 'EXCELLENT';
        if (avgPct < T.GOOD) return 'GOOD';
        if (avgPct < T.FAIR) return 'FAIR';
        return 'POOR';
    }

    _detectTrend(recentErrors) {
        if (!recentErrors || recentErrors.length < 3) return 'STABLE';
        const n = recentErrors.length;
        const xMean = (n - 1) / 2;
        const yMean = recentErrors.reduce((a, b) => a + b, 0) / n;
        let num = 0;
        let den = 0;
        for (let i = 0; i < n; i++) {
            num += (i - xMean) * (recentErrors[i] - yMean);
            den += (i - xMean) * (i - xMean);
        }
        const slope = den === 0 ? 0 : num / den;
        if (slope < -0.5) return 'IMPROVING';
        if (slope > 0.5) return 'DECLINING';
        return 'STABLE';
    }

    _accuracyGrade(mape) {
        const T = ForecastAccuracyEngine.LIMITS.ACCURACY_THRESHOLDS;
        if (mape < T.EXCELLENT) return 'A';
        if (mape < T.GOOD) return 'B';
        if (mape < T.FAIR) return 'C';
        return 'D';
    }

    _findBestMetric() {
        let best = null;
        let bestScore = Infinity;
        for (const [metric, state] of this._metrics.entries()) {
            if (state.ring.length < 2) continue;
            const avg = state.sumPct / state.ring.length;
            if (avg < bestScore) {
                bestScore = avg;
                best = metric;
            }
        }
        return best;
    }

    _findWorstMetric() {
        let worst = null;
        let worstScore = -Infinity;
        for (const [metric, state] of this._metrics.entries()) {
            if (state.ring.length < 2) continue;
            const avg = state.sumPct / state.ring.length;
            if (avg > worstScore) {
                worstScore = avg;
                worst = metric;
            }
        }
        return worst;
    }

    _emptyMetrics(metric) {
        return {
            metric,
            records: 0,
            totalError: 0,
            averageError: 0,
            averagePercentageError: 0,
            cumulativeError: 0,
            bias: 0,
            overCount: 0,
            underCount: 0,
            exactCount: 0,
            status: 'INSUFFICIENT_DATA',
            trend: 'STABLE',
            accuracy: 'N/A',
        };
    }

    _emptyRecord() {
        return {
            metric: 'unknown',
            period: null,
            forecast: 0,
            actual: 0,
            absoluteError: 0,
            percentageError: 0,
            direction: 'EXACT',
            runningCumulativeError: 0,
            averageErrorOverTime: 0,
            averagePercentageError: 0,
            records: 0,
            bias: 0,
            status: 'ERROR',
            trend: 'STABLE',
            accuracy: 'N/A',
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
        return `acc_${t}_${Math.random().toString(36).slice(2, 8)}`;
    }

    _round2(n) {
        return Math.round(this._safeNumber(n) * 100) / 100;
    }

    _safeNumber(val) {
        const num = Number(val);
        return Number.isFinite(num) ? num : 0;
    }
}

module.exports = ForecastAccuracyEngine;