// src/application/services/reports/calculators/APCalculator.js

/**
 * APCalculator - Single source of truth for Accounts Payable calculations
 *
 * Calculates:
 * - Total outstanding AP
 * - Active creditor count
 * - Overdue amount and count
 * - Aging buckets
 * - AP by supplier
 */
class APCalculator {
    constructor({ creditorRepository }) {
        this.creditorRepository = creditorRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num)? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result)? result : [];
    }

    /**
     * Calculate AP metrics
     *
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} [params.asAtDate] - Date for AP snapshot
     * @param {boolean} [params.includeDetails] - Include supplier details
     * @param {boolean} [params.includeAging] - Include aging buckets
     * @returns {Object} AP metrics
     */
    async calculate({ userId, businessId, asAtDate = null, includeDetails = false, includeAging = false }) {
        let creditors = [];
        try {
            const result = await this.creditorRepository.findByUserId(userId);
            creditors = this._safeArray(result);
        } catch (error) {
            console.warn('⚠️ APCalculator: Could not fetch creditors:', error.message);
            creditors = [];
        }

        const activeCreditors = creditors.filter(c => {
            const balance = this._safeNumber(c.balance_remaining);
            return balance > 0 && c.status!== 'PAID';
        });

        const totalOutstanding = activeCreditors.reduce((sum, c) => sum + this._safeNumber(c.balance_remaining), 0);
        const activeCount = activeCreditors.length;
        const totalCreditors = creditors.length;

        // Overdue
        const checkDate = asAtDate? new Date(asAtDate) : new Date();
        const overdueCreditors = activeCreditors.filter(c => {
            if (c.status === 'OVERDUE') return true;
            if (c.due_date && new Date(c.due_date) < checkDate) return true;
            return false;
        });
        const overdueAmount = overdueCreditors.reduce((sum, c) => sum + this._safeNumber(c.balance_remaining), 0);
        const overdueCount = overdueCreditors.length;

        let aging = null;
        if (includeAging) {
            aging = this._calculateAging(activeCreditors);
        }

        let details = null;
        if (includeDetails) {
            details = activeCreditors.map(c => ({
                id: c.id,
                supplierName: c.supplier_name,
                totalOwed: Number(this._safeNumber(c.total_owed).toFixed(2)),
                amountPaid: Number(this._safeNumber(c.amount_paid).toFixed(2)),
                balanceRemaining: Number(this._safeNumber(c.balance_remaining).toFixed(2)),
                status: c.status,
                dueDate: c.due_date,
            })).sort((a, b) => b.balanceRemaining - a.balanceRemaining);
        }

        return {
            totalOutstanding: Number(totalOutstanding.toFixed(2)),
            activeCount,
            totalCreditors,
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
    _calculateAging(creditors) {
        const now = new Date();
        const buckets = {
            current: 0,
            days1to30: 0,
            days31to60: 0,
            days61to90: 0,
            daysOver90: 0,
        };

        for (const creditor of creditors) {
            const balance = this._safeNumber(creditor.balance_remaining);
            if (balance <= 0) continue;

            let daysOverdue = 0;
            if (creditor.due_date) {
                const dueDate = new Date(creditor.due_date);
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

module.exports = APCalculator;