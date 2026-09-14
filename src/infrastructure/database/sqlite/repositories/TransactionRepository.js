// src/infrastructure/database/sqlite/repositories/TransactionRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

class TransactionRepository extends BaseRepository {
    constructor() {
        super('transactions');
    }

    _toISOString(dateInput) {
        if (!dateInput) return null;
        if (dateInput instanceof Date) {
            return dateInput.toISOString();
        }
        if (typeof dateInput === 'string') {
            return dateInput;
        }
        return null;
    }

    async create(transactionData) {
        const result = await this._query(
            `INSERT INTO transactions (
                business_id, user_id, type, category, amount, description,
                payment_status, reference_id, reference_type, date, due_date, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id`,
            [
                transactionData.businessId,
                transactionData.userId ?? null,
                transactionData.type,
                transactionData.category || null,
                transactionData.amount,
                transactionData.description || '',
                transactionData.paymentStatus || 'N/A',
                transactionData.referenceId || null,
                transactionData.referenceType || null,
                this._toISOString(transactionData.date) || new Date().toISOString(),
                this._toISOString(transactionData.dueDate) || null,
                JSON.stringify(transactionData.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM transactions WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.userId) {
            query += ` AND user_id = $${i++}`;
            params.push(options.userId);
        }
        if (options.type) {
            query += ` AND type = $${i++}`;
            params.push(options.type);
        }
        if (options.startDate) {
            query += ` AND date >= $${i++}`;
            params.push(this._toISOString(options.startDate));
        }
        if (options.endDate) {
            query += ` AND date <= $${i++}`;
            params.push(this._toISOString(options.endDate));
        }

        query += ' ORDER BY date DESC';

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

    async findByDateRange(businessId, startDate, endDate, options = {}) {
        return this.findByBusinessId(businessId, {
            ...options,
            startDate,
            endDate,
        });
    }

    async findByReference(businessId, referenceType, referenceId) {
        const result = await this._query(
            `SELECT * FROM transactions
             WHERE business_id = $1 AND reference_type = $2 AND reference_id = $3
             ORDER BY date DESC`,
            [businessId, referenceType, referenceId]
        );
        return result.rows.map(r => this._hydrate(r));
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.userId !== undefined) {
            fields.push(`user_id = $${i++}`);
            values.push(data.userId);
        }
        if (data.type !== undefined) {
            fields.push(`type = $${i++}`);
            values.push(data.type);
        }
        if (data.category !== undefined) {
            fields.push(`category = $${i++}`);
            values.push(data.category);
        }
        if (data.amount !== undefined) {
            fields.push(`amount = $${i++}`);
            values.push(data.amount);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${i++}`);
            values.push(data.description);
        }
        if (data.paymentStatus !== undefined) {
            fields.push(`payment_status = $${i++}`);
            values.push(data.paymentStatus);
        }
        if (data.referenceId !== undefined) {
            fields.push(`reference_id = $${i++}`);
            values.push(data.referenceId);
        }
        if (data.referenceType !== undefined) {
            fields.push(`reference_type = $${i++}`);
            values.push(data.referenceType);
        }
        if (data.date !== undefined) {
            fields.push(`date = $${i++}`);
            values.push(this._toISOString(data.date));
        }
        if (data.dueDate !== undefined) {
            fields.push(`due_date = $${i++}`);
            values.push(this._toISOString(data.dueDate));
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
            `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Transaction not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM transactions WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*)::int as count FROM transactions WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.userId) {
            query += ` AND user_id = $${i++}`;
            params.push(filters.userId);
        }
        if (filters.type) {
            query += ` AND type = $${i++}`;
            params.push(filters.type);
        }
        if (filters.startDate) {
            query += ` AND date >= $${i++}`;
            params.push(this._toISOString(filters.startDate));
        }
        if (filters.endDate) {
            query += ` AND date <= $${i++}`;
            params.push(this._toISOString(filters.endDate));
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
    }

    async getSummary(businessId, options = {}) {
        let query = `
            SELECT
                type,
                COUNT(*)::int as count,
                SUM(amount) as total
            FROM transactions
            WHERE business_id = $1
        `;
        const params = [businessId];
        let i = 2;

        if (options.userId) {
            query += ` AND user_id = $${i++}`;
            params.push(options.userId);
        }
        if (options.startDate) {
            query += ` AND date >= $${i++}`;
            params.push(this._toISOString(options.startDate));
        }
        if (options.endDate) {
            query += ` AND date <= $${i++}`;
            params.push(this._toISOString(options.endDate));
        }

        query += ' GROUP BY type';

        const result = await this._query(query, params);

        const summary = {
            totalCount: 0,
            totalAmount: 0,
            byType: {},
        };

        for (const row of result.rows) {
            const total = Number(row.total) || 0;
            summary.byType[row.type] = {
                count: row.count,
                total,
            };
            summary.totalCount += row.count;
            summary.totalAmount += total;
        }

        return summary;
    }

    _hydrate(row) {
        const Transaction = require('../../../../domain/entities/Transaction');
        return new Transaction({
            id: row.id,
            businessId: row.business_id,
            userId: row.user_id,
            type: row.type,
            category: row.category,
            amount: Number(row.amount),
            description: row.description,
            paymentStatus: row.payment_status,
            referenceId: row.reference_id,
            referenceType: row.reference_type,
            date: new Date(row.date),
            dueDate: row.due_date ? new Date(row.due_date) : null,
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = TransactionRepository;