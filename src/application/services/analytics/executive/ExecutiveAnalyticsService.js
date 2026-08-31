// src/application/services/analytics/executive/ExecutiveAnalyticsService.js

class ExecutiveAnalyticsService {
    constructor({ kpiEngine, ratioEngine, comparisonEngine, trendEngine, concentrationEngine, performanceEngine, healthScoreEngine, snapshotService }) {
        this.kpiEngine = kpiEngine;
        this.ratioEngine = ratioEngine;
        this.comparisonEngine = comparisonEngine;
        this.trendEngine = trendEngine;
        this.concentrationEngine = concentrationEngine;
        this.performanceEngine = performanceEngine;
        this.healthScoreEngine = healthScoreEngine;
        this.snapshotService = snapshotService;
    }

    _safeNumber(val) { const num = Number(val); return isNaN(num) ? 0 : num; }
    _safeArray(arr) { return Array.isArray(arr) ? arr : []; } // ✅ MOVED UP

    async generate({ userId, businessId, period }) {
        if (!period) throw new Error('ExecutiveAnalyticsService: Period parameter context is required');

        // ✅ PROD: Guard if snapshotService not injected
        if (!this.snapshotService) {
            return this._getFallbackSnapshot(businessId, period);
        }

        const snapshot = await this.snapshotService.generate({
            userId,
            businessId,
            period,
            snapshotType: 'EXECUTIVE',
            includeTrends: true,
            includeConcentration: true
        });

        const kpis = snapshot?.kpis || {};
        const summary = snapshot?.summary || {};
        const perf = snapshot?.performance || {};
        const health = snapshot?.health || {};
        const signals = snapshot?.signals || { positives: [], warnings: [], criticals: [] };

        const keyMetrics = {
            revenue: this._safeNumber(kpis.revenue?.value ?? kpis.revenue ?? summary.revenue),
            revenueGrowth: this._safeNumber(kpis.revenueGrowth?.value ?? kpis.revenueGrowth ?? summary.revenueGrowth),
            netProfit: this._safeNumber(kpis.netProfit?.value ?? kpis.netProfit ?? summary.netProfit),
            netMargin: this._safeNumber(kpis.netMargin?.value ?? kpis.netMargin ?? summary.netMargin),
            netCashFlow: this._safeNumber(kpis.netCashFlow?.value ?? kpis.netCashFlow ?? summary.netCashFlow),
            grossMargin: this._safeNumber(kpis.grossMargin?.value ?? kpis.grossMargin ?? summary.grossMargin) // ✅ Added for VC
        };

        const performanceSummary = {
            score: perf?.scores?.overall?.score ?? perf?.overallScore ?? summary.performanceScore ?? 50,
            status: perf?.scores?.overall?.status ?? perf?.overallStatus ?? 'NEUTRAL',
            categories: perf?.scores?.categories || {},
            signals: perf?.signals || []
        };

        const healthSummary = {
            score: health?.overallScore ?? summary.healthScore ?? 50,
            status: health?.overallStatus ?? summary.healthStatus ?? 'NEUTRAL',
            components: health?.components || {},
            recommendations: health?.recommendations || []
        };

        const signalSummary = {
            positiveCount: this._safeArray(signals.positives).length,
            warningCount: this._safeArray(signals.warnings).length,
            criticalCount: this._safeArray(signals.criticals).length,
            allSignals: signals
        };

        const executiveSummary = {
            narrative: `Executive analysis for business ${businessId}. Financial health is ${healthSummary.status} at ${healthSummary.score}/100. Revenue: ${keyMetrics.revenue}. Net Margin: ${keyMetrics.netMargin}%. Cash Flow: ${keyMetrics.netCashFlow}. ${signalSummary.criticalCount > 0 ? 'Critical risks require immediate action.' : 'Operations stable.'}`,
            overallRiskLevel: snapshot?.concentration?.overallRiskLevel || snapshot?.concentration?.customers?.riskLevel || 'LOW'
        };

        return {
            businessId,
            period,
            generatedAt: snapshot.generatedAt || new Date().toISOString(),
            source: 'ExecutiveAnalyticsService',
            version: '1.0.0',
            keyMetrics,
            performanceSummary,
            healthSummary,
            signalSummary,
            executiveSummary
        };
    }

    // ✅ PROD: Fallback if snapshot service dies
    _getFallbackSnapshot(businessId, period) {
        return {
            businessId, period,
            generatedAt: new Date().toISOString(),
            source: 'ExecutiveAnalyticsService-Fallback',
            keyMetrics: { revenue: 0, revenueGrowth: 0, netProfit: 0, netMargin: 0, netCashFlow: 0, grossMargin: 0 },
            performanceSummary: { score: 50, status: 'NEUTRAL', categories: {}, signals: [] },
            healthSummary: { score: 50, status: 'NEUTRAL', components: {}, recommendations: [] },
            signalSummary: { positiveCount: 0, warningCount: 0, criticalCount: 0, allSignals: {} },
            executiveSummary: { narrative: 'System data temporarily unavailable. Using baseline metrics.', overallRiskLevel: 'UNKNOWN' }
        };
    }
}

module.exports = ExecutiveAnalyticsService;