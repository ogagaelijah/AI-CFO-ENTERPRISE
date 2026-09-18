// src/infrastructure/database/sqlite/repositories/PaymentRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');
const Payment = require('../../../../domain/entities/Payment');

class PaymentRepository extends BaseRepository {
    constructor() {
        super('payments');
    }

    _toISOString(dateInput) {
        if (!dateInput) return null;

        if (dateInput instanceof Date) {
            return dateInput.toISOString();
        }

        if (typeof dateInput === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                return `${dateInput}T00:00:00.000Z`;
            }
            return dateInput;
        }

        return null;
    }

    async create(paymentData) {
        const result = await this._query(
            `INSERT INTO payments (
                business_id, user_id, payment_type, amount, reference_type, reference_id,
                payment_date, payment_method, reference_number, notes, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id`,
            [
                paymentData.businessId,
                paymentData.userId ?? null,
                paymentData.type,
                paymentData.amount,
                paymentData.referenceType || null,
                paymentData.referenceId || null,
                this._toISOString(paymentData.paymentDate || paymentData.date) || new Date().toISOString(),
                paymentData.paymentMethod || 'CASH',
                paymentData.referenceNumber || null,
                paymentData.notes || '',
                JSON.stringify(paymentData.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM payments WHERE id = $1', [id]);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM payments WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.type) {
            query += ` AND payment_type = $${i++}`;
            params.push(options.type);
        }
        if (options.referenceType) {
            query += ` AND reference_type = $${i++}`;
            params.push(options.referenceType);
        }
        if (options.referenceId) {
            query += ` AND reference_id = $${i++}`;
            params.push(options.referenceId);
        }
        if (options.startDate) {
            query += ` AND DATE(payment_date) >= DATE($${i++})`;
            params.push(this._toISOString(options.startDate));
        }
        if (options.endDate) {
            query += ` AND DATE(payment_date) <= DATE($${i++})`;
            params.push(this._toISOString(options.endDate));
        }

        query += ' ORDER BY payment_date DESC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            query += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(query, params);
        return result.rows.map(r => this._hydrate(r));
    }

    async findByUserId(userId, options = {}) {
        let query = 'SELECT * FROM payments WHERE user_id = $1';
        const params = [userId];
        let i = 2;

        if (options.type) {
            query += ` AND payment_type = $${i++}`;
            params.push(options.type);
        }
        if (options.referenceType) {
            query += ` AND reference_type = $${i++}`;
            params.push(options.referenceType);
        }
        if (options.referenceId) {
            query += ` AND reference_id = $${i++}`;
            params.push(options.referenceId);
        }
        if (options.startDate) {
            query += ` AND DATE(payment_date) >= DATE($${i++})`;
            params.push(this._toISOString(options.startDate));
        }
        if (options.endDate) {
            query += ` AND DATE(payment_date) <= DATE($${i++})`;
            params.push(this._toISOString(options.endDate));
        }

        query += ' ORDER BY payment_date DESC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            query += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(query, params);
        return result.rows.map(r => this._hydrate(r));
    }

    async findByReference(businessId, referenceType, referenceId) {
        const result = await this._query(
            `SELECT * FROM payments
             WHERE business_id = $1 AND reference_type = $2 AND reference_id = $3
             ORDER BY payment_date DESC`,
            [businessId, referenceType, referenceId]
        );
        return result.rows.map(r => this._hydrate(r));
    }

    async findByDateRange(businessIdOrUserId, startDate, endDate, options = {}) {
        let results = [];
        try {
            results = await this.findByBusinessId(businessIdOrUserId, {
                ...options,
                startDate,
                endDate,
            });
        } catch (error) {
            console.warn('PaymentRepository.findByBusinessId failed:', error.message);
            results = [];
        }

        if (results.length === 0) {
            try {
                results = await this.findByUserId(businessIdOrUserId, {
                    ...options,
                    startDate,
                    endDate,
                });
            } catch (error) {
                console.warn('PaymentRepository.findByUserId failed:', error.message);
                results = [];
            }
        }

        return results;
    }

    async getNetCashBefore(businessId, beforeDate) {
        if (!businessId || !beforeDate) return 0;

        try {
            const result = await this._query(
                `SELECT COALESCE(SUM(
                    CASE
                        WHEN UPPER(payment_type) IN ('IN', 'RECEIVED') THEN amount
                        WHEN UPPER(payment_type) IN ('OUT', 'MADE') THEN -amount
                        ELSE 0
                    END
                ), 0) AS net
                FROM payments
                WHERE business_id = $1
                  AND DATE(payment_date) < DATE($2)`,
                [businessId, this._toISOString(beforeDate)]
            );

            return Number(result.rows[0]?.net) || 0;
        } catch (error) {
            console.warn('PaymentRepository.getNetCashBefore failed:', error.message);
            return 0;
        }
    }

    async sumNetCashBefore(businessId, beforeDate) {
        return this.getNetCashBefore(businessId, beforeDate);
    }

    /**
     * Cash in/out for a specific date (or date range).
     * Returns { cashIn, cashOut } — the sum of all payments by direction.
     *
     * @param {number} businessId
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} [endDate] - YYYY-MM-DD (defaults to startDate for single-day)
     */
    async getCashFlowForDate(businessId, startDate, endDate = null) {
        if (!businessId || !startDate) {
            return { cashIn: 0, cashOut: 0 };
        }

        const end = endDate || startDate;
        const startIso = this._toISOString(startDate);
        const endIso = this._toISOString(end);

        const result = await this._query(
            `SELECT
                COALESCE(SUM(CASE WHEN UPPER(payment_type) IN ('IN', 'RECEIVED') THEN amount ELSE 0 END), 0) AS cash_in,
                COALESCE(SUM(CASE WHEN UPPER(payment_type) IN ('OUT', 'MADE') THEN amount ELSE 0 END), 0) AS cash_out
             FROM payments
             WHERE business_id = $1
               AND DATE(payment_date) >= DATE($2)
               AND DATE(payment_date) <= DATE($3)`,
            [businessId, startIso, endIso]
        );

        const row = result.rows[0] || {};
        return {
            cashIn: Number(row.cash_in) || 0,
            cashOut: Number(row.cash_out) || 0,
        };
    }

    async findByFilters(filters) {
        return this.findByBusinessId(
            filters.businessId,
            {
                type: filters.type,
                referenceType: filters.referenceType,
                referenceId: filters.referenceId,
                startDate: filters.startDate,
                endDate: filters.endDate,
                limit: filters.limit,
                offset: filters.offset,
            }
        );
    }

    async getSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_payments,
                COALESCE(SUM(CASE WHEN payment_type = 'IN' THEN amount ELSE 0 END), 0) as total_in,
                COALESCE(SUM(CASE WHEN payment_type = 'OUT' THEN amount ELSE 0 END), 0) as total_out,
                COUNT(CASE WHEN payment_type = 'IN' THEN 1 END)::int as count_in,
                COUNT(CASE WHEN payment_type = 'OUT' THEN 1 END)::int as count_out
             FROM payments
             WHERE business_id = $1`,
            [businessId]
        );

        const r = result.rows[0] || {};
        const total_in = Number(r.total_in) || 0;
        const total_out = Number(r.total_out) || 0;

        return {
            total_payments: r.total_payments || 0,
            total_in,
            total_out,
            count_in: r.count_in || 0,
            count_out: r.count_out || 0,
            net_flow: total_in - total_out,
        };
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.type !== undefined) {
            fields.push(`payment_type = $${i++}`);
            values.push(data.type);
        }
        if (data.amount !== undefined) {
            fields.push(`amount = $${i++}`);
            values.push(data.amount);
        }
        if (data.referenceType !== undefined) {
            fields.push(`reference_type = $${i++}`);
            values.push(data.referenceType);
        }
        if (data.referenceId !== undefined) {
            fields.push(`reference_id = $${i++}`);
            values.push(data.referenceId);
        }
        if (data.paymentDate !== undefined || data.date !== undefined) {
            fields.push(`payment_date = $${i++}`);
            values.push(this._toISOString(data.paymentDate || data.date));
        }
        if (data.paymentMethod !== undefined) {
            fields.push(`payment_method = $${i++}`);
            values.push(data.paymentMethod);
        }
        if (data.referenceNumber !== undefined) {
            fields.push(`reference_number = $${i++}`);
            values.push(data.referenceNumber);
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${i++}`);
            values.push(data.notes);
        }
        if (data.metadata !== undefined) {
            fields.push(`metadata = $${i++}`);
            values.push(JSON.stringify(data.metadata));
        }

        fields.push('updated_at = NOW()');

        if (fields.length === 1) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const result = await this._query(
            `UPDATE payments SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Payment not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM payments WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByFilters(filters) {
        let query = 'SELECT COUNT(*)::int as count FROM payments WHERE business_id = $1';
        const params = [filters.businessId];
        let i = 2;

        if (filters.type) {
            query += ` AND payment_type = $${i++}`;
            params.push(filters.type);
        }
        if (filters.referenceType) {
            query += ` AND reference_type = $${i++}`;
            params.push(filters.referenceType);
        }
        if (filters.referenceId) {
            query += ` AND reference_id = $${i++}`;
            params.push(filters.referenceId);
        }
        if (filters.startDate) {
            query += ` AND DATE(payment_date) >= DATE($${i++})`;
            params.push(this._toISOString(filters.startDate));
        }
        if (filters.endDate) {
            query += ` AND DATE(payment_date) <= DATE($${i++})`;
            params.push(this._toISOString(filters.endDate));
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
    }

    _hydrate(row) {
        return new Payment({
            id: row.id,
            businessId: row.business_id,
            userId: row.user_id,
            type: row.payment_type,
            amount: row.amount,
            referenceType: row.reference_type,
            referenceId: row.reference_id,
            paymentDate: new Date(row.payment_date),
            paymentMethod: row.payment_method,
            referenceNumber: row.reference_number,
            notes: row.notes,
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = PaymentRepository;