// src/infrastructure/database/sqlite/repositories/ReportRepository.js

const BaseRepository = require('./BaseRepository');

class ReportRepository extends BaseRepository {
    constructor() {
        super('reports');
    }

    create(reportData) {
        const stmt = this.db.prepare(`
            INSERT INTO reports (
                business_id, type, title, data, generated_at, period_start, period_end
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            reportData.businessId,
            reportData.type,
            reportData.title || '',
            JSON.stringify(reportData.data || {}),
            reportData.generatedAt ? reportData.generatedAt.toISOString() : new Date().toISOString(),
            reportData.periodStart ? reportData.periodStart.toISOString() : null,
            reportData.periodEnd ? reportData.periodEnd.toISOString() : null
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const result = this.db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM reports WHERE business_id = ?';
        const params = [businessId];

        if (options.type) {
            query += ' AND type = ?';
            params.push(options.type);
        }

        if (options.startDate) {
            query += ' AND generated_at >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND generated_at <= ?';
            params.push(options.endDate.toISOString());
        }

        query += ' ORDER BY generated_at DESC';

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

    findByType(businessId, type, options = {}) {
        return this.findByBusinessId(businessId, { ...options, type });
    }

    findLatestByType(businessId, type) {
        const result = this.db.prepare(`
            SELECT * FROM reports
            WHERE business_id = ? AND type = ?
            ORDER BY generated_at DESC
            LIMIT 1
        `).get(businessId, type);

        if (!result) return null;
        return this._hydrate(result);
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.title !== undefined) {
            fields.push('title = ?');
            values.push(data.title);
        }
        if (data.data !== undefined) {
            fields.push('data = ?');
            values.push(JSON.stringify(data.data));
        }
        if (data.generatedAt !== undefined) {
            fields.push('generated_at = ?');
            values.push(data.generatedAt.toISOString());
        }
        if (data.periodStart !== undefined) {
            fields.push('period_start = ?');
            values.push(data.periodStart ? data.periodStart.toISOString() : null);
        }
        if (data.periodEnd !== undefined) {
            fields.push('period_end = ?');
            values.push(data.periodEnd ? data.periodEnd.toISOString() : null);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE reports SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Report not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM reports WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    deleteOldReports(businessId, daysToKeep) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const stmt = this.db.prepare(
            'DELETE FROM reports WHERE business_id = ? AND generated_at < ?'
        );
        const result = stmt.run(businessId, cutoffDate.toISOString());
        return result.changes;
    }

    _hydrate(row) {
        const Report = require('../../../domain/entities/Report');
        return new Report({
            id: row.id,
            businessId: row.business_id,
            type: row.type,
            title: row.title,
            data: row.data ? JSON.parse(row.data) : {},
            generatedAt: new Date(row.generated_at),
            periodStart: row.period_start ? new Date(row.period_start) : null,
            periodEnd: row.period_end ? new Date(row.period_end) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = ReportRepository;