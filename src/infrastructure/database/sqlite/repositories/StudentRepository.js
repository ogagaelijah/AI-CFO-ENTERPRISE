// src/infrastructure/database/sqlite/repositories/StudentRepository.js
// Postgres async. Multi-tenant. Explicit columns only.

'use strict';

const BaseRepository = require('./BaseRepository');
const Student = require('../../../../domain/entities/Student');

class StudentRepository extends BaseRepository {
    constructor() {
        super('students');
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO students (
                business_id, admission_number, full_name, gender,
                date_of_birth, guardian_name, guardian_phone, guardian_email,
                address, status, enrolled_on, metadata
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11, $12
            ) RETURNING id`,
            [
                data.businessId,
                data.admissionNumber,
                data.fullName,
                data.gender || null,
                data.dateOfBirth ? toDateOnly(data.dateOfBirth) : null,
                data.guardianName || null,
                data.guardianPhone || null,
                data.guardianEmail || null,
                data.address || null,
                data.status || 'ACTIVE',
                data.enrolledOn ? toDateOnly(data.enrolledOn) : toDateOnly(new Date()),
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = 'SELECT * FROM students WHERE id = $1';
        const params = [id];
        if (businessId !== null) {
            sql += ' AND business_id = $2';
            params.push(businessId);
        }
        const result = await this._query(sql, params);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByAdmissionNumber(businessId, admissionNumber) {
        const result = await this._query(
            'SELECT * FROM students WHERE business_id = $1 AND admission_number = $2',
            [businessId, admissionNumber]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let sql = 'SELECT * FROM students WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.status) {
            sql += ` AND status = $${i++}`;
            params.push(options.status);
        }
        if (options.search) {
            sql += ` AND (full_name ILIKE $${i} OR admission_number ILIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        sql += ' ORDER BY full_name ASC';

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

    async findByStatus(businessId, status, options = {}) {
        return this.findByBusinessId(businessId, { ...options, status });
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.admissionNumber !== undefined) {
            fields.push(`admission_number = $${i++}`);
            values.push(data.admissionNumber);
        }
        if (data.fullName !== undefined) {
            fields.push(`full_name = $${i++}`);
            values.push(data.fullName);
        }
        if (data.gender !== undefined) {
            fields.push(`gender = $${i++}`);
            values.push(data.gender);
        }
        if (data.dateOfBirth !== undefined) {
            fields.push(`date_of_birth = $${i++}`);
            values.push(data.dateOfBirth ? toDateOnly(data.dateOfBirth) : null);
        }
        if (data.guardianName !== undefined) {
            fields.push(`guardian_name = $${i++}`);
            values.push(data.guardianName);
        }
        if (data.guardianPhone !== undefined) {
            fields.push(`guardian_phone = $${i++}`);
            values.push(data.guardianPhone);
        }
        if (data.guardianEmail !== undefined) {
            fields.push(`guardian_email = $${i++}`);
            values.push(data.guardianEmail);
        }
        if (data.address !== undefined) {
            fields.push(`address = $${i++}`);
            values.push(data.address);
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
            `UPDATE students SET ${fields.join(', ')}
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
            'DELETE FROM students WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM students WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            sql += ` AND status = $${i++}`;
            params.push(filters.status);
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async countActive(businessId) {
        return this.countByBusinessId(businessId, { status: 'ACTIVE' });
    }

    /**
     * Generate the next admission number for a business.
     * Format: ADM-0001, ADM-0002, ...
     * Atomic within a transaction (query max → +1 → format).
     */
    async nextAdmissionNumber(businessId) {
        const result = await this._query(
            `SELECT admission_number
             FROM students
             WHERE business_id = $1
               AND admission_number ~ '^ADM-[0-9]+$'
             ORDER BY CAST(SUBSTRING(admission_number FROM 5) AS INTEGER) DESC
             LIMIT 1`,
            [businessId]
        );
        const last = result.rows[0]?.admission_number;
        const lastNum = last ? parseInt(last.slice(4), 10) : 0;
        const next = lastNum + 1;
        return `ADM-${String(next).padStart(4, '0')}`;
    }

    _hydrate(row) {
        return new Student({
            id: row.id,
            businessId: row.business_id,
            admissionNumber: row.admission_number,
            fullName: row.full_name,
            gender: row.gender,
            dateOfBirth: row.date_of_birth,
            guardianName: row.guardian_name,
            guardianPhone: row.guardian_phone,
            guardianEmail: row.guardian_email,
            address: row.address,
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

module.exports = StudentRepository;