// src/infrastructure/database/sqlite/repositories/ClassRepository.js
// Postgres async. Multi-tenant. Explicit columns only.

'use strict';

const BaseRepository = require('./BaseRepository');
const Class = require('../../../../domain/entities/Class');

class ClassRepository extends BaseRepository {
    constructor() {
        super('classes');
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO classes (
                business_id, name, level, term_fee,
                description, status, metadata
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7
            ) RETURNING id`,
            [
                data.businessId,
                data.name,
                data.level || null,
                Number(data.termFee) || 0,
                data.description || '',
                data.status || 'ACTIVE',
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = 'SELECT * FROM classes WHERE id = $1';
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
        let sql = 'SELECT * FROM classes WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.status) {
            sql += ` AND status = $${i++}`;
            params.push(options.status);
        }
        if (options.level) {
            sql += ` AND level = $${i++}`;
            params.push(options.level);
        }
        if (options.search) {
            sql += ` AND (name ILIKE $${i} OR level ILIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        sql += ' ORDER BY name ASC';

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

    async findActive(businessId) {
        return this.findByBusinessId(businessId, { status: 'ACTIVE' });
    }

    async findByName(businessId, name) {
        const result = await this._query(
            'SELECT * FROM classes WHERE business_id = $1 AND LOWER(name) = LOWER($2)',
            [businessId, name]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${i++}`);
            values.push(data.name);
        }
        if (data.level !== undefined) {
            fields.push(`level = $${i++}`);
            values.push(data.level);
        }
        if (data.termFee !== undefined) {
            fields.push(`term_fee = $${i++}`);
            values.push(Number(data.termFee) || 0);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${i++}`);
            values.push(data.description);
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
            `UPDATE classes SET ${fields.join(', ')}
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
            'DELETE FROM classes WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM classes WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            sql += ` AND status = $${i++}`;
            params.push(filters.status);
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    _hydrate(row) {
        return new Class({
            id: row.id,
            businessId: row.business_id,
            name: row.name,
            level: row.level,
            termFee: Number(row.term_fee) || 0,
            description: row.description || '',
            status: row.status,
            metadata: typeof row.metadata === 'string' ? safeParse(row.metadata) : (row.metadata || {}),
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        });
    }
}

// ── helpers ──
function safeParse(s) {
    try {
        return JSON.parse(s);
    } catch {
        return {};
    }
}

module.exports = ClassRepository;