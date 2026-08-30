// src/application/services/reports/foundation/ReportValidator.js

/**
 * ReportValidator - Validates report inputs
 * 
 * Ensures:
 * - Required fields are present
 * - Date formats are valid
 * - Date ranges are logical
 * - Business/User IDs are valid
 * - Period types are supported
 */
class ReportValidator {
    /**
     * Validate report generation parameters
     * 
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} params.period - 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
     * @param {string} [params.startDate] - Start date (required for custom period)
     * @param {string} [params.endDate] - End date (required for custom period)
     * @param {string} [params.referenceDate] - Reference date (optional, defaults to today)
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate(params) {
        const errors = [];

        // Validate userId
        if (!params.userId) {
            errors.push('userId is required');
        } else if (typeof params.userId !== 'number' && typeof params.userId !== 'string') {
            errors.push('userId must be a number or string');
        }

        // Validate businessId
        if (!params.businessId) {
            errors.push('businessId is required');
        } else if (typeof params.businessId !== 'number' && typeof params.businessId !== 'string') {
            errors.push('businessId must be a number or string');
        }

        // Validate period
        const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
        if (!params.period) {
            errors.push('period is required');
        } else if (!validPeriods.includes(params.period)) {
            errors.push(`period must be one of: ${validPeriods.join(', ')}`);
        }

        // Validate dates for custom period
        if (params.period === 'custom') {
            if (!params.startDate) {
                errors.push('startDate is required for custom period');
            } else if (!this._isValidDate(params.startDate)) {
                errors.push('startDate must be a valid date (YYYY-MM-DD)');
            }

            if (!params.endDate) {
                errors.push('endDate is required for custom period');
            } else if (!this._isValidDate(params.endDate)) {
                errors.push('endDate must be a valid date (YYYY-MM-DD)');
            }

            if (params.startDate && params.endDate) {
                const start = new Date(params.startDate);
                const end = new Date(params.endDate);
                if (start > end) {
                    errors.push('startDate cannot be after endDate');
                }
            }
        }

        // Validate reference date if provided
        if (params.referenceDate && !this._isValidDate(params.referenceDate)) {
            errors.push('referenceDate must be a valid date (YYYY-MM-DD)');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if a date string is valid
     */
    _isValidDate(dateStr) {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0];
    }

    /**
     * Validate report type
     */
    validateReportType(reportType) {
        const validTypes = [
            'profit_loss',
            'balance_sheet',
            'cash_flow',
            'daily',
            'weekly',
            'monthly',
            'yearly',
            'executive',
            'aging',
            'inventory',
            'sales',
            'expenses',
            'kpi',
            'comparison',
        ];
        if (!validTypes.includes(reportType)) {
            return {
                valid: false,
                message: `Invalid report type: ${reportType}. Must be one of: ${validTypes.join(', ')}`,
            };
        }
        return { valid: true };
    }

    /**
     * Validate that a value is a positive number
     */
    validatePositiveNumber(value, fieldName) {
        if (value === undefined || value === null) {
            return { valid: false, message: `${fieldName} is required` };
        }
        if (typeof value !== 'number' || isNaN(value)) {
            return { valid: false, message: `${fieldName} must be a number` };
        }
        if (value < 0) {
            return { valid: false, message: `${fieldName} must be non-negative` };
        }
        return { valid: true };
    }
}

module.exports = ReportValidator;