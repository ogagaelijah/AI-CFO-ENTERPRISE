// src/application/services/analytics/snapshots/AnalyticsSnapshotService.js

class AnalyticsSnapshotService {
    constructor({ kpiEngine, ratioEngine, comparisonEngine, trendEngine, concentrationEngine, performanceEngine, healthScoreEngine }) {
        this.kpiEngine = kpiEngine;
        this.ratioEngine = ratioEngine;
        this.comparisonEngine = comparisonEngine;
        this.trendEngine = trendEngine;
        this.concentrationEngine = concentrationEngine;
        this.performanceEngine = performanceEngine;
        this.healthScoreEngine = healthScoreEngine;
    }

    _safeNumber(val) { const num = Number(val); return isNaN(num)? 0 : num; }

    async _safeCall(fn, fallback = {}) {
        try { return await fn(); }
        catch (err) {
            console.error('[AnalyticsSnapshotService] Segment call failed:', err.message);
            return fallback;
        }
    }

    async generate({ userId, businessId, period = null, startDate = null, endDate = null, periodType = 'monthly', snapshotType = 'FULL', includeTrends = true, includeConcentration = true }) {
        const resolvedPeriod = period || {
            startDate: startDate,
            endDate: endDate,
            label: `Custom Period (${startDate} - ${endDate})`,
            type: periodType
        };

        if (!resolvedPeriod.startDate ||!resolvedPeriod.endDate) {
            throw new Error('AnalyticsSnapshotService: Start and end period bounds must be configured');
        }

        // ✅ PROD: Guard health engine in case DI fails
        const healthCall = this.healthScoreEngine
           ? () => this.healthScoreEngine.calculate({ userId, businessId, period: resolvedPeriod })
            : () => Promise.resolve({ overallScore: 50, overallStatus: 'NEUTRAL', components: {} });

        const [kpis, ratios, comparisons, trends, concentration, performance, health] = await Promise.all([
            this._safeCall(() => this.kpiEngine.calculate({ userId, businessId, period: resolvedPeriod })),
            this._safeCall(() => this.ratioEngine.calculate({ userId, businessId, period: resolvedPeriod })),
            this._safeCall(() => this.comparisonEngine.calculate({ userId, businessId, period: resolvedPeriod })),
            includeTrends? this._safeCall(() => this.trendEngine.calculate({ userId, businessId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate, interval: resolvedPeriod.type, metrics: ['revenue', 'expenses', 'profit'] })) : Promise.resolve({}),
            includeConcentration? this._safeCall(() => this.concentrationEngine.calculate({ userId, businessId, startDate: resolvedPeriod.startDate, endDate: resolvedPeriod.endDate })) : Promise.resolve({}),
            this._safeCall(() => this.performanceEngine.calculate({ userId, businessId, period: resolvedPeriod })),
            this._safeCall(healthCall)
        ]);

        const kpiSource = kpis?.kpis || kpis || {};
        const revValue = this._safeNumber(kpiSource.revenue?.value?? kpiSource.revenue?? 0);
        const growthValue = this._safeNumber(kpiSource.revenueGrowth?.value?? kpiSource.revenueGrowth?? 0);
        const marginValue = this._safeNumber(kpiSource.grossMargin?.value?? kpiSource.grossMargin?? 0);

        const healthScore = this._safeNumber(health?.overallScore?? health?.summary?.overallScore?? 0);
        const healthStatus = health?.overallStatus || health?.summary?.overallStatus || 'NEUTRAL';

        const signalsList = health?.signals || performance?.signals || { positives: [], warnings: [], criticals: [] };

        return {
            userId,
            businessId,
            generatedAt: new Date().toISOString(),
            source: 'AnalyticsSnapshotService',
            version: '1.0.0',
            snapshotType,
            period: {
                start: resolvedPeriod.startDate,
                end: resolvedPeriod.endDate,
                label: resolvedPeriod.label || resolvedPeriod.type,
                type: resolvedPeriod.type
            },
            summary: { revenue: revValue, revenueGrowth: growthValue, grossMargin: marginValue, healthScore, healthStatus },
            signals: signalsList,
            kpis: kpiSource,
            ratios,
            comparisons,
            trends,
            concentration,
            performance,
            health
        };
    }

    async generateExecutive({ userId, businessId, period }) {
        const fullSnapshot = await this.generate({ userId, businessId, period, snapshotType: 'EXECUTIVE', includeTrends: false, includeConcentration: false });

        // ✅ PROD FIX: Deep clone to avoid mutating cache
        const executiveSnapshot = JSON.parse(JSON.stringify(fullSnapshot));

        executiveSnapshot.kpis = {
            revenue: fullSnapshot.kpis.revenue,
            revenueGrowth: fullSnapshot.kpis.revenueGrowth,
            grossProfit: fullSnapshot.kpis.grossProfit,
            netMargin: fullSnapshot.kpis.netMargin,
            netCashFlow: fullSnapshot.kpis.netCashFlow
        };

        return executiveSnapshot;
    }
}

module.exports = AnalyticsSnapshotService;