// src/application/services/reports/calculators/ComparisonCalculator.js

/**
 * ComparisonCalculator - Single source of truth for period comparison calculations
 * 
 * Calculates:
 * - Absolute change
 * - Percentage change
 * - Direction (INCREASE, DECREASE, NO_CHANGE)
 * - Comparison of multiple metrics
 */
class ComparisonCalculator {
    constructor() {
        // No repositories needed - pure calculation logic
    }

    /**
     * Compare two values
     * 
     * @param {number} current - Current period value
     * @param {number} previous - Previous period value
     * @param {string} [label] - Label for the comparison
     * @returns {Object} Comparison result
     */
    compareValues(current, previous, label = null) {
        const absoluteChange = current - previous;
        const percentageChange = previous !== 0 ? (absoluteChange / previous) * 100 : null;
        const direction = absoluteChange > 0 ? 'INCREASE' : absoluteChange < 0 ? 'DECREASE' : 'NO_CHANGE';

        return {
            current,
            previous,
            absoluteChange,
            percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null,
            direction,
            label,
        };
    }

    /**
     * Compare multiple metrics at once
     * 
     * @param {Object} currentData - Object with current period metrics
     * @param {Object} previousData - Object with previous period metrics
     * @param {Array<string>} metrics - List of metric keys to compare
     * @returns {Object} Comparison results for all metrics
     */
    compareMetrics(currentData, previousData, metrics) {
        const results = {};
        for (const metric of metrics) {
            const current = currentData[metric] !== undefined ? currentData[metric] : 0;
            const previous = previousData[metric] !== undefined ? previousData[metric] : 0;
            results[metric] = this.compareValues(current, previous, metric);
        }
        return results;
    }

    /**
     * Create a summary of comparisons
     * 
     * @param {Object} comparisons - Results from compareMetrics()
     * @returns {Object} Summary with total changes and top changes
     */
    summarizeComparisons(comparisons) {
        const metrics = Object.keys(comparisons);
        const increased = metrics.filter(m => comparisons[m].direction === 'INCREASE');
        const decreased = metrics.filter(m => comparisons[m].direction === 'DECREASE');
        const unchanged = metrics.filter(m => comparisons[m].direction === 'NO_CHANGE');

        // Sort by absolute change descending
        const sorted = metrics
            .map(m => ({ metric: m, ...comparisons[m] }))
            .sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));

        return {
            totalMetrics: metrics.length,
            increased: increased.length,
            decreased: decreased.length,
            unchanged: unchanged.length,
            largestIncrease: sorted.find(s => s.direction === 'INCREASE') || null,
            largestDecrease: sorted.find(s => s.direction === 'DECREASE') || null,
            sorted,
        };
    }

    /**
     * Calculate growth rate over multiple periods
     * 
     * @param {Array<number>} values - Array of values over time
     * @param {Array<string>} labels - Labels for each period
     * @returns {Object} Growth analysis
     */
    calculateGrowth(values, labels) {
        if (values.length < 2) {
            return {
                totalGrowth: 0,
                averageGrowth: 0,
                periods: values.map((v, i) => ({
                    label: labels[i] || `Period ${i + 1}`,
                    value: v,
                    growth: null,
                })),
            };
        }

        const first = values[0];
        const last = values[values.length - 1];
        const totalGrowth = first !== 0 ? ((last - first) / first) * 100 : null;

        const growthRates = [];
        for (let i = 1; i < values.length; i++) {
            const prev = values[i - 1];
            const curr = values[i];
            growthRates.push({
                label: labels[i] || `Period ${i + 1}`,
                value: curr,
                growth: prev !== 0 ? ((curr - prev) / prev) * 100 : null,
            });
        }

        const validGrowthRates = growthRates.filter(g => g.growth !== null);
        const averageGrowth = validGrowthRates.length > 0
            ? validGrowthRates.reduce((sum, g) => sum + g.growth, 0) / validGrowthRates.length
            : null;

        return {
            totalGrowth: totalGrowth !== null ? Math.round(totalGrowth * 100) / 100 : null,
            averageGrowth: averageGrowth !== null ? Math.round(averageGrowth * 100) / 100 : null,
            periods: growthRates,
            firstValue: first,
            lastValue: last,
        };
    }

    /**
     * Compare two periods with rich context
     */
    comparePeriods(currentPeriod, previousPeriod, metrics) {
        const comparisons = this.compareMetrics(currentPeriod, previousPeriod, metrics);
        const summary = this.summarizeComparisons(comparisons);

        return {
            comparisons,
            summary,
            currentPeriod,
            previousPeriod,
        };
    }
}

module.exports = ComparisonCalculator;