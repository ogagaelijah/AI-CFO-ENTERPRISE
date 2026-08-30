// src/application/services/reports/foundation/ReportResponseBuilder.js

/**
 * ReportResponseBuilder - Builds consistent report responses
 * 
 * Ensures all reports have:
 * - Consistent structure
 * - Metadata (generatedAt, reportType, period)
 * - Integrity checks
 * - Error handling
 */
class ReportResponseBuilder {
    constructor({ periodResolver, reportValidator }) {
        this.periodResolver = periodResolver;
        this.reportValidator = reportValidator;
    }

    /**
     * Build a report response with consistent structure
     * 
     * @param {Object} params
     * @param {string} params.reportType - Type of report
     * @param {Object} params.period - Period info from PeriodResolver
     * @param {Object} params.data - Report data
     * @param {Array} [params.warnings] - Warnings from calculations
     * @param {Array} [params.errors] - Errors from calculations
     * @param {Object} [params.integrityChecks] - Integrity check results
     * @returns {Object} Formatted report response
     */
    build({ reportType, period, data, warnings = [], errors = [], integrityChecks = null }) {
        return {
            reportType,
            generatedAt: new Date().toISOString(),
            period: {
                start: period.startDate,
                end: period.endDate,
                label: period.label,
                previousStart: period.previousStartDate,
                previousEnd: period.previousEndDate,
            },
            data,
            warnings: warnings.length > 0 ? warnings : null,
            errors: errors.length > 0 ? errors : null,
            integrity: integrityChecks || null,
            status: errors.length > 0 ? 'ERROR' : 'SUCCESS',
        };
    }

    /**
     * Build a successful report response
     */
    success({ reportType, period, data, warnings = [], integrityChecks = null }) {
        return this.build({
            reportType,
            period,
            data,
            warnings,
            errors: [],
            integrityChecks,
        });
    }

    /**
     * Build an error report response
     */
    error({ reportType, period, errors, data = null }) {
        return this.build({
            reportType,
            period,
            data,
            warnings: [],
            errors,
            integrityChecks: null,
        });
    }

    /**
     * Add period summary to report data
     */
    addPeriodSummary(data, period) {
        return {
            ...data,
            _periodSummary: {
                start: period.startDate,
                end: period.endDate,
                label: period.label,
                year: period.year,
                month: period.month,
                quarter: period.quarter,
            },
        };
    }

    /**
     * Build comparison data
     */
    buildComparison(current, previous, label) {
        const absoluteChange = current - previous;
        const percentageChange = previous !== 0 ? (absoluteChange / previous) * 100 : null;

        return {
            current,
            previous,
            absoluteChange,
            percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null,
            direction: absoluteChange > 0 ? 'INCREASE' : absoluteChange < 0 ? 'DECREASE' : 'NO_CHANGE',
            label,
        };
    }

    /**
     * Build a summary card for dashboard
     */
    buildSummaryCard({ title, value, previousValue = null, icon = null, format = 'currency' }) {
        let formattedValue = value;
        let change = null;

        if (previousValue !== null && previousValue !== undefined) {
            const absChange = value - previousValue;
            const pctChange = previousValue !== 0 ? (absChange / previousValue) * 100 : null;
            change = {
                absolute: absChange,
                percentage: pctChange !== null ? Math.round(pctChange * 100) / 100 : null,
                direction: absChange > 0 ? 'INCREASE' : absChange < 0 ? 'DECREASE' : 'NO_CHANGE',
            };
        }

        // Format value based on type
        if (format === 'currency') {
            formattedValue = `₦${Math.round(value).toLocaleString()}`;
        } else if (format === 'percentage') {
            formattedValue = `${Math.round(value * 100) / 100}%`;
        } else if (format === 'number') {
            formattedValue = Math.round(value).toLocaleString();
        }

        return {
            title,
            value,
            formattedValue,
            change,
            icon,
        };
    }
}

module.exports = ReportResponseBuilder;