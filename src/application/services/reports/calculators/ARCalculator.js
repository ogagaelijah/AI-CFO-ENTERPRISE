// src/application/services/reports/calculators/ARCalculator.js

/**
 * ARCalculator - Single source of truth for Accounts Receivable calculations
 *
 * Calculates:
 * - Total outstanding AR
 * - Active debtor count
 * - Overdue amount and count
 * - Aging buckets
 * - AR by customer
 */
class ARCalculator {
    constructor({ debtorRepository }) {
        this.debtorRepository = debtorRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num)? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result)? result : [];
    }

    /**
     * Calculate AR metrics
     *
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} [params.asAtDate] - Date for AR snapshot
     * @param {boolean} [params.includeDetails] - Include customer details
     * @param {boolean} [params.includeAging] - Include aging buckets
     * @returns {Object} AR metrics
     */
    async calculate({ userId, businessId, asAtDate = null, includeDetails = false, includeAging = false }) {
        let debtors = [];
        try {
            const result = await this.debtorRepository.findByUserId(userId);
            debtors = this._safeArray(result);
        } catch (error) {
            console.warn('⚠️ ARCalculator: Could not fetch debtors:', error.message);
            debtors = [];
        }

        const activeDebtors = debtors.filter(d => {
            const balance = this._safeNumber(d.balance_remaining);
            return balance > 0 && d.status!== 'PAID';
        });

        const totalOutstanding = activeDebtors.reduce((sum, d) => sum + this._safeNumber(d.balance_remaining), 0);
        const activeCount = activeDebtors.length;
        const totalDebtors = debtors.length;

        // Overdue
        const checkDate = asAtDate? new Date(asAtDate) : new Date();
        const overdueDebtors = activeDebtors.filter(d => {
            if (d.status === 'OVERDUE') return true;
            if (d.due_date && new Date(d.due_date) < checkDate) return true;
            return false;
        });
        const overdueAmount = overdueDebtors.reduce((sum, d) => sum + this._safeNumber(d.balance_remaining), 0);
        const overdueCount = overdueDebtors.length;

        let aging = null;
        if (includeAging) {
            aging = this._calculateAging(activeDebtors);
        }

        let details = null;
        if (includeDetails) {
            details = activeDebtors.map(d => ({
                id: d.id,
                customerName: d.customer_name,
                totalOwed: Number(this._safeNumber(d.total_owed).toFixed(2)),
                amountPaid: Number(this._safeNumber(d.amount_paid).toFixed(2)),
                balanceRemaining: Number(this._safeNumber(d.balance_remaining).toFixed(2)),
                status: d.status,
                dueDate: d.due_date,
            })).sort((a, b) => b.balanceRemaining - a.balanceRemaining);
        }

        return {
            totalOutstanding: Number(totalOutstanding.toFixed(2)),
            activeCount,
            totalDebtors,
            overdueAmount: Number(overdueAmount.toFixed(2)),
            overdueCount,
            averageBalance: activeCount > 0? Number((totalOutstanding / activeCount).toFixed(2)) : 0,
            aging,
            details,
        };
    }

    /**
     * Calculate aging buckets
     */
    _calculateAging(debtors) {
        const now = new Date();
        const buckets = {
            current: 0,
            days1to30: 0,
            days31to60: 0,
            days61to90: 0,
            daysOver90: 0,
        };

        for (const debtor of debtors) {
            const balance = this._safeNumber(debtor.balance_remaining);
            if (balance <= 0) continue;

            let daysOverdue = 0;
            if (debtor.due_date) {
                const dueDate = new Date(debtor.due_date);
                daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
            }

            if (daysOverdue <= 0) {
                buckets.current += balance;
            } else if (daysOverdue <= 30) {
                buckets.days1to30 += balance;
            } else if (daysOverdue <= 60) {
                buckets.days31to60 += balance;
            } else if (daysOverdue <= 90) {
                buckets.days61to90 += balance;
            } else {
                buckets.daysOver90 += balance;
            }
        }

        const total = Object.values(buckets).reduce((sum, v) => sum + v, 0);

        return {
            current: Number(buckets.current.toFixed(2)),
            days1to30: Number(buckets.days1to30.toFixed(2)),
            days31to60: Number(buckets.days31to60.toFixed(2)),
            days61to90: Number(buckets.days61to90.toFixed(2)),
            daysOver90: Number(buckets.daysOver90.toFixed(2)),
            total: Number(total.toFixed(2)),
        };
    }
}

module.exports = ARCalculator;