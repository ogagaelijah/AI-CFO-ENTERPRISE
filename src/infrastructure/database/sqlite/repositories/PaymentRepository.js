// src/infrastructure/database/sqlite/repositories/PaymentRepository.js

const BaseRepository = require('./BaseRepository');
const Payment = require('../../../../domain/entities/Payment');

class PaymentRepository extends BaseRepository {
    constructor(db = null) {
        super('payments', db);
    }

    /**
     * Safely convert any date input to ISO string
     */
    _toISOString(dateInput) {
        if (!dateInput) return null;

        if (dateInput instanceof Date) {
            return dateInput.toISOString();
        }

        if (typeof dateInput === 'string') {
            // If it's only YYYY-MM-DD, append time for consistency
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                return `${dateInput}T00:00:00.000Z`;
            }
            return dateInput;
        }

        return null;
    }

    /**
     * Create a new payment
     */
    create(paymentData) {
        const stmt = this.db.prepare(`
            INSERT INTO payments (
                business_id, user_id, payment_type, amount, reference_type, reference_id,
                payment_date, payment_method, reference_number, notes, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
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
            JSON.stringify(paymentData.metadata || {})
        );

        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find payment by ID
     */
    findById(id) {
        const result = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    /**
     * Find payments by business ID
     */
    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM payments WHERE business_id = ?';
        const params = [businessId];

        if (options.type) {
            query += ' AND payment_type = ?';
            params.push(options.type);
        }

        if (options.referenceType) {
            query += ' AND reference_type = ?';
            params.push(options.referenceType);
        }

        if (options.referenceId) {
            query += ' AND reference_id = ?';
            params.push(options.referenceId);
        }

        if (options.startDate) {
            query += ' AND DATE(payment_date) >= DATE(?)';
            params.push(this._toISOString(options.startDate));
        }

        if (options.endDate) {
            query += ' AND DATE(payment_date) <= DATE(?)';
            params.push(this._toISOString(options.endDate));
        }

        query += ' ORDER BY payment_date DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    /**
     * Find payments by user ID
     */
    findByUserId(userId, options = {}) {
        let query = 'SELECT * FROM payments WHERE user_id = ?';
        const params = [userId];

        if (options.type) {
            query += ' AND payment_type = ?';
            params.push(options.type);
        }

        if (options.referenceType) {
            query += ' AND reference_type = ?';
            params.push(options.referenceType);
        }

        if (options.referenceId) {
            query += ' AND reference_id = ?';
            params.push(options.referenceId);
        }

        if (options.startDate) {
            query += ' AND DATE(payment_date) >= DATE(?)';
            params.push(this._toISOString(options.startDate));
        }

        if (options.endDate) {
            query += ' AND DATE(payment_date) <= DATE(?)';
            params.push(this._toISOString(options.endDate));
        }

        query += ' ORDER BY payment_date DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    /**
     * Find payments by reference
     */
    findByReference(businessId, referenceType, referenceId) {
        const results = this.db.prepare(`
            SELECT * FROM payments
            WHERE business_id = ? AND reference_type = ? AND reference_id = ?
            ORDER BY payment_date DESC
        `).all(businessId, referenceType, referenceId);

        return results.map(r => this._hydrate(r));
    }

    /**
     * Find payments by date range
     * Tries businessId first, falls back to userId if needed
     */
    findByDateRange(businessIdOrUserId, startDate, endDate, options = {}) {
        // Try with businessId first
        let results = [];

        try {
            results = this.findByBusinessId(businessIdOrUserId, {
                ...options,
                startDate,
                endDate,
            });
        } catch (error) {
            console.warn('PaymentRepository.findByBusinessId failed:', error.message);
            results = [];
        }

        // If no results, try with userId (fail-safe)
        if (results.length === 0) {
            try {
                results = this.findByUserId(businessIdOrUserId, {
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

    /**
     * Efficient net cash calculation before a given date (exclusive).
     * Used by CashCalculator for opening balance.
     * Handles both standard (IN/OUT) and legacy (RECEIVED/MADE) types.
     *
     * @param {number|string} businessId
     * @param {string} beforeDate - YYYY-MM-DD (exclusive)
     * @returns {number} net cash before the date
     */
    getNetCashBefore(businessId, beforeDate) {
        if (!businessId || !beforeDate) return 0;

        try {
            const result = this.db.prepare(`
                SELECT COALESCE(SUM(
                    CASE
                        WHEN UPPER(payment_type) IN ('IN', 'RECEIVED') THEN amount
                        WHEN UPPER(payment_type) IN ('OUT', 'MADE') THEN -amount
                        ELSE 0
                    END
                ), 0) AS net
                FROM payments
                WHERE business_id = ?
                  AND DATE(payment_date) < DATE(?)
            `).get(businessId, this._toISOString(beforeDate));

            return Number(result?.net) || 0;
        } catch (error) {
            console.warn('PaymentRepository.getNetCashBefore failed:', error.message);
            return 0;
        }
    }

    /**
     * Alias for compatibility
     */
    sumNetCashBefore(businessId, beforeDate) {
        return this.getNetCashBefore(businessId, beforeDate);
    }

    /**
     * Find payments by filters (options object style)
     */
    findByFilters(filters) {
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

    /**
     * Get payment summary
     */
    getSummary(businessId) {
        const result = this.db.prepare(`
            SELECT 
                COUNT(*) as total_payments,
                COALESCE(SUM(CASE WHEN payment_type = 'IN' THEN amount ELSE 0 END), 0) as total_in,
                COALESCE(SUM(CASE WHEN payment_type = 'OUT' THEN amount ELSE 0 END), 0) as total_out,
                COUNT(CASE WHEN payment_type = 'IN' THEN 1 END) as count_in,
                COUNT(CASE WHEN payment_type = 'OUT' THEN 1 END) as count_out
            FROM payments 
            WHERE business_id = ?
        `).get(businessId);

        return {
            total_payments: result?.total_payments || 0,
            total_in: result?.total_in || 0,
            total_out: result?.total_out || 0,
            count_in: result?.count_in || 0,
            count_out: result?.count_out || 0,
            net_flow: (result?.total_in || 0) - (result?.total_out || 0),
        };
    }

    /**
     * Update a payment
     */
    update(id, data) {
        const fields = [];
        const values = [];

        if (data.type !== undefined) {
            fields.push('payment_type = ?');
            values.push(data.type);
        }
        if (data.amount !== undefined) {
            fields.push('amount = ?');
            values.push(data.amount);
        }
        if (data.referenceType !== undefined) {
            fields.push('reference_type = ?');
            values.push(data.referenceType);
        }
        if (data.referenceId !== undefined) {
            fields.push('reference_id = ?');
            values.push(data.referenceId);
        }
        if (data.paymentDate !== undefined || data.date !== undefined) {
            fields.push('payment_date = ?');
            values.push(this._toISOString(data.paymentDate || data.date));
        }
        if (data.paymentMethod !== undefined) {
            fields.push('payment_method = ?');
            values.push(data.paymentMethod);
        }
        if (data.referenceNumber !== undefined) {
            fields.push('reference_number = ?');
            values.push(data.referenceNumber);
        }
        if (data.notes !== undefined) {
            fields.push('notes = ?');
            values.push(data.notes);
        }
        if (data.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(data.metadata));
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Payment not found or no changes made');
        }

        return this.findById(id);
    }

    /**
     * Delete a payment
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM payments WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Count payments by filters
     */
    countByFilters(filters) {
        let query = 'SELECT COUNT(*) as count FROM payments WHERE business_id = ?';
        const params = [filters.businessId];

        if (filters.type) {
            query += ' AND payment_type = ?';
            params.push(filters.type);
        }

        if (filters.referenceType) {
            query += ' AND reference_type = ?';
            params.push(filters.referenceType);
        }

        if (filters.referenceId) {
            query += ' AND reference_id = ?';
            params.push(filters.referenceId);
        }

        if (filters.startDate) {
            query += ' AND DATE(payment_date) >= DATE(?)';
            params.push(this._toISOString(filters.startDate));
        }

        if (filters.endDate) {
            query += ' AND DATE(payment_date) <= DATE(?)';
            params.push(this._toISOString(filters.endDate));
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    /**
     * Hydrate database row to Payment entity
     */
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
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = PaymentRepository;