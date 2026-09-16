// src/infrastructure/database/sqlite/repositories/TimeEntryRepository.js
// Postgres async. Multi-tenant. Explicit columns only.

'use strict';

const BaseRepository = require('./BaseRepository');
const TimeEntry = require('../../../../domain/entities/TimeEntry');

class TimeEntryRepository extends BaseRepository {
    constructor() {
        super('time_entries');
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO time_entries (
                business_id, project_id, customer_id,
                entry_date, hours, rate,
                description, billable, invoiced, invoice_id, metadata
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6,
                $7, $8, $9, $10, $11
            ) RETURNING id`,
            [
                data.businessId,
                data.projectId || null,
                data.customerId || null,
                data.entryDate ? toDateOnly(data.entryDate) : toDateOnly(new Date()),
                round2(data.hours),
                round2(data.rate),
                data.description || '',
                data.billable !== false,
                data.invoiced === true,
                data.invoiceId || null,
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = 'SELECT * FROM time_entries WHERE id = $1';
        const params = [id];
        if (businessId !== null) {
            sql += ' AND business_id = $2';
            params.push(businessId);
        }
        const result = await this._query(sql, params);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let sql = 'SELECT * FROM time_entries WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.projectId) {
            sql += ` AND project_id = $${i++}`;
            params.push(options.projectId);
        }
        if (options.customerId) {
            sql += ` AND customer_id = $${i++}`;
            params.push(options.customerId);
        }
        if (options.billable !== undefined) {
            sql += ` AND billable = $${i++}`;
            params.push(Boolean(options.billable));
        }
        if (options.invoiced !== undefined) {
            sql += ` AND invoiced = $${i++}`;
            params.push(Boolean(options.invoiced));
        }
        if (options.fromDate) {
            sql += ` AND entry_date >= $${i++}`;
            params.push(toDateOnly(options.fromDate));
        }
        if (options.toDate) {
            sql += ` AND entry_date <= $${i++}`;
            params.push(toDateOnly(options.toDate));
        }
        if (options.search) {
            sql += ` AND description ILIKE $${i++}`;
            params.push(`%${options.search}%`);
        }

        sql += ' ORDER BY entry_date DESC, id DESC';

        if (options.limit) {
            sql += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            sql += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(sql, params);
        return result.rows.map((r) => this._hydrate(r));
    }

    async findByProject(businessId, projectId, options = {}) {
        return this.findByBusinessId(businessId, { ...options, projectId });
    }

    async findUninvoicedBillable(businessId, options = {}) {
        let sql = `SELECT * FROM time_entries
                   WHERE business_id = $1
                     AND billable = TRUE
                     AND invoiced = FALSE`;
        const params = [businessId];
        let i = 2;

        if (options.customerId) {
            sql += ` AND customer_id = $${i++}`;
            params.push(options.customerId);
        }
        if (options.projectId) {
            sql += ` AND project_id = $${i++}`;
            params.push(options.projectId);
        }
        if (options.fromDate) {
            sql += ` AND entry_date >= $${i++}`;
            params.push(toDateOnly(options.fromDate));
        }
        if (options.toDate) {
            sql += ` AND entry_date <= $${i++}`;
            params.push(toDateOnly(options.toDate));
        }

        sql += ' ORDER BY entry_date ASC, id ASC';

        const result = await this._query(sql, params);
        return result.rows.map((r) => this._hydrate(r));
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.projectId !== undefined) {
            fields.push(`project_id = $${i++}`);
            values.push(data.projectId);
        }
        if (data.customerId !== undefined) {
            fields.push(`customer_id = $${i++}`);
            values.push(data.customerId);
        }
        if (data.entryDate !== undefined) {
            fields.push(`entry_date = $${i++}`);
            values.push(data.entryDate ? toDateOnly(data.entryDate) : null);
        }
        if (data.hours !== undefined) {
            fields.push(`hours = $${i++}`);
            values.push(round2(data.hours));
        }
        if (data.rate !== undefined) {
            fields.push(`rate = $${i++}`);
            values.push(round2(data.rate));
        }
        if (data.description !== undefined) {
            fields.push(`description = $${i++}`);
            values.push(data.description);
        }
        if (data.billable !== undefined) {
            fields.push(`billable = $${i++}`);
            values.push(Boolean(data.billable));
        }
        if (data.invoiced !== undefined) {
            fields.push(`invoiced = $${i++}`);
            values.push(Boolean(data.invoiced));
        }
        if (data.invoiceId !== undefined) {
            fields.push(`invoice_id = $${i++}`);
            values.push(data.invoiceId);
        }
        if (data.metadata !== undefined) {
            fields.push(`metadata = $${i++}`);
            values.push(JSON.stringify(data.metadata));
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        fields.push('updated_at = NOW()');
        values.push(id, businessId);

        const result = await this._query(
            `UPDATE time_entries SET ${fields.join(', ')}
             WHERE id = $${i++} AND business_id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            return null;
        }
        return this.findById(id, businessId);
    }

    async markManyInvoiced(ids, businessId, invoiceId) {
        if (!Array.isArray(ids) || ids.length === 0) return 0;
        const result = await this._query(
            `UPDATE time_entries
             SET invoiced = TRUE, invoice_id = $1, updated_at = NOW()
             WHERE business_id = $2 AND id = ANY($3::int[])
               AND billable = TRUE AND invoiced = FALSE`,
            [invoiceId, businessId, ids]
        );
        return result.rowCount;
    }

    async delete(id, businessId) {
        const result = await this._query(
            'DELETE FROM time_entries WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM time_entries WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.projectId) {
            sql += ` AND project_id = $${i++}`;
            params.push(filters.projectId);
        }
        if (filters.invoiced !== undefined) {
            sql += ` AND invoiced = $${i++}`;
            params.push(Boolean(filters.invoiced));
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async getSummary(businessId, options = {}) {
        let where = 'WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.fromDate) {
            where += ` AND entry_date >= $${i++}`;
            params.push(toDateOnly(options.fromDate));
        }
        if (options.toDate) {
            where += ` AND entry_date <= $${i++}`;
            params.push(toDateOnly(options.toDate));
        }

        const result = await this._query(
            `SELECT
                COALESCE(SUM(hours), 0)::numeric                                          AS total_hours,
                COALESCE(SUM(hours) FILTER (WHERE billable = TRUE), 0)::numeric           AS billable_hours,
                COALESCE(SUM(hours * rate) FILTER (WHERE billable = TRUE), 0)::numeric    AS billable_amount,
                COALESCE(SUM(hours * rate) FILTER (WHERE billable = TRUE AND invoiced = FALSE), 0)::numeric AS uninvoiced_amount,
                COUNT(*)::int                                                             AS total_entries
             FROM time_entries
             ${where}`,
            params
        );
        const row = result.rows[0] || {};
        return {
            totalHours: Number(row.total_hours) || 0,
            billableHours: Number(row.billable_hours) || 0,
            billableAmount: Number(row.billable_amount) || 0,
            uninvoicedAmount: Number(row.uninvoiced_amount) || 0,
            totalEntries: Number(row.total_entries) || 0,
        };
    }

    _hydrate(row) {
        return new TimeEntry({
            id: row.id,
            businessId: row.business_id,
            projectId: row.project_id,
            customerId: row.customer_id,
            entryDate: row.entry_date,
            hours: Number(row.hours) || 0,
            rate: Number(row.rate) || 0,
            description: row.description || '',
            billable: row.billable === true,
            invoiced: row.invoiced === true,
            invoiceId: row.invoice_id,
            metadata: typeof row.metadata === 'string' ? safeParse(row.metadata) : (row.metadata || {}),
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        });
    }
}

// ── helpers ──
function round2(n) {
    const v = Number(n) || 0;
    return Math.round(v * 100) / 100;
}

function toDateOnly(d) {
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return String(d).slice(0, 10);
}

function safeParse(s) {
    try {
        return JSON.parse(s);
    } catch {
        return {};
    }
}

module.exports = TimeEntryRepository;