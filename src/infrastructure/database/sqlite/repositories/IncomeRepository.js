// src/infrastructure/database/sqlite/repositories/IncomeRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

class IncomeRepository extends BaseRepository {
    constructor() {
        super('income');
    }

    async create(incomeData) {
        const result = await this._query(
            `INSERT INTO income (
                user_id, business_id, source, amount, description, date
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
                incomeData.userId ?? incomeData.user_id ?? null,
                incomeData.businessId ?? incomeData.business_id ?? null,
                incomeData.source,
                incomeData.amount,
                incomeData.description || null,
                incomeData.date || new Date().toISOString().split('T')[0],
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM income WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM income WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.source) {
            query += ` AND source = $${i++}`;
            params.push(options.source);
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
            'SELECT * FROM income WHERE user_id = $1 ORDER BY date DESC',
            [userId]
        );
        return result.rows;
    }

    async findByDateRange(businessId, startDate, endDate) {
        const result = await this._query(
            `SELECT * FROM income
             WHERE business_id = $1 AND date BETWEEN $2 AND $3
             ORDER BY date DESC`,
            [businessId, startDate, endDate]
        );
        return result.rows;
    }

    async findBySource(businessId, source) {
        const result = await this._query(
            `SELECT * FROM income
             WHERE business_id = $1 AND source = $2
             ORDER BY date DESC`,
            [businessId, source]
        );
        return result.rows;
    }

    async findByFilters({ businessId, source, startDate, endDate, limit = 50, offset = 0 }) {
        return this.findByBusinessId(businessId, {
            source,
            startDate,
            endDate,
            limit,
            offset,
        });
    }

    async getTodayIncome(businessId) {
        const today = new Date().toISOString().split('T')[0];
        const result = await this._query(
            `SELECT * FROM income
             WHERE business_id = $1 AND date = $2
             ORDER BY date DESC`,
            [businessId, today]
        );
        return result.rows;
    }

    async getIncomeSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COUNT(DISTINCT source)::int as sources_used
             FROM income
             WHERE business_id = $1`,
            [businessId]
        );

        const r = result.rows[0] || {};
        return {
            total_entries: r.total_entries || 0,
            total_amount: Number(r.total_amount) || 0,
            average_amount: Number(r.average_amount) || 0,
            sources_used: r.sources_used || 0,
        };
    }

    async getMonthlySummary(businessId, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(DISTINCT source)::int as sources_used
             FROM income
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

        if (data.source !== undefined) {
            fields.push(`source = $${i++}`);
            values.push(data.source);
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
            `UPDATE income SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Income record not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM income WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = IncomeRepository;