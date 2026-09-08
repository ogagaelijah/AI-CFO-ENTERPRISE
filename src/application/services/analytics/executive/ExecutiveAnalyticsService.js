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

    _safeNumber(val) { 
        const num = Number(val); 
        return isNaN(num) ? 0 : num; 
    }
    
    _safeArray(arr) { 
        return Array.isArray(arr) ? arr : []; 
    }

    /**
     * Generate executive analytics
     * Consumes data from snapshotService (which gets data from transformer)
     * SSOT: All data comes from the transformer, NOT calculated here
     */
    async generate({ userId, businessId, period }) {
        if (!period) {
            throw new Error('ExecutiveAnalyticsService: Period parameter context is required');
        }

        // Try to get snapshot from service
        let snapshot = null;
        let source = 'ExecutiveAnalyticsService';
        
        try {
            if (this.snapshotService) {
                snapshot = await this.snapshotService.generate({
                    userId,
                    businessId,
                    period,
                    snapshotType: 'EXECUTIVE',
                    includeTrends: true,
                    includeConcentration: true
                });
                source = 'SnapshotService';
            }
        } catch (error) {
            console.error('⚠️ [ExecutiveAnalyticsService] Snapshot service error:', error.message);
        }

        // If no snapshot, use fallback with basic data
        if (!snapshot) {
            return this._getFallbackSnapshot(businessId, period);
        }

        // Extract data from snapshot (which comes from transformer)
        const kpis = snapshot.kpis || {};
        const summary = snapshot.summary || {};
        const perf = snapshot.performance || {};
        const health = snapshot.health || {};
        const concentration = snapshot.concentration || {};
        const signals = snapshot.signals || { positives: [], warnings: [], criticals: [] };

        // Extract key metrics - handle both object and primitive values
        const revenue = this._safeNumber(
            kpis.revenue?.value ?? 
            kpis.revenue ?? 
            summary.revenue ?? 
            0
        );

        const revenueGrowth = this._safeNumber(
            kpis.revenueGrowth?.value ?? 
            kpis.revenueGrowth ?? 
            summary.revenueGrowth ?? 
            0
        );

        const netProfit = this._safeNumber(
            kpis.netProfit?.value ?? 
            kpis.netProfit ?? 
            summary.netProfit ?? 
            0
        );

        const netMargin = this._safeNumber(
            kpis.netMargin?.value ?? 
            kpis.netMargin ?? 
            summary.netMargin ?? 
            0
        );

        const grossMargin = this._safeNumber(
            kpis.grossMargin?.value ?? 
            kpis.grossMargin ?? 
            summary.grossMargin ?? 
            0
        );

        const netCashFlow = this._safeNumber(
            kpis.netCashFlow?.value ?? 
            kpis.netCashFlow ?? 
            summary.netCashFlow ?? 
            0
        );

        const keyMetrics = {
            revenue,
            revenueGrowth,
            netProfit,
            netMargin,
            grossMargin,
            netCashFlow
        };

        // Performance summary
        const performanceScore = this._safeNumber(
            perf.score ?? 
            perf.overallScore ?? 
            summary.performanceScore ?? 
            50
        );

        const performanceStatus = 
            perf.status ?? 
            perf.overallStatus ?? 
            summary.healthStatus ?? 
            'NEUTRAL';

        const performanceSummary = {
            score: performanceScore,
            status: performanceStatus,
            categories: perf.components || perf.breakdown || {},
            signals: perf.signals || []
        };

        // Health summary
        const healthScore = this._safeNumber(
            health.score ?? 
            health.overallScore ?? 
            summary.healthScore ?? 
            performanceScore
        );

        const healthStatus = 
            health.status ?? 
            health.overallStatus ?? 
            summary.healthStatus ?? 
            performanceStatus;

        const healthSummary = {
            score: healthScore,
            status: healthStatus,
            components: health.components || health.breakdown || {},
            recommendations: health.recommendations || []
        };

        // Signal summary
        const positives = this._safeArray(signals.positives || signals.opportunities || []);
        const warnings = this._safeArray(signals.warnings || signals.risks || []);
        const criticals = this._safeArray(signals.criticals || []);

        const signalSummary = {
            positiveCount: positives.length,
            warningCount: warnings.length,
            criticalCount: criticals.length,
            positives,
            warnings,
            criticals,
            allSignals: signals
        };

        // Risk level from concentration
        const overallRiskLevel = 
            concentration.overallRiskLevel ?? 
            concentration.customers?.riskLevel ?? 
            'LOW';

        // Build executive narrative
        const narrative = this._buildNarrative({
            revenue,
            netProfit,
            netMargin,
            grossMargin,
            healthScore,
            healthStatus,
            criticalCount: criticals.length,
            warningCount: warnings.length,
            positiveCount: positives.length
        });

        const executiveSummary = {
            narrative,
            overallRiskLevel,
            summary: `Revenue ₦${revenue.toLocaleString()} • Net Profit ₦${netProfit.toLocaleString()} • Net Margin ${netMargin.toFixed(1)}% • Health: ${healthScore}/100 (${healthStatus})`
        };

        return {
            businessId,
            period,
            generatedAt: snapshot.generatedAt || new Date().toISOString(),
            source,
            version: '2.0.0',
            keyMetrics,
            performanceSummary,
            healthSummary,
            signalSummary,
            executiveSummary,
            // Include raw snapshot for debugging
            _debug: {
                hasKpis: !!kpis,
                kpiKeys: Object.keys(kpis),
                snapshotKeys: Object.keys(snapshot)
            }
        };
    }

    /**
     * Build executive narrative
     */
    _buildNarrative({ revenue, netProfit, netMargin, grossMargin, healthScore, healthStatus, criticalCount, warningCount, positiveCount }) {
        const parts = [];
        
        // Revenue
        if (revenue > 0) {
            parts.push(`Revenue ₦${revenue.toLocaleString()}`);
        }
        
        // Profit
        if (netProfit !== 0) {
            parts.push(`Net Profit ₦${netProfit.toLocaleString()}`);
        }
        
        // Margins
        if (netMargin > 0) {
            parts.push(`Net Margin ${netMargin.toFixed(1)}%`);
        }
        
        if (grossMargin > 0) {
            parts.push(`Gross Margin ${grossMargin.toFixed(1)}%`);
        }
        
        // Health
        parts.push(`Health: ${healthScore}/100 (${healthStatus})`);
        
        // Signals
        if (criticalCount > 0) {
            parts.push(`⚠️ ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} require immediate attention`);
        } else if (warningCount > 0) {
            parts.push(`⚠️ ${warningCount} warning${warningCount > 1 ? 's' : ''} to monitor`);
        } else if (positiveCount > 0) {
            parts.push(`✅ ${positiveCount} positive signal${positiveCount > 1 ? 's' : ''}`);
        }

        return parts.join(' • ');
    }

    /**
     * Fallback when snapshot service is unavailable
     */
    _getFallbackSnapshot(businessId, period) {
        return {
            businessId,
            period,
            generatedAt: new Date().toISOString(),
            source: 'ExecutiveAnalyticsService-Fallback',
            version: '2.0.0',
            keyMetrics: { 
                revenue: 0, 
                revenueGrowth: 0, 
                netProfit: 0, 
                netMargin: 0, 
                grossMargin: 0, 
                netCashFlow: 0 
            },
            performanceSummary: { 
                score: 50, 
                status: 'NEUTRAL', 
                categories: {}, 
                signals: [] 
            },
            healthSummary: { 
                score: 50, 
                status: 'NEUTRAL', 
                components: {}, 
                recommendations: [] 
            },
            signalSummary: { 
                positiveCount: 0, 
                warningCount: 0, 
                criticalCount: 0,
                positives: [],
                warnings: [],
                criticals: []
            },
            executiveSummary: { 
                narrative: 'System data temporarily unavailable. Using baseline metrics.', 
                overallRiskLevel: 'UNKNOWN',
                summary: 'Data unavailable'
            },
            _debug: { fallback: true }
        };
    }
}

module.exports = ExecutiveAnalyticsService;