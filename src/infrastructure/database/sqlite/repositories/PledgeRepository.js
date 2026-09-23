// src/infrastructure/database/sqlite/repositories/PledgeRepository.js
// v1.0.0-prod — Postgres async. Multi-tenant. Explicit columns only.
//
// Reads LEFT JOIN customers so donor names are included for display.

'use strict';

const BaseRepository = require('./BaseRepository');
const Pledge = require('../../../../domain/entities/Pledge');

class PledgeRepository extends BaseRepository {
    constructor() {
        super('pledges');
    }

    static SELECT_WITH_DONOR =
        `SELECT p.*, c.name AS joined_donor_name
         FROM pledges p
         LEFT JOIN customers c
           ON c.id = p.donor_id
          AND c.business_id = p.business_id`;

    _hydrate(row) {
        if (!row) return null;
        return new Pledge({
            id: row.id,
            businessId: row.business_id,
            donorId: row.donor_id,
            amount: row.amount,
            amountFulfilled: row.amount_fulfilled,
            currency: row.currency,
            category: row.category,
            status: row.status,
            pledgeDate: row.pledge_date,
            dueDate: row.due_date,
            notes: row.notes || '',
            metadata: typeof row.metadata === 'string'
                ? safeParse(row.metadata)
                : (row.metadata || {}),
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
            donorName: row.joined_donor_name || null,
        });
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO pledges (
                business_id, donor_id,
                amount, amount_fulfilled, currency, category, status,
                pledge_date, due_date, notes, metadata
            ) VALUES (
                $1, $2,
                $3, $4, $5, $6, $7,
                $8, $9, $10, $11
            ) RETURNING id`,
            [
                data.businessId,
                data.donorId || null,
                round2(data.amount),
                round2(data.amountFulfilled || 0),
                data.currency || 'NGN',
                data.category || 'GENERAL',
                data.status || 'ACTIVE',
                toDateOnly(data.pledgeDate) || toDateOnly(new Date()),
                toDateOnly(data.dueDate),
                data.notes || '',
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = `${PledgeRepository.SELECT_WITH_DONOR} WHERE p.id = $1`;
        const params = [id];
        if (businessId !== null) {
            sql += ' AND p.business_id = $2';
            params.push(businessId);
        }
        const result = await this._query(sql, params);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let sql = `${PledgeRepository.SELECT_WITH_DONOR} WHERE p.business_id = $1`;
        const params = [businessId];
        let i = 2;

        if (options.status) {
            sql += ` AND p.status = $${i++}`;
            params.push(options.status);
        }
        if (options.donorId) {
            sql += ` AND p.donor_id = $${i++}`;
            params.push(options.donorId);
        }
        if (options.category) {
            sql += ` AND p.category = $${i++}`;
            params.push(options.category);
        }
        if (options.search) {
            sql += ` AND (c.name ILIKE $${i} OR p.notes ILIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        sql += ' ORDER BY p.pledge_date DESC, p.id DESC';

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

    async findByDonor(businessId, donorId, options = {}) {
        return this.findByBusinessId(businessId, { ...options, donorId });
    }

    async findByStatus(businessId, status, options = {}) {
        return this.findByBusinessId(businessId, { ...options, status });
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.donorId !== undefined) {
            fields.push(`donor_id = $${i++}`);
            values.push(data.donorId);
        }
        if (data.amount !== undefined) {
            fields.push(`amount = $${i++}`);
            values.push(round2(data.amount));
        }
        if (data.amountFulfilled !== undefined) {
            fields.push(`amount_fulfilled = $${i++}`);
            values.push(round2(data.amountFulfilled));
        }
        if (data.currency !== undefined) {
            fields.push(`currency = $${i++}`);
            values.push(data.currency);
        }
        if (data.category !== undefined) {
            fields.push(`category = $${i++}`);
            values.push(data.category);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(data.status);
        }
        if (data.pledgeDate !== undefined) {
            fields.push(`pledge_date = $${i++}`);
            values.push(toDateOnly(data.pledgeDate));
        }
        if (data.dueDate !== undefined) {
            fields.push(`due_date = $${i++}`);
            values.push(toDateOnly(data.dueDate));
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${i++}`);
            values.push(data.notes);
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
            `UPDATE pledges SET ${fields.join(', ')}
             WHERE id = $${i++} AND business_id = $${i}`,
            values
        );

        if (result.rowCount === 0) return null;
        return this.findById(id, businessId);
    }

    async delete(id, businessId) {
        const result = await this._query(
            'DELETE FROM pledges WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM pledges p WHERE p.business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            sql += ` AND p.status = $${i++}`;
            params.push(filters.status);
        }
        if (filters.donorId) {
            sql += ` AND p.donor_id = $${i++}`;
            params.push(filters.donorId);
        }
        if (filters.category) {
            sql += ` AND p.category = $${i++}`;
            params.push(filters.category);
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async getSummary(businessId, filters = {}) {
        let sql = `
            SELECT
                COUNT(*)::int                                             AS total_count,
                COALESCE(SUM(amount), 0)::numeric                         AS total_pledged,
                COALESCE(SUM(amount_fulfilled), 0)::numeric               AS total_fulfilled,
                COALESCE(SUM(GREATEST(amount - amount_fulfilled, 0)), 0)::numeric AS total_outstanding,
                COUNT(*) FILTER (WHERE status = 'ACTIVE')::int            AS active_count,
                COUNT(*) FILTER (WHERE status = 'FULFILLED')::int         AS fulfilled_count,
                COUNT(*) FILTER (
                    WHERE status IN ('ACTIVE','OVERDUE')
                      AND due_date IS NOT NULL
                      AND due_date < CURRENT_DATE
                      AND amount_fulfilled < amount
                )::int                                                    AS overdue_count
            FROM pledges
            WHERE business_id = $1`;
        const params = [businessId];
        let i = 2;

        if (filters.donorId) {
            sql += ` AND donor_id = $${i++}`;
            params.push(filters.donorId);
        }
        if (filters.category) {
            sql += ` AND category = $${i++}`;
            params.push(filters.category);
        }

        const result = await this._query(sql, params);
        const r = result.rows[0] || {};
        return {
            totalCount: Number(r.total_count) || 0,
            totalPledged: Number(r.total_pledged) || 0,
            totalFulfilled: Number(r.total_fulfilled) || 0,
            totalOutstanding: Number(r.total_outstanding) || 0,
            activeCount: Number(r.active_count) || 0,
            fulfilledCount: Number(r.fulfilled_count) || 0,
            overdueCount: Number(r.overdue_count) || 0,
        };
    }
}

function round2(n) {
    const v = Number(n) || 0;
    return Math.round(v * 100) / 100;
}

function toDateOnly(d) {
    if (d === null || d === undefined) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    if (d instanceof Date) {
        if (Number.isNaN(d.getTime())) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return String(d).slice(0, 10);
}

function safeParse(s) {
    try {
        return JSON.parse(s);
    } catch {
        return {};
    }
}

module.exports = PledgeRepository;