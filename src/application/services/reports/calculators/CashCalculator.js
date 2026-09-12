// src/application/services/reports/calculators/CashCalculator.js
/**
 * CashCalculator - Single source of truth for cash calculations
 *
 * Opening balance is always calculated strictly BEFORE the start of the period
 * to prevent double-counting of the boundary day.
 *
 * Prefers repository.getNetCashBefore() when available.
 * Falls back safely in all cases (including when paymentRepository is missing).
 */
class CashCalculator {
    constructor({ paymentRepository } = {}) {
        this.paymentRepository = paymentRepository || null;
    }

    _safeNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    _safeArray(result) {
        return Array.isArray(result) ? result : [];
    }

    _toDateOnly(value) {
        if (!value) return null;
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    }

    _getPreviousDay(dateStr) {
        const normalized = this._toDateOnly(dateStr);
        if (!normalized) return null;
        const d = new Date(normalized + 'T12:00:00Z');
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
    }

    _isCashIn(payment) {
        const type = String(payment?.type || payment?.payment_type || '').toUpperCase();
        return type === 'IN' || type === 'RECEIVED';
    }

    _isCashOut(payment) {
        const type = String(payment?.type || payment?.payment_type || '').toUpperCase();
        return type === 'OUT' || type === 'MADE';
    }

    /**
     * Safe opening balance calculation
     */
    async _getOpeningBalance(businessId, beforeDate) {
        if (!beforeDate || !this.paymentRepository) return 0;

        // Fast path – only if the method really exists
        if (typeof this.paymentRepository.getNetCashBefore === 'function') {
            try {
                const result = await this.paymentRepository.getNetCashBefore(businessId, beforeDate);
                return this._safeNumber(result);
            } catch (err) {
                console.warn('CashCalculator: getNetCashBefore failed, falling back:', err.message);
            }
        }

        if (typeof this.paymentRepository.sumNetCashBefore === 'function') {
            try {
                const result = await this.paymentRepository.sumNetCashBefore(businessId, beforeDate);
                return this._safeNumber(result);
            } catch (err) {
                console.warn('CashCalculator: sumNetCashBefore failed, falling back:', err.message);
            }
        }

        // Fallback – original behaviour
        if (typeof this.paymentRepository.findByDateRange === 'function') {
            try {
                const result = await this.paymentRepository.findByDateRange(
                    businessId,
                    '2000-01-01',
                    beforeDate
                );
                return this._calculateNetCash(this._safeArray(result));
            } catch (err) {
                console.warn('CashCalculator: findByDateRange fallback failed:', err.message);
            }
        }

        return 0;
    }

    async calculate({
        userId,
        businessId,
        startDate,
        endDate,
        openingDate = null,
        openingCash = null,
        includeDetails = false,
    } = {}) {
        if (!businessId) {
            console.warn('CashCalculator: businessId is required');
            return this._getEmptyResult();
        }

        if (!this.paymentRepository) {
            console.warn('CashCalculator: paymentRepository is missing');
            return this._getEmptyResult();
        }

        const normalizedStart = this._toDateOnly(startDate);
        const normalizedEnd = this._toDateOnly(endDate);

        if (!normalizedStart || !normalizedEnd) {
            console.warn('CashCalculator: invalid startDate or endDate', { startDate, endDate });
            return this._getEmptyResult();
        }

        const openDate = this._toDateOnly(openingDate) || normalizedStart;

        // Opening balance (strictly before the period)
        let openingBalance = (openingCash !== null && openingCash !== undefined)
            ? this._safeNumber(openingCash)
            : null;

        if (openingBalance === null) {
            const openingEnd = this._getPreviousDay(openDate);
            openingBalance = await this._getOpeningBalance(businessId, openingEnd);
        }

        // Period payments
        let payments = [];
        try {
            if (typeof this.paymentRepository.findByDateRange === 'function') {
                const result = await this.paymentRepository.findByDateRange(
                    businessId,
                    normalizedStart,
                    normalizedEnd
                );
                payments = this._safeArray(result);
            }
        } catch (err) {
            console.warn('CashCalculator: Could not fetch period payments:', err.message);
            payments = [];
        }

        const cashIn = payments
            .filter(p => this._isCashIn(p))
            .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);

        const cashOut = payments
            .filter(p => this._isCashOut(p))
            .reduce((sum, p) => sum + this._safeNumber(p.amount), 0);

        const netCashFlow = cashIn - cashOut;
        const closingCash = openingBalance + netCashFlow;

        let details = null;
        if (includeDetails) {
            details = {
                cashIn: payments.filter(p => this._isCashIn(p)),
                cashOut: payments.filter(p => this._isCashOut(p)),
            };
        }

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
            totalInflows: Number(cashIn.toFixed(2)),
            totalOutflows: Number(cashOut.toFixed(2)),
        };
    }

    _calculateNetCash(payments) {
        if (!Array.isArray(payments) || payments.length === 0) return 0;

        return payments.reduce((sum, p) => {
            const amount = this._safeNumber(p.amount);
            if (this._isCashIn(p)) return sum + amount;
            if (this._isCashOut(p)) return sum - amount;
            return sum;
        }, 0);
    }

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