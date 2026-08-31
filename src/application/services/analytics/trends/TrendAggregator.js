// src/application/services/analytics/trends/TrendAggregator.js

/**
 * TrendAggregator - Aggregates multiple trends into a summary
 *
 * Provides:
 * - Summary of all trends (counts by direction)
 * - Top improving trends
 * - Top declining trends
 * - Overall trend direction
 */
class TrendAggregator {
    constructor({ trendClassifier = null } = {}) {
        this.trendClassifier = trendClassifier || new (require('./TrendClassifier'))();
    }

    /**
     * Aggregate multiple trends
     *
     * @param {Object} trends - Object of trend data from TrendCalculator
     * @param {Array<string>} [metrics] - Metrics to include (default: all)
     * @returns {Object} Aggregated trend summary
     */
    aggregate(trends, metrics = null) {
        const keys = metrics || Object.keys(trends);
        const trendData = [];

        const POSITIVE_SET = ['UP', 'STRONG_UP', 'INCREASE'];
        const NEGATIVE_SET = ['DOWN', 'STRONG_DOWN', 'DECREASE'];

        for (const key of keys) {
            if (trends[key]) {
                const trend = trends[key];
                const change = trend.percentageChange!== undefined? trend.percentageChange : null;

                // ✅ PRODUCTION FIX: Use direction from contract first, fallback to classifier
                const classificationEnum = trend.direction || this.trendClassifier.classify(change, trend.current, trend.previous).classification;

                let status = 'NEUTRAL';
                if (POSITIVE_SET.includes(classificationEnum)) status = 'POSITIVE';
                if (NEGATIVE_SET.includes(classificationEnum)) status = 'NEGATIVE';

                trendData.push({
                    metric: key,
                    displayName: trend.displayName || key,
                    current: trend.current,
                    previous: trend.previous,
                    change: change,
                    classification: classificationEnum, // 'STRONG_UP'
                    status: status // 'POSITIVE'
                });
            }
        }

        // Sort by change magnitude
        const sortedByChange = [...trendData]
           .filter(t => t.change!== null)
           .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

        const improving = trendData.filter(t => t.status === 'POSITIVE');
        const declining = trendData.filter(t => t.status === 'NEGATIVE');
        const stable = trendData.filter(t => t.status === 'NEUTRAL');

        return {
            total: trendData.length,
            improving: improving.length,
            declining: declining.length,
            stable: stable.length,
            overallStatus: improving.length > declining.length? 'POSITIVE'
                : declining.length > improving.length? 'NEGATIVE'
                : 'NEUTRAL',
            topImproving: sortedByChange
               .filter(t => t.status === 'POSITIVE')
               .slice(0, 3),
            topDeclining: sortedByChange
               .filter(t => t.status === 'NEGATIVE')
               .slice(0, 3),
            all: trendData,
            summary: this._generateSummary(trendData),
        };
    }

    /**
     * Generate a human-readable summary for investor dashboards
     */
    _generateSummary(trendData) {
        const improving = trendData.filter(t => t.status === 'POSITIVE');
        const declining = trendData.filter(t => t.status === 'NEGATIVE');
        const stable = trendData.filter(t => t.status === 'NEUTRAL');

        const parts = [];
        if (improving.length > 0) {
            parts.push(`${improving.length} metric(s) improving: ${improving.map(t => t.displayName).join(', ')}`);
        }
        if (declining.length > 0) {
            parts.push(`${declining.length} metric(s) declining: ${declining.map(t => t.displayName).join(', ')}`);
        }
        if (stable.length > 0) {
            parts.push(`${stable.length} metric(s) stable`);
        }
        if (parts.length === 0) {
            return 'No trends available';
        }

        return parts.join('; ');
    }
}

module.exports = TrendAggregator;