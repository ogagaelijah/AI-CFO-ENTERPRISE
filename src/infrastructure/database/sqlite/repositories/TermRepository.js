// src/infrastructure/database/sqlite/repositories/TermRepository.js
// Postgres async. Multi-tenant. Explicit columns only.

'use strict';

const BaseRepository = require('./BaseRepository');
const Term = require('../../../../domain/entities/Term');

class TermRepository extends BaseRepository {
    constructor() {
        super('terms');
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO terms (
                business_id, name, session,
                start_date, end_date, status, metadata
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6, $7
            ) RETURNING id`,
            [
                data.businessId,
                data.name,
                data.session,
                toDateOnly(data.startDate),
                toDateOnly(data.endDate),
                data.status || 'ACTIVE',
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = 'SELECT * FROM terms WHERE id = $1';
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
        let sql = 'SELECT * FROM terms WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.status) {
            sql += ` AND status = $${i++}`;
            params.push(options.status);
        }
        if (options.session) {
            sql += ` AND session = $${i++}`;
            params.push(options.session);
        }

        sql += ' ORDER BY start_date DESC, id DESC';

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

    async findByBusinessAndSession(businessId, session) {
        return this.findByBusinessId(businessId, { session });
    }

    async findByBusinessAndName(businessId, session, name) {
        const result = await this._query(
            `SELECT * FROM terms
             WHERE business_id = $1 AND session = $2 AND LOWER(name) = LOWER($3)
             LIMIT 1`,
            [businessId, session, name]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    /**
     * Return the single ACTIVE term for this business, or null.
     * There should only ever be one at a time (enforced at the use-case level).
     */
    async findActive(businessId) {
        const result = await this._query(
            `SELECT * FROM terms
             WHERE business_id = $1 AND status = 'ACTIVE'
             ORDER BY start_date DESC, id DESC
             LIMIT 1`,
            [businessId]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findAllActive(businessId) {
        return this.findByBusinessId(businessId, { status: 'ACTIVE' });
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${i++}`);
            values.push(data.name);
        }
        if (data.session !== undefined) {
            fields.push(`session = $${i++}`);
            values.push(data.session);
        }
        if (data.startDate !== undefined) {
            fields.push(`start_date = $${i++}`);
            values.push(data.startDate ? toDateOnly(data.startDate) : null);
        }
        if (data.endDate !== undefined) {
            fields.push(`end_date = $${i++}`);
            values.push(data.endDate ? toDateOnly(data.endDate) : null);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(data.status);
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
            `UPDATE terms SET ${fields.join(', ')}
             WHERE id = $${i++} AND business_id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            return null;
        }
        return this.findById(id, businessId);
    }

    async delete(id, businessId) {
        const result = await this._query(
            'DELETE FROM terms WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM terms WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            sql += ` AND status = $${i++}`;
            params.push(filters.status);
        }
        if (filters.session) {
            sql += ` AND session = $${i++}`;
            params.push(filters.session);
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    /**
     * Mark every ACTIVE term for this business as COMPLETED except the given id.
     * Used when setting a new ACTIVE term — only one active term at a time.
     */
    async deactivateAllExcept(businessId, keepId) {
        const result = await this._query(
            `UPDATE terms
             SET status = 'COMPLETED', updated_at = NOW()
             WHERE business_id = $1
               AND status = 'ACTIVE'
               AND id <> $2`,
            [businessId, keepId]
        );
        return result.rowCount;
    }

    _hydrate(row) {
        return new Term({
            id: row.id,
            businessId: row.business_id,
            name: row.name,
            session: row.session,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status,
            metadata: typeof row.metadata === 'string' ? safeParse(row.metadata) : (row.metadata || {}),
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        });
    }
}

// ── helpers ──
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

module.exports = TermRepository;