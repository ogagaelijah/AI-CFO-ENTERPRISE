// src/application/services/reports/calculators/CashCalculator.js

/**
 * CashCalculator - Single source of truth for cash calculations
 *
 * Calculates:
 * - Opening cash
 * - Cash inflows
 * - Cash outflows
 * - Net cash flow
 * - Closing cash
 * - Cash by category
 */
class CashCalculator {
    constructor({ paymentRepository }) {
        this.paymentRepository = paymentRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num)? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result)? result : [];
    }

    /**
     * Calculate cash metrics for a date range
     *
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} params.startDate - Start date (YYYY-MM-DD)
     * @param {string} params.endDate - End date (YYYY-MM-DD)
     * @param {string} [params.openingDate] - Date for opening balance (default: startDate)
     * @param {Object} [params.openingCash] - Pre-calculated opening cash
     * @param {boolean} [params.includeDetails] - Include payment details
     * @returns {Object} Cash metrics
     */
    async calculate({
        userId,
        businessId,
        startDate,
        endDate,
        openingDate = null,
        openingCash = null,
        includeDetails = false,
    }) {
        // Determine opening date
        const openDate = openingDate || startDate;

        // Calculate opening cash
        let openingBalance = openingCash;
        if (openingBalance === null) {
            let openingPayments = [];
            try {
                const result = await this.paymentRepository.findByDateRange(businessId, '2000-01-01', openDate);
                openingPayments = this._safeArray(result);
            } catch (error) {
                console.warn('⚠️ CashCalculator: Could not fetch opening payments:', error.message);
                openingPayments = [];
            }
            openingBalance = this._calculateNetCash(openingPayments);
        }

        // Get period payments
        let payments = [];
        try {
            const result = await this.paymentRepository.findByDateRange(businessId, startDate, endDate);
            payments = this._safeArray(result);
        } catch (error) {
            console.warn('⚠️ CashCalculator: Could not fetch payments:', error.message);
            payments = [];
        }

        const cashIn = payments
          .filter(p => p.type === 'RECEIVED' || p.type === 'IN')
          .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);

        const cashOut = payments
          .filter(p => p.type === 'MADE' || p.type === 'OUT')
          .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);

        const netCashFlow = cashIn - cashOut;
        const closingCash = openingBalance + netCashFlow;

        let details = null;
        if (includeDetails) {
            details = {
                cashIn: payments.filter(p => p.type === 'RECEIVED' || p.type === 'IN'),
                cashOut: payments.filter(p => p.type === 'MADE' || p.type === 'OUT'),
            };
        }

        // Cash by reference type
        const cashInByType = this._groupByReferenceType(payments, 'IN');
        const cashOutByType = this._groupByReferenceType(payments, 'OUT');

        return {
            openingCash: Number(openingBalance.toFixed(2)),
            cashIn: Number(cashIn.toFixed(2)),
            cashOut: Number(cashOut.toFixed(2)),
            netCashFlow: Number(netCashFlow.toFixed(2)),
            closingCash: Number(closingCash.toFixed(2)),
            cashInByType,
            cashOutByType,
            details,
            paymentCount: payments.length,
        };
    }

    /**
     * Calculate net cash from payments
     */
    _calculateNetCash(payments) {
        return payments.reduce((sum, p) => {
            const amount = this._safeNumber(p.amount);
            if (p.type === 'RECEIVED' || p.type === 'IN') return sum + amount;
            if (p.type === 'MADE' || p.type === 'OUT') return sum - amount;
            return sum;
        }, 0);
    }

    /**
     * Group cash by reference type
     */
    _groupByReferenceType(payments, direction) {
        const filtered = payments.filter(p => {
            if (direction === 'IN') return p.type === 'RECEIVED' || p.type === 'IN';
            return p.type === 'MADE' || p.type === 'OUT';
        });

        const typeMap = {};
        for (const payment of filtered) {
            const key = payment.referenceType || 'OTHER';
            if (!typeMap[key]) typeMap[key] = 0;
            typeMap[key] += this._safeNumber(payment.amount);
        }
        return Object.entries(typeMap)
          .map(([type, amount]) => ({ type, amount: Number(amount.toFixed(2)) }))
          .sort((a, b) => b.amount - a.amount);
    }
}

module.exports = CashCalculator;