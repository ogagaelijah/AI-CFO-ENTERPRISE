// src/application/services/analytics/comparisons/ComparisonEngine.js

const PeriodComparisonCalculator = require('./PeriodComparisonCalculator'); // Fixed filename
const GrowthCalculator = require('./GrowthCalculator');

/**
 * Comparison Engine - Production Core Orchestrator
 */
class ComparisonEngine {
    constructor({
        reportService,
        periodResolver,
        periodComparisonCalculator = null,
        growthCalculator = null
    }) {
        this.reportService = reportService;
        this.periodResolver = periodResolver;

        this.periodComparisonCalculator = periodComparisonCalculator || new PeriodComparisonCalculator({ 
            reportService: this.reportService, 
            periodResolver: this.periodResolver 
        });
        this.growthCalculator = growthCalculator || new GrowthCalculator({ 
            reportService: this.reportService, 
            periodResolver: this.periodResolver 
        });
    }

    async calculate({ userId, businessId, period }) {
        if (!period) throw new Error('ComparisonEngine: Explicit period parameter context is required');

        const [previousPeriod, growth] = await Promise.all([
            this.periodComparisonCalculator.calculate({ userId, businessId, period, comparisonType: 'PREVIOUS_PERIOD' }),
            this.growthCalculator.calculate({ userId, businessId, period })
        ]);

        return {
            period: period.label || period.type,
            businessId,
            generatedAt: new Date().toISOString(),
            source: 'ComparisonEngine',
            previousPeriod,
            growth
        };
    }

    async calculateExecutive({ userId, businessId, period }) {
        const payload = await this.calculate({ userId, businessId, period });
        
        const getTrend = (growthObj) => {
            const dir = growthObj?.direction;
            if (dir === 'UP') return 'increased';
            if (dir === 'DOWN') return 'decreased';
            if (dir === 'FLAT') return 'flat';
            return 'unchanged';
        };

        const revenueTrend = getTrend(payload.growth?.revenueGrowth);
        const grossProfitTrend = getTrend(payload.growth?.grossProfitGrowth);
        const netProfitTrend = getTrend(payload.growth?.profitGrowth);

        return {
            summary: `revenue ${revenueTrend} • grossProfit ${grossProfitTrend} • netProfit ${netProfitTrend}`,
            raw: payload // Include raw for frontend charts
        };
    }
}

module.exports = ComparisonEngine;