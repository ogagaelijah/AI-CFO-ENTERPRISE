// src/application/services/analytics/trends/TrendClassifier.js

/**
 * Trend Classifier - Production Grade
 *
 * Classifies percentage movements into standard investor-grade categories:
 * - STRONG_UP: > 10% growth
 * - UP: 2% to 10% growth
 * - STABLE: -2% to 2% change
 * - DOWN: -10% to -2% decline
 * - STRONG_DOWN: < -10% decline
 *
 * IFRS Compliant | Configurable Threshold Gates | Zero-Crash Execution
 */
class TrendClassifier {
    constructor({
        strongUpThreshold = 10,
        upThreshold = 2,
        strongDownThreshold = -10,
        downThreshold = -2,
        precision = 2, // ✅ SCALE: Configurable decimal precision
    } = {}) {
        this.strongUpThreshold = strongUpThreshold;
        this.upThreshold = upThreshold;
        this.strongDownThreshold = strongDownThreshold;
        this.downThreshold = downThreshold;
        this.precision = precision;
    }

    _round(num) {
        return Number(Number(num).toFixed(this.precision));
    }

    /**
     * Classify a trend based on percentage change
     */
    classify(percentageChange, currentValue = null, previousValue = null) {
        if (percentageChange === null || percentageChange === undefined || isNaN(percentageChange)) {
            return {
                classification: 'UNKNOWN',
                label: 'Unknown',
                status: 'NEUTRAL',
                severity: 'LOW',
                percentageChange: null,
                description: 'Insufficient data to classify trend',
            };
        }

        // ✅ SCALE FIX 1: Round first to prevent -0.00 and boundary drift
        const pct = this._round(percentageChange);

        let classification, label, status, severity;

        if (pct > this.strongUpThreshold) {
            classification = 'STRONG_UP';
            label = 'Strong Up';
            status = 'POSITIVE';
            severity = 'HIGH';
        } else if (pct > this.upThreshold) {
            classification = 'UP';
            label = 'Up';
            status = 'POSITIVE';
            severity = 'MEDIUM';
        } else if (pct >= this.downThreshold) { // -2.00 to 2.00 is STABLE
            classification = 'STABLE';
            label = 'Stable';
            status = 'NEUTRAL';
            severity = 'LOW';
        } else if (pct >= this.strongDownThreshold) { // -10.00 to -2.00 is DOWN
            classification = 'DOWN';
            label = 'Down';
            status = 'NEGATIVE';
            severity = 'MEDIUM';
        } else { // < -10.00
            classification = 'STRONG_DOWN';
            label = 'Strong Down';
            status = 'NEGATIVE';
            severity = 'HIGH';
        }

        return {
            classification,
            label,
            status,
            severity,
            percentageChange: pct,
            description: this._getDescription(classification, pct, currentValue, previousValue),
        };
    }

    /**
     * Classify multiple trends - accepts {key: number} or {key: {percentageChange}}
     */
    classifyMultiple(trends) {
        const results = {};
        for (const [key, trend] of Object.entries(trends)) {
            // ✅ SCALE FIX 2: Handle both raw number and object to prevent double wrapping
            const change = typeof trend === 'object' && trend!== null && 'percentageChange' in trend
               ? trend.percentageChange
                : trend;
            results[key] = this.classify(change);
        }
        return results;
    }

    /**
     * Get trend summary metric maps
     */
    getSummary(classifications) {
        const counts = { STRONG_UP: 0, UP: 0, STABLE: 0, DOWN: 0, STRONG_DOWN: 0, UNKNOWN: 0 };

        for (const item of Object.values(classifications)) {
            const target = item?.classification || item || 'UNKNOWN';
            counts[target] = (counts[target] || 0) + 1;
        }

        const positive = counts.STRONG_UP + counts.UP;
        const negative = counts.STRONG_DOWN + counts.DOWN;

        let overallStatus = 'NEUTRAL';
        if (positive > negative) overallStatus = 'POSITIVE';
        else if (negative > positive) overallStatus = 'NEGATIVE';

        return {
            counts,
            total: Object.values(counts).reduce((s, v) => s + v, 0),
            positive,
            negative,
            stable: counts.STABLE,
            overallStatus,
            summary: `Trend Summary: ${positive} improving, ${negative} declining, ${counts.STABLE} stable`,
        };
    }

    _getDescription(classification, percentageChange, currentValue, previousValue) {
        const prefix = this._getPrefix(classification);
        const suffix = percentageChange!== null? ` (${percentageChange > 0? '+' : ''}${percentageChange}%)` : '';

        if (currentValue!== null && previousValue!== null) {
            return `${prefix} from ${previousValue} to ${currentValue}${suffix}`;
        }
        return `${prefix}${suffix}`;
    }

    _getPrefix(classification) {
        const prefixes = {
            STRONG_UP: 'Strong increase',
            UP: 'Increase',
            STABLE: 'Stable',
            DOWN: 'Decrease',
            STRONG_DOWN: 'Strong decrease',
            UNKNOWN: 'Unknown trend',
        };
        return prefixes[classification] || 'Unknown trend';
    }
}

module.exports = TrendClassifier;