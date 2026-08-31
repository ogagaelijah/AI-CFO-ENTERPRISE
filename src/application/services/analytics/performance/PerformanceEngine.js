// src/application/services/analytics/performance/PerformanceEngine.js

const PerformanceAnalyzer = require('./PerformanceAnalyzer');
const PerformanceScoreCalculator = require('./PerformanceScoreCalculator');

/**
 * Performance Engine - Production Core Orchestrator
 * Comprehensive analytics evaluator pooling multi-engine vectors.
 * IFRS Compliant | Score Normalization Mapping | Audit Trail Enabled
 */
class PerformanceEngine {
    constructor({ reportService, kpiEngine, ratioEngine, trendEngine, comparisonEngine, concentrationEngine }) {
        this.reportService = reportService;
        this.kpiEngine = kpiEngine;
        this.ratioEngine = ratioEngine;
        this.trendEngine = trendEngine;
        this.comparisonEngine = comparisonEngine;
        this.concentrationEngine = concentrationEngine;
        
        this.analyzer = new PerformanceAnalyzer();
        this.scoreCalculator = new PerformanceScoreCalculator();
    }

    _safeNumber(val) { const num = Number(val); return isNaN(num) ? 0 : num; }

    /**
     * Compute unified performance metrics scoring matrices
     */
    async calculate({ userId, businessId, period }) {
        if (!period) throw new Error('PerformanceEngine: Period parameter is required');

        // Execute all specialized analytical components in parallel
        const [kpiResult, ratioResult, trendResult, comparisonResult, concentrationResult] = await Promise.all([
            this.kpiEngine.calculate({ userId, businessId, period }),
            this.ratioEngine.calculate({ userId, businessId, period }),
            this.trendEngine.calculate({ userId, businessId, startDate: period.startDate, endDate: period.endDate, interval: period.type || 'monthly', metrics: ['revenue', 'expenses'] }),
            this.comparisonEngine.calculate({ userId, businessId, period }),
            this.concentrationEngine.calculate({ userId, businessId, startDate: period.startDate, endDate: period.endDate })
        ]);

        // RESILIENT SSOT MINING - Handle both structured and flattened KPI outputs smoothly
        const kpiSource = kpiResult?.kpis || kpiResult || {};

        const extractedKpis = {
            revenue: this._safeNumber(kpiSource.revenue?.value ?? kpiSource.revenue),
            revenueGrowth: this._safeNumber(kpiSource.revenueGrowth?.value ?? kpiSource.revenueGrowth),
            grossMargin: this._safeNumber(kpiSource.grossMargin?.value ?? kpiSource.grossMargin),
            netMargin: this._safeNumber(kpiSource.netMargin?.value ?? kpiSource.netMargin),
            profitGrowth: this._safeNumber(kpiSource.profitGrowth?.value ?? kpiSource.profitGrowth),
            expenseRatio: this._safeNumber(kpiSource.expenseRatio?.value ?? kpiSource.expenseRatio),
            expenseGrowth: this._safeNumber(kpiSource.expenseGrowth?.value ?? kpiSource.expenseGrowth),
            netCashFlow: this._safeNumber(kpiSource.netCashFlow?.value ?? kpiSource.netCashFlow),
            cashFlowMargin: this._safeNumber(kpiSource.cashFlowMargin?.value ?? kpiSource.cashFlowMargin),
            lowStockCount: this._safeNumber(kpiSource.lowStockCount?.value ?? kpiSource.lowStockCount),
            inventoryValue: this._safeNumber(kpiSource.inventoryValue?.value ?? kpiSource.inventoryValue),
            customerCount: this._safeNumber(kpiSource.customerCount?.value ?? kpiSource.customerCount),
            customerConcentration: this._safeNumber(kpiSource.customerConcentration?.value ?? kpiSource.customerConcentration)
        };

        // Generate analytics groupings using individual segment extractors
        const analysis = this.analyzer.run(extractedKpis, trendResult, concentrationResult);
        
        // Compute standardized weight score matrices (0-100 scale)
        const scores = this.scoreCalculator.compute(extractedKpis, analysis);

        // Group alerts into positive, warning, and critical buckets
        const signals = this._generateSignals(extractedKpis, scores.overall.status);

        return {
            period: period.label || period.type,
            businessId,
            generatedAt: new Date().toISOString(),
            source: 'PerformanceEngine',
            analysis,
            scores,
            signals,
            summary: {
                overallScore: scores.overall.score,
                overallStatus: scores.overall.status,
                narrative: `Business health is evaluated as ${scores.overall.status} with a total score metric balance of ${scores.overall.score} points.`
            }
        };
    }

    _generateSignals(kpis, status) {
        const positives = [];
        const warnings = [];
        const criticals = [];

        if (kpis.revenueGrowth > 10) positives.push({ metric: 'revenue', message: 'Revenue expansion maintains upward momentum.' });
        if (kpis.netMargin > 20) positives.push({ metric: 'profitability', message: 'Net cash generation margins remain strong.' });

        if (kpis.expenseGrowth > 15) warnings.push({ metric: 'expenses', message: 'Operating expenses are rising faster than benchmark targets.' });
        if (kpis.customerConcentration > 50) warnings.push({ metric: 'customers', message: 'High dependency risk detected within key customer accounts.' });

        if (kpis.netCashFlow < 0) criticals.push({ metric: 'cashFlow', message: 'Negative trailing cash burn reduces liquid buffers.' });
        if (status === 'CRITICAL') criticals.push({ metric: 'overall', message: 'System alert: Combined metrics indicate high operational risk.' });

        return { positives, warnings, criticals };
    }
}

module.exports = PerformanceEngine;
