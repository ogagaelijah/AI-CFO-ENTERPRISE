// src/infrastructure/database/sqlite/repositories/ExpenseRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

class ExpenseRepository extends BaseRepository {
    constructor() {
        super('expenses');
    }

    async create(expenseData) {
        const result = await this._query(
            `INSERT INTO expenses (
                user_id, business_id, category, amount, description, date
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
                expenseData.userId ?? expenseData.user_id ?? null,
                expenseData.businessId ?? expenseData.business_id ?? null,
                expenseData.category,
                expenseData.amount,
                expenseData.description || null,
                expenseData.date || new Date().toISOString().split('T')[0],
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM expenses WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM expenses WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.category) {
            query += ` AND category = $${i++}`;
            params.push(options.category);
        }
        if (options.startDate) {
            query += ` AND date >= $${i++}`;
            params.push(options.startDate);
        }
        if (options.endDate) {
            query += ` AND date <= $${i++}`;
            params.push(options.endDate);
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
        return result.rows;
    }

    async findByUserId(userId) {
        const result = await this._query(
            'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC',
            [userId]
        );
        return result.rows;
    }

    async findByDateRange(businessId, startDate, endDate) {
        const result = await this._query(
            `SELECT * FROM expenses
             WHERE business_id = $1 AND date BETWEEN $2 AND $3
             ORDER BY date DESC`,
            [businessId, startDate, endDate]
        );
        return result.rows;
    }

    async findByCategory(businessId, category) {
        const result = await this._query(
            `SELECT * FROM expenses
             WHERE business_id = $1 AND category = $2
             ORDER BY date DESC`,
            [businessId, category]
        );
        return result.rows;
    }

    async findByFilters({ businessId, category, startDate, endDate, limit = 50, offset = 0 }) {
        return this.findByBusinessId(businessId, {
            category,
            startDate,
            endDate,
            limit,
            offset,
        });
    }

    async getTodayExpenses(businessId) {
        const today = new Date().toISOString().split('T')[0];
        const result = await this._query(
            `SELECT * FROM expenses
             WHERE business_id = $1 AND date = $2
             ORDER BY date DESC`,
            [businessId, today]
        );
        return result.rows;
    }

    async getExpenseSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COUNT(DISTINCT category)::int as categories_used
             FROM expenses
             WHERE business_id = $1`,
            [businessId]
        );

        const r = result.rows[0] || {};
        return {
            total_entries: r.total_entries || 0,
            total_amount: Number(r.total_amount) || 0,
            average_amount: Number(r.average_amount) || 0,
            categories_used: r.categories_used || 0,
        };
    }

    async getMonthlySummary(businessId, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(DISTINCT category)::int as categories_used
             FROM expenses
             WHERE business_id = $1
               AND date BETWEEN $2 AND $3`,
            [businessId, startDate, endDate]
        );
        return result.rows[0];
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

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
        if (data.date !== undefined) {
            fields.push(`date = $${i++}`);
            values.push(data.date);
        }
        if (data.businessId !== undefined || data.business_id !== undefined) {
            fields.push(`business_id = $${i++}`);
            values.push(data.businessId ?? data.business_id);
        }
        if (data.userId !== undefined || data.user_id !== undefined) {
            fields.push(`user_id = $${i++}`);
            values.push(data.userId ?? data.user_id);
        }

        fields.push('updated_at = NOW()');

        if (fields.length === 1) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const result = await this._query(
            `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Expense not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM expenses WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = ExpenseRepository;