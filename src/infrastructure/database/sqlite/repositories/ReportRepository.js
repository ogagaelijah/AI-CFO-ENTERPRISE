// src/infrastructure/database/sqlite/repositories/ReportRepository.js
// Postgres async. ⚠️ reports table not in current Supabase schema.

const BaseRepository = require('./BaseRepository');

class ReportRepository extends BaseRepository {
    constructor() {
        super('reports');
    }

    async create(reportData) {
        const result = await this._query(
            `INSERT INTO reports (
                business_id, type, title, data, generated_at, period_start, period_end
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`,
            [
                reportData.businessId,
                reportData.type,
                reportData.title || '',
                JSON.stringify(reportData.data || {}),
                reportData.generatedAt ? reportData.generatedAt.toISOString() : new Date().toISOString(),
                reportData.periodStart ? reportData.periodStart.toISOString() : null,
                reportData.periodEnd ? reportData.periodEnd.toISOString() : null,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM reports WHERE id = $1', [id]);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM reports WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.type) {
            query += ` AND type = $${i++}`;
            params.push(options.type);
        }
        if (options.startDate) {
            query += ` AND generated_at >= $${i++}`;
            params.push(options.startDate.toISOString());
        }
        if (options.endDate) {
            query += ` AND generated_at <= $${i++}`;
            params.push(options.endDate.toISOString());
        }

        query += ' ORDER BY generated_at DESC';

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

    async findByType(businessId, type, options = {}) {
        return this.findByBusinessId(businessId, { ...options, type });
    }

    async findLatestByType(businessId, type) {
        const result = await this._query(
            `SELECT * FROM reports
             WHERE business_id = $1 AND type = $2
             ORDER BY generated_at DESC
             LIMIT 1`,
            [businessId, type]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.title !== undefined) {
            fields.push(`title = $${i++}`);
            values.push(data.title);
        }
        if (data.data !== undefined) {
            fields.push(`data = $${i++}`);
            values.push(JSON.stringify(data.data));
        }
        if (data.generatedAt !== undefined) {
            fields.push(`generated_at = $${i++}`);
            values.push(data.generatedAt.toISOString());
        }
        if (data.periodStart !== undefined) {
            fields.push(`period_start = $${i++}`);
            values.push(data.periodStart ? data.periodStart.toISOString() : null);
        }
        if (data.periodEnd !== undefined) {
            fields.push(`period_end = $${i++}`);
            values.push(data.periodEnd ? data.periodEnd.toISOString() : null);
        }

        fields.push('updated_at = NOW()');

        if (fields.length === 1) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const result = await this._query(
            `UPDATE reports SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Report not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM reports WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async deleteOldReports(businessId, daysToKeep) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this._query(
            'DELETE FROM reports WHERE business_id = $1 AND generated_at < $2',
            [businessId, cutoffDate.toISOString()]
        );
        return result.rowCount;
    }

    _hydrate(row) {
        const Report = require('../../../../domain/entities/Report');
        return new Report({
            id: row.id,
            businessId: row.business_id,
            type: row.type,
            title: row.title,
            data: row.data ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) : {},
            generatedAt: new Date(row.generated_at),
            periodStart: row.period_start ? new Date(row.period_start) : null,
            periodEnd: row.period_end ? new Date(row.period_end) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = ReportRepository;