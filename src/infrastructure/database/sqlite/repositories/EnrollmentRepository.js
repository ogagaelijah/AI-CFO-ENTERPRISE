// src/infrastructure/database/sqlite/repositories/EnrollmentRepository.js
// Postgres async. Multi-tenant. Explicit columns only.

'use strict';

const BaseRepository = require('./BaseRepository');
const Enrollment = require('../../../../domain/entities/Enrollment');

class EnrollmentRepository extends BaseRepository {
    constructor() {
        super('enrollments');
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO enrollments (
                business_id, student_id, class_id,
                term, session, status, enrolled_on, metadata
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6, $7, $8
            ) RETURNING id`,
            [
                data.businessId,
                data.studentId,
                data.classId,
                data.term,
                data.session,
                data.status || 'ACTIVE',
                data.enrolledOn ? toDateOnly(data.enrolledOn) : toDateOnly(new Date()),
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = 'SELECT * FROM enrollments WHERE id = $1';
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
        let sql = 'SELECT * FROM enrollments WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.status) {
            sql += ` AND status = $${i++}`;
            params.push(options.status);
        }
        if (options.studentId) {
            sql += ` AND student_id = $${i++}`;
            params.push(options.studentId);
        }
        if (options.classId) {
            sql += ` AND class_id = $${i++}`;
            params.push(options.classId);
        }
        if (options.session) {
            sql += ` AND session = $${i++}`;
            params.push(options.session);
        }
        if (options.term) {
            sql += ` AND term = $${i++}`;
            params.push(options.term);
        }

        sql += ' ORDER BY enrolled_on DESC, id DESC';

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

    async findActiveByStudent(businessId, studentId) {
        return this.findByBusinessId(businessId, {
            studentId,
            status: 'ACTIVE',
        });
    }

    async findByClass(businessId, classId, options = {}) {
        return this.findByBusinessId(businessId, { ...options, classId });
    }

    async findBySession(businessId, session, options = {}) {
        return this.findByBusinessId(businessId, { ...options, session });
    }

    /**
     * Find the active enrollment for a student in a specific session + term.
     * Returns the first match or null.
     */
    async findActiveByStudentSessionTerm(businessId, studentId, session, term) {
        const result = await this._query(
            `SELECT * FROM enrollments
             WHERE business_id = $1
               AND student_id = $2
               AND session = $3
               AND term = $4
               AND status = 'ACTIVE'
             LIMIT 1`,
            [businessId, studentId, session, term]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async countActiveByClass(businessId, classId) {
        const result = await this._query(
            `SELECT COUNT(*)::int AS count FROM enrollments
             WHERE business_id = $1
               AND class_id = $2
               AND status = 'ACTIVE'`,
            [businessId, classId]
        );
        return result.rows[0]?.count || 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM enrollments WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            sql += ` AND status = $${i++}`;
            params.push(filters.status);
        }
        if (filters.studentId) {
            sql += ` AND student_id = $${i++}`;
            params.push(filters.studentId);
        }
        if (filters.classId) {
            sql += ` AND class_id = $${i++}`;
            params.push(filters.classId);
        }
        if (filters.session) {
            sql += ` AND session = $${i++}`;
            params.push(filters.session);
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.classId !== undefined) {
            fields.push(`class_id = $${i++}`);
            values.push(data.classId);
        }
        if (data.term !== undefined) {
            fields.push(`term = $${i++}`);
            values.push(data.term);
        }
        if (data.session !== undefined) {
            fields.push(`session = $${i++}`);
            values.push(data.session);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(data.status);
        }
        if (data.enrolledOn !== undefined) {
            fields.push(`enrolled_on = $${i++}`);
            values.push(data.enrolledOn ? toDateOnly(data.enrolledOn) : null);
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
            `UPDATE enrollments SET ${fields.join(', ')}
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
            'DELETE FROM enrollments WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    _hydrate(row) {
        return new Enrollment({
            id: row.id,
            businessId: row.business_id,
            studentId: row.student_id,
            classId: row.class_id,
            term: row.term,
            session: row.session,
            status: row.status,
            enrolledOn: row.enrolled_on,
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

module.exports = EnrollmentRepository;