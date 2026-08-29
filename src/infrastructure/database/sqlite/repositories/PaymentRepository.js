// src/infrastructure/database/sqlite/repositories/PaymentRepository.js

const BaseRepository = require('./BaseRepository');

class PaymentRepository extends BaseRepository {
    constructor(db = null) {
        super('payments', db);
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
            paymentData.userId,
            paymentData.type,
            paymentData.amount,
            paymentData.referenceType || null,
            paymentData.referenceId || null,
            paymentData.paymentDate ? paymentData.paymentDate.toISOString() : new Date().toISOString(),
            paymentData.paymentMethod || null,
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
            query += ' AND payment_date >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND payment_date <= ?';
            params.push(options.endDate.toISOString());
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
     */
    findByDateRange(businessId, startDate, endDate, options = {}) {
        return this.findByBusinessId(businessId, {
            ...options,
            startDate,
            endDate,
        });
    }

    /**
     * Find payments by filters
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
        if (data.paymentDate !== undefined) {
            fields.push('payment_date = ?');
            values.push(data.paymentDate.toISOString());
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
            query += ' AND payment_date >= ?';
            params.push(filters.startDate.toISOString());
        }

        if (filters.endDate) {
            query += ' AND payment_date <= ?';
            params.push(filters.endDate.toISOString());
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    /**
     * Hydrate database row to object (no entity dependency for testing)
     */
    _hydrate(row) {
        return {
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
        };
    }
}

module.exports = PaymentRepository;