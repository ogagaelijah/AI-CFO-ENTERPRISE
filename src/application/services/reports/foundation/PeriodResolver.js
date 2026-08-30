// src/application/services/reports/foundation/PeriodResolver.js

/**
 * PeriodResolver - Determines date ranges for report periods
 *
 * Supports:
 * - daily
 * - weekly
 * - monthly
 * - quarterly
 * - yearly
 * - custom (user-provided dates)
 *
 * Single source of truth for all period date calculations
 */
class PeriodResolver {
    /**
     * Parse a date string to a local Date object (avoiding timezone issues)
     */
    _parseDate(dateStr) {
        if (!dateStr) return new Date();
        // Use split to avoid timezone issues
        const parts = dateStr.split('T')[0].split('-');
        return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
            0, 0, 0, 0
        );
    }

    /**
     * Format a date to YYYY-MM-DD without timezone offset
     */
    _formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get today's date as local Date
     */
    _getToday() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    /**
     * Resolve period dates based on type and reference date
     *
     * @param {Object} params
     * @param {string} params.period - 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
     * @param {string|Date} params.referenceDate - Date to calculate period from
     * @param {string} [params.startDate] - Custom start date (required if period === 'custom')
     * @param {string} [params.endDate] - Custom end date (required if period === 'custom')
     * @returns {Object} { startDate, endDate, label, previousStartDate, previousEndDate, year, month, quarter }
     */
    resolve({ period, referenceDate = null, startDate = null, endDate = null }) {
        // Get reference date as local Date
        let refDate;
        if (referenceDate) {
            if (typeof referenceDate === 'string') {
                refDate = this._parseDate(referenceDate);
            } else {
                refDate = new Date(referenceDate);
                // Ensure it's a local date
                refDate = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
            }
        } else {
            refDate = this._getToday();
        }

        // Validate period type
        const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
        if (!validPeriods.includes(period)) {
            throw new Error(`Invalid period: ${period}. Must be one of: ${validPeriods.join(', ')}`);
        }

        // Handle custom period
        if (period === 'custom') {
            if (!startDate ||!endDate) {
                throw new Error('startDate and endDate are required for custom period');
            }
            const start = this._parseDate(startDate);
            const end = this._parseDate(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('Invalid startDate or endDate format');
            }
            if (start > end) {
                throw new Error('startDate cannot be after endDate');
            }
            return {
                startDate: this._formatDateStr(start),
                endDate: this._formatDateStr(end),
                label: `${this._formatDisplayDate(start)} - ${this._formatDisplayDate(end)}`,
                previousStartDate: null,
                previousEndDate: null,
                year: start.getFullYear(),
                month: start.getMonth(),
                quarter: Math.floor(start.getMonth() / 3) + 1,
            };
        }

        // Calculate period dates
        const { start, end } = this._getPeriodDates(refDate, period);
        const { prevStart, prevEnd } = this._getPreviousPeriodDates(refDate, period);

        return {
            startDate: this._formatDateStr(start),
            endDate: this._formatDateStr(end),
            label: this._getPeriodLabel(start, end, period),
            previousStartDate: prevStart? this._formatDateStr(prevStart) : null,
            previousEndDate: prevEnd? this._formatDateStr(prevEnd) : null,
            year: start.getFullYear(),
            month: start.getMonth(),
            quarter: Math.floor(start.getMonth() / 3) + 1,
        };
    }

    /**
     * Get period start and end dates
     */
    _getPeriodDates(refDate, period) {
        const start = new Date(refDate);
        let end = new Date(refDate);

        // Set to start of day (local)
        start.setHours(0, 0, 0, 0);

        switch (period) {
            case 'daily':
                end.setHours(23, 59, 59, 999);
                break;

            case 'weekly':
                // Monday to Sunday
                const day = refDate.getDay();
                const diff = day === 0? 6 : day - 1;
                start.setDate(refDate.getDate() - diff);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;

            case 'monthly':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setMonth(start.getMonth() + 1);
                end.setDate(0);
                end.setHours(23, 59, 59, 999);
                break;

            case 'quarterly':
                const quarterMonth = Math.floor(refDate.getMonth() / 3) * 3;
                start.setMonth(quarterMonth);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setMonth(start.getMonth() + 3);
                end.setDate(0);
                end.setHours(23, 59, 59, 999);
                break;

            case 'yearly':
                start.setMonth(0);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setFullYear(start.getFullYear() + 1);
                end.setDate(0);
                end.setHours(23, 59, 59, 999);
                break;

            default:
                throw new Error(`Unsupported period: ${period}`);
        }

        return { start, end };
    }

    /**
     * Get previous period start and end dates
     */
    _getPreviousPeriodDates(refDate, period) {
        const prevRef = new Date(refDate);

        switch (period) {
            case 'daily':
                prevRef.setDate(refDate.getDate() - 1);
                break;
            case 'weekly':
                prevRef.setDate(refDate.getDate() - 7);
                break;
            case 'monthly':
                prevRef.setMonth(refDate.getMonth() - 1);
                break;
            case 'quarterly':
                prevRef.setMonth(refDate.getMonth() - 3);
                break;
            case 'yearly':
                prevRef.setFullYear(refDate.getFullYear() - 1);
                break;
            default:
                return { prevStart: null, prevEnd: null };
        }

        const { start: prevStart, end: prevEnd } = this._getPeriodDates(prevRef, period);
        return { prevStart, prevEnd };
    }

    /**
     * Get human-readable period label
     */
    _getPeriodLabel(start, end, period) {
        const startStr = this._formatDisplayDate(start);
        const endStr = this._formatDisplayDate(end);

        switch (period) {
            case 'daily':
                return startStr;
            case 'weekly':
                return `Week of ${startStr}`;
            case 'monthly':
                return start.toLocaleString('default', { month: 'long', year: 'numeric' });
            case 'quarterly':
                return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
            case 'yearly':
                return start.getFullYear().toString();
            default:
                return `${startStr} - ${endStr}`;
        }
    }

    /**
     * Format date for display (e.g., "30 Aug 2026")
     */
    _formatDisplayDate(date) {
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    }

    /**
     * Get month name
     */
    getMonthName(monthIndex) {
        return new Date(2026, monthIndex, 1).toLocaleString('default', { month: 'long' });
    }

    /**
     * Get period type from date range
     *
     * Logic: Only return 'monthly', 'quarterly', 'yearly' if the range exactly matches
     * a full calendar period. Otherwise return 'custom'.
     * This aligns with Handbook Section 13: Depth increases with period length
     */
    getPeriodTypeFromRange(startDate, endDate) {
        const start = this._parseDate(startDate);
        const end = this._parseDate(endDate);

        // Calculate difference in days (inclusive)
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // 1. Daily
        if (diffDays === 1) return 'daily';

        // 2. Weekly: Must be exactly 7 days AND Mon-Sun
        if (diffDays === 7) {
            const startDay = start.getDay(); // 0 = Sunday, 1 = Monday
            const endDay = end.getDay(); // 0 = Sunday
            if (startDay === 1 && endDay === 0) return 'weekly';
        }

        // 3. Monthly: Must start on 1st and end on last day of same month
        const isFullMonth = start.getDate() === 1 &&
                            end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
                            start.getMonth() === end.getMonth() &&
                            start.getFullYear() === end.getFullYear();
        if (isFullMonth) return 'monthly';

        // 4. Quarterly: Must start on Q start and end on Q end
        const startQuarter = Math.floor(start.getMonth() / 3);
        const endQuarter = Math.floor(end.getMonth() / 3);
        const isFullQuarter = start.getDate() === 1 &&
                              end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
                              startQuarter === endQuarter &&
                              start.getFullYear() === end.getFullYear();
        if (isFullQuarter) return 'quarterly';

        // 5. Yearly: Must be Jan 1 to Dec 31 of same year
        const isFullYear = start.getDate() === 1 && start.getMonth() === 0 &&
                           end.getDate() === 31 && end.getMonth() === 11 &&
                           start.getFullYear() === end.getFullYear();
        if (isFullYear) return 'yearly';

        // 6. Everything else is custom
        return 'custom';
    }
}

module.exports = PeriodResolver;