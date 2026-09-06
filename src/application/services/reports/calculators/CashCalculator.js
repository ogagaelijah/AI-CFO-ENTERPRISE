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
 *
 * Fully multi-business aware.
 * Handles both legacy (RECEIVED/MADE) and standard (IN/OUT) payment types.
 */
class CashCalculator {
    constructor({ paymentRepository }) {
        this.paymentRepository = paymentRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result) ? result : [];
    }

    /**
     * Check if a payment is cash IN (received)
     * Handles both legacy and standard types
     */
    _isCashIn(payment) {
        const type = String(payment.type || payment.payment_type || '').toUpperCase();
        return type === 'IN' || type === 'RECEIVED';
    }

    /**
     * Check if a payment is cash OUT (made)
     * Handles both legacy and standard types
     */
    _isCashOut(payment) {
        const type = String(payment.type || payment.payment_type || '').toUpperCase();
        return type === 'OUT' || type === 'MADE';
    }

    /**
     * Normalize payment type for display
     */
    _normalizeType(payment) {
        if (this._isCashIn(payment)) return 'IN';
        if (this._isCashOut(payment)) return 'OUT';
        return 'UNKNOWN';
    }

    /**
     * Calculate cash metrics for a date range
     */
    async calculate({
        userId,          // kept for compatibility, not used by repository
        businessId,
        startDate,
        endDate,
        openingDate = null,
        openingCash = null,
        includeDetails = false,
    }) {
        // =============================================
        // 🔍 DEBUG LOGS
        // =============================================
        console.log('🔍🔍🔍 CASH CALCULATOR DEBUG 🔍🔍🔍');
        console.log('businessId:', businessId);
        console.log('startDate:', startDate);
        console.log('endDate:', endDate);
        console.log('userId:', userId);
        console.log('paymentRepository exists?', !!this.paymentRepository);
        // =============================================

        // Validate inputs
        if (!businessId) {
            console.warn('⚠️ CashCalculator: businessId is required');
            return this._getEmptyResult();
        }

        // Determine opening date
        const openDate = openingDate || startDate;

        // Calculate opening cash
        let openingBalance = openingCash;
        if (openingBalance === null) {
            let openingPayments = [];
            try {
                console.log('🔍 Fetching opening payments for date:', openDate);
                const result = await this.paymentRepository.findByDateRange(
                    businessId,
                    '2000-01-01',
                    openDate
                );
                openingPayments = this._safeArray(result);
                console.log('🔍 Opening payments found:', openingPayments.length);
            } catch (error) {
                console.warn('⚠️ CashCalculator: Could not fetch opening payments:', error.message);
                openingPayments = [];
            }
            openingBalance = this._calculateNetCash(openingPayments);
            console.log('🔍 Opening balance calculated:', openingBalance);
        }

        // Get period payments
        let payments = [];
        try {
            console.log('🔍 Fetching period payments:', startDate, 'to', endDate);
            const result = await this.paymentRepository.findByDateRange(
                businessId,
                startDate,
                endDate
            );
            payments = this._safeArray(result);
            console.log('🔍 Period payments found:', payments.length);
        } catch (error) {
            console.warn('⚠️ CashCalculator: Could not fetch payments:', error.message);
            payments = [];
        }

        // Log first few payments to see structure
        if (payments.length > 0) {
            console.log('🔍 First payment sample:', JSON.stringify(payments[0], null, 2));
            console.log('🔍 All payment types:', payments.map(p => p.type || p.payment_type));
        } else {
            console.log('🔍 No payments found in period');
        }

        // Calculate cash in/out using the unified check functions
        const cashIn = payments
            .filter(p => this._isCashIn(p))
            .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);

        const cashOut = payments
            .filter(p => this._isCashOut(p))
            .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);

        console.log('💰 Cash In (RECEIVED/IN):', cashIn);
        console.log('💰 Cash Out (MADE/OUT):', cashOut);

        const netCashFlow = cashIn - cashOut;
        const closingCash = openingBalance + netCashFlow;

        console.log('💰 Opening Balance:', openingBalance);
        console.log('💰 Net Cash Flow:', netCashFlow);
        console.log('💰 Closing Cash:', closingCash);
        console.log('🔍🔍🔍 END CASH CALCULATOR DEBUG 🔍🔍🔍');

        // Build details if requested
        let details = null;
        if (includeDetails) {
            details = {
                cashIn: payments.filter(p => this._isCashIn(p)),
                cashOut: payments.filter(p => this._isCashOut(p)),
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
            // Legacy support for older code that expects these fields
            totalInflows: Number(cashIn.toFixed(2)),
            totalOutflows: Number(cashOut.toFixed(2)),
        };
    }

    /**
     * Calculate net cash from payments
     * Uses the unified check functions
     */
    _calculateNetCash(payments) {
        if (!Array.isArray(payments) || payments.length === 0) return 0;

        return payments.reduce((sum, p) => {
            const amount = this._safeNumber(p.amount);
            if (this._isCashIn(p)) return sum + amount;
            if (this._isCashOut(p)) return sum - amount;
            return sum;
        }, 0);
    }

    /**
     * Group cash by reference type
     * Uses the unified check functions
     */
    _groupByReferenceType(payments, direction) {
        if (!Array.isArray(payments)) return [];

        const filtered = payments.filter(p => {
            if (direction === 'IN') return this._isCashIn(p);
            return this._isCashOut(p);
        });

        const typeMap = {};
        for (const payment of filtered) {
            const key = payment.reference_type || payment.referenceType || 'OTHER';
            if (!typeMap[key]) typeMap[key] = 0;
            typeMap[key] += this._safeNumber(payment.amount);
        }

        return Object.entries(typeMap)
            .map(([type, amount]) => ({ type, amount: Number(amount.toFixed(2)) }))
            .sort((a, b) => b.amount - a.amount);
    }

    /**
     * Get empty result for when no data is available
     */
    _getEmptyResult() {
        return {
            openingCash: 0,
            cashIn: 0,
            cashOut: 0,
            netCashFlow: 0,
            closingCash: 0,
            cashInByType: [],
            cashOutByType: [],
            details: null,
            paymentCount: 0,
            totalInflows: 0,
            totalOutflows: 0,
        };
    }
}

module.exports = CashCalculator;