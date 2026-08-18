// src/infrastructure/database/sqlite/repositories/TransactionRepository.js

const BaseRepository = require('./BaseRepository');

class TransactionRepository extends BaseRepository {
    constructor() {
        super('transactions');
    }

    /**
     * Create a new transaction
     * @param {Object} transactionData - Transaction entity data
     * @returns {Promise<Object>} Created transaction
     */
    create(transactionData) {
        const stmt = this.db.prepare(`
            INSERT INTO transactions (
                business_id, type, category, amount, description,
                payment_status, reference_id, reference_type, date, due_date, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            transactionData.businessId,
            transactionData.type,
            transactionData.category,
            transactionData.amount,
            transactionData.description || '',
            transactionData.paymentStatus || 'N/A',
            transactionData.referenceId || null,
            transactionData.referenceType || null,
            transactionData.date || new Date().toISOString(),
            transactionData.dueDate || null,
            JSON.stringify(transactionData.metadata || {})
        );

        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find transaction by ID
     * @param {string|number} id - Transaction ID
     * @returns {Promise<Object|null>} Transaction or null
     */
    findById(id) {
        const result = this.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    /**
     * Find transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, startDate, endDate }
     * @returns {Promise<Array>} Array of transactions
     */
    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM transactions WHERE business_id = ?';
        const params = [businessId];

        if (options.type) {
            query += ' AND type = ?';
            params.push(options.type);
        }

        if (options.startDate) {
            query += ' AND date >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND date <= ?';
            params.push(options.endDate.toISOString());
        }

        query += ' ORDER BY date DESC';

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
     * Find transactions by date range
     * @param {string|number} businessId - Business ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - { type, limit, offset }
     * @returns {Promise<Array>} Array of transactions
     */
    findByDateRange(businessId, startDate, endDate, options = {}) {
        return this.findByBusinessId(businessId, {
            ...options,
            startDate,
            endDate,
        });
    }

    /**
     * Find transactions by reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - SALE, INCOME, PURCHASE, EXPENSE, DEBTOR, CREDITOR
     * @param {string|number} referenceId - Reference ID
     * @returns {Promise<Array>} Array of transactions
     */
    findByReference(businessId, referenceType, referenceId) {
        const results = this.db.prepare(`
            SELECT * FROM transactions
            WHERE business_id = ? AND reference_type = ? AND reference_id = ?
            ORDER BY date DESC
        `).all(businessId, referenceType, referenceId);

        return results.map(r => this._hydrate(r));
    }

    /**
     * Update a transaction
     * @param {string|number} id - Transaction ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated transaction
     */
    update(id, data) {
        const fields = [];
        const values = [];

        if (data.type !== undefined) {
            fields.push('type = ?');
            values.push(data.type);
        }
        if (data.category !== undefined) {
            fields.push('category = ?');
            values.push(data.category);
        }
        if (data.amount !== undefined) {
            fields.push('amount = ?');
            values.push(data.amount);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.paymentStatus !== undefined) {
            fields.push('payment_status = ?');
            values.push(data.paymentStatus);
        }
        if (data.referenceId !== undefined) {
            fields.push('reference_id = ?');
            values.push(data.referenceId);
        }
        if (data.referenceType !== undefined) {
            fields.push('reference_type = ?');
            values.push(data.referenceType);
        }
        if (data.date !== undefined) {
            fields.push('date = ?');
            values.push(data.date.toISOString());
        }
        if (data.dueDate !== undefined) {
            fields.push('due_date = ?');
            values.push(data.dueDate ? data.dueDate.toISOString() : null);
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
            `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Transaction not found or no changes made');
        }

        return this.findById(id);
    }

    /**
     * Delete a transaction
     * @param {string|number} id - Transaction ID
     * @returns {Promise<boolean>} True if deleted
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Count transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, startDate, endDate }
     * @returns {Promise<number>} Count of transactions
     */
    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM transactions WHERE business_id = ?';
        const params = [businessId];

        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }

        if (filters.startDate) {
            query += ' AND date >= ?';
            params.push(filters.startDate.toISOString());
        }

        if (filters.endDate) {
            query += ' AND date <= ?';
            params.push(filters.endDate.toISOString());
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    /**
     * Get transaction summary by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { startDate, endDate }
     * @returns {Promise<Object>} Summary with totals by type
     */
    getSummary(businessId, options = {}) {
        let query = `
            SELECT
                type,
                COUNT(*) as count,
                SUM(amount) as total
            FROM transactions
            WHERE business_id = ?
        `;
        const params = [businessId];

        if (options.startDate) {
            query += ' AND date >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND date <= ?';
            params.push(options.endDate.toISOString());
        }

        query += ' GROUP BY type';

        const results = this.db.prepare(query).all(...params);

        const summary = {
            totalCount: 0,
            totalAmount: 0,
            byType: {},
        };

        for (const row of results) {
            summary.byType[row.type] = {
                count: row.count,
                total: row.total,
            };
            summary.totalCount += row.count;
            summary.totalAmount += row.total || 0;
        }

        return summary;
    }

    /**
     * Hydrate database row to entity
     * @param {Object} row - Database row
     * @returns {Object} Transaction entity
     */
    _hydrate(row) {
        const Transaction = require('../../../domain/entities/Transaction');
        return new Transaction({
            id: row.id,
            businessId: row.business_id,
            type: row.type,
            category: row.category,
            amount: row.amount,
            description: row.description,
            paymentStatus: row.payment_status,
            referenceId: row.reference_id,
            referenceType: row.reference_type,
            date: new Date(row.date),
            dueDate: row.due_date ? new Date(row.due_date) : null,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = TransactionRepository;