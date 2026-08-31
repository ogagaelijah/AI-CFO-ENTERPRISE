// src/application/services/analytics/AnalyticsEngine.js

/**
 * Analytics Engine - Orchestrator
 * 
 * The Analytics Engine consumes trusted report outputs and turns them into:
 * - KPIs
 * - Ratios
 * - Trends
 * - Comparisons
 * - Performance signals
 * - Business health score
 * 
 * This is a READ-ONLY layer. It does not modify any transaction data.
 * All calculations derive from Report Engine outputs.
 */
class AnalyticsEngine {
    constructor({
        periodResolver = null,
        reportValidator = null,
        reportResponseBuilder = null,
        reconciliationCheck = null,
        // Phase 4.2-4.10 modules will be injected here
        kpiEngine = null,
        ratioEngine = null,
        trendEngine = null,
        comparisonEngine = null,
        concentrationEngine = null,
        performanceEngine = null,
        healthScoreEngine = null,
        snapshotService = null,
    }) {
        this.periodResolver = periodResolver;
        this.reportValidator = reportValidator;
        this.reportResponseBuilder = reportResponseBuilder;
        this.reconciliationCheck = reconciliationCheck;

        this.kpiEngine = kpiEngine;
        this.ratioEngine = ratioEngine;
        this.trendEngine = trendEngine;
        this.comparisonEngine = comparisonEngine;
        this.concentrationEngine = concentrationEngine;
        this.performanceEngine = performanceEngine;
        this.healthScoreEngine = healthScoreEngine;
        this.snapshotService = snapshotService;
    }

    /**
     * Generate full analytics for a period
     */
    async generate({
        userId,
        businessId,
        period,
        startDate = null,
        endDate = null,
        referenceDate = null,
    }) {
        // Resolve period
        const periodInfo = this.periodResolver.resolve({
            period,
            startDate,
            endDate,
            referenceDate,
        });

        // Run all analytics modules
        const [kpis, ratios, comparisons, trends, concentration, performance, health] = await Promise.all([
            this.kpiEngine?.calculate({ userId, businessId, period: periodInfo }),
            this.ratioEngine?.calculate({ userId, businessId, period: periodInfo }),
            this.comparisonEngine?.calculate({ userId, businessId, period: periodInfo }),
            this.trendEngine?.calculate({ userId, businessId, period: periodInfo }),
            this.concentrationEngine?.calculate({ userId, businessId, period: periodInfo }),
            this.performanceEngine?.analyze({ userId, businessId, period: periodInfo }),
            this.healthScoreEngine?.calculate({ userId, businessId, period: periodInfo }),
        ]);

        return {
            period: periodInfo,
            kpis: kpis || {},
            ratios: ratios || {},
            comparisons: comparisons || {},
            trends: trends || {},
            concentration: concentration || {},
            performance: performance || {},
            health: health || {},
        };
    }

    /**
     * Generate executive dashboard analytics
     */
    async generateExecutive({ userId, businessId, period, startDate = null, endDate = null, referenceDate = null }) {
        const full = await this.generate({
            userId,
            businessId,
            period,
            startDate,
            endDate,
            referenceDate,
        });

        // Extract executive-level metrics
        const executiveKpis = this._extractExecutiveKpis(full.kpis);
        const signals = this._extractSignals(full.performance, full.health);

        return {
            period: full.period,
            kpis: executiveKpis,
            performance: full.performance,
            health: full.health,
            signals,
            summary: this._generateExecutiveSummary(full),
        };
    }

    /**
     * Extract executive KPIs (most important metrics)
     */
    _extractExecutiveKpis(kpis) {
        const keys = [
            'revenue',
            'grossProfit',
            'grossMargin',
            'netProfit',
            'netMargin',
            'totalExpenses',
            'expenseRatio',
            'netCashFlow',
            'inventoryValue',
            'receivablesRatio',
        ];
        const result = {};
        for (const key of keys) {
            if (kpis[key]) {
                result[key] = kpis[key];
            }
        }
        return result;
    }

    /**
     * Extract signals from performance and health
     */
    _extractSignals(performance, health) {
        const signals = [];
        if (performance?.signals) {
            signals.push(...performance.signals);
        }
        if (health?.positives) {
            signals.push(...health.positives);
        }
        if (health?.warnings) {
            signals.push(...health.warnings);
        }
        if (health?.criticals) {
            signals.push(...health.criticals);
        }
        return signals;
    }

    /**
     * Generate executive summary
     */
    _generateExecutiveSummary(full) {
        const parts = [];
        const kpis = full.kpis || {};

        // Revenue
        if (kpis.revenue?.value !== null) {
            const rev = kpis.revenue;
            const direction = rev.direction === 'UP' ? '↑' : rev.direction === 'DOWN' ? '↓' : '→';
            parts.push(`Revenue ${direction} ${rev.value}`);
            if (rev.percentageChange !== null) {
                parts.push(`(${rev.percentageChange > 0 ? '+' : ''}${rev.percentageChange}%)`);
            }
        }

        // Profit
        if (kpis.netProfit?.value !== null) {
            const profit = kpis.netProfit;
            const direction = profit.direction === 'UP' ? '↑' : profit.direction === 'DOWN' ? '↓' : '→';
            parts.push(`Net Profit ${direction} ${profit.value}`);
        }

        // Margin
        if (kpis.grossMargin?.value !== null) {
            parts.push(`Gross Margin ${kpis.grossMargin.value}%`);
        }

        return parts.join(' • ');
    }
}

module.exports = AnalyticsEngine;