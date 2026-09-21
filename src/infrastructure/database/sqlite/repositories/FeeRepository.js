// src/infrastructure/database/sqlite/repositories/FeeRepository.js
// v1.1.0-prod — Relation fields passed into the Fee entity constructor
//               so Fee.toJSON() includes them.

'use strict';

const BaseRepository = require('./BaseRepository');
const Fee = require('../../../../domain/entities/Fee');

class FeeRepository extends BaseRepository {
    constructor() {
        super('fees');
    }

    static SELECT_WITH_RELATIONS =
        `SELECT f.*,
                s.full_name        AS joined_student_name,
                s.admission_number AS joined_student_admission,
                t.name             AS joined_term_name,
                t.session          AS joined_term_session,
                c.name             AS joined_class_name
         FROM fees f
         LEFT JOIN students s
           ON s.id = f.student_id
          AND s.business_id = f.business_id
         LEFT JOIN terms t
           ON t.id = f.term_id
          AND t.business_id = f.business_id
         LEFT JOIN classes c
           ON c.id = f.class_id
          AND c.business_id = f.business_id`;

    _hydrate(row) {
        if (!row) return null;
        return new Fee({
            id: row.id,
            businessId: row.business_id,
            studentId: row.student_id,
            termId: row.term_id,
            classId: row.class_id,
            feeNumber: row.fee_number,
            description: row.description || '',
            amount: row.amount,
            amountPaid: row.amount_paid,
            currency: row.currency,
            status: row.status,
            issueDate: row.issue_date,
            dueDate: row.due_date,
            notes: row.notes || '',
            metadata: typeof row.metadata === 'string'
                ? safeParse(row.metadata)
                : (row.metadata || {}),
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
            // Relation fields from JOIN
            studentName: row.joined_student_name || null,
            admissionNumber: row.joined_student_admission || null,
            termName: row.joined_term_name || null,
            termSession: row.joined_term_session || null,
            className: row.joined_class_name || null,
        });
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO fees (
                business_id, student_id, term_id, class_id,
                fee_number, description, amount, amount_paid, currency,
                status, issue_date, due_date, notes, metadata
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14
            ) RETURNING id`,
            [
                data.businessId,
                data.studentId,
                data.termId,
                data.classId || null,
                data.feeNumber,
                data.description || '',
                round2(data.amount),
                round2(data.amountPaid || 0),
                data.currency || 'NGN',
                data.status || 'DRAFT',
                toDateOnly(data.issueDate),
                toDateOnly(data.dueDate),
                data.notes || '',
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = `${FeeRepository.SELECT_WITH_RELATIONS} WHERE f.id = $1`;
        const params = [id];
        if (businessId !== null) {
            sql += ' AND f.business_id = $2';
            params.push(businessId);
        }
        const result = await this._query(sql, params);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByDebtorReference(businessId, feeId) {
        return this.findById(feeId, businessId);
    }

    async findByStudentAndTerm(businessId, studentId, termId) {
        const result = await this._query(
            `${FeeRepository.SELECT_WITH_RELATIONS}
             WHERE f.business_id = $1
               AND f.student_id = $2
               AND f.term_id = $3
             LIMIT 1`,
            [businessId, studentId, termId]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let sql = `${FeeRepository.SELECT_WITH_RELATIONS} WHERE f.business_id = $1`;
        const params = [businessId];
        let i = 2;

        if (options.status) {
            sql += ` AND f.status = $${i++}`;
            params.push(options.status);
        }
        if (options.studentId) {
            sql += ` AND f.student_id = $${i++}`;
            params.push(options.studentId);
        }
        if (options.termId) {
            sql += ` AND f.term_id = $${i++}`;
            params.push(options.termId);
        }
        if (options.classId) {
            sql += ` AND f.class_id = $${i++}`;
            params.push(options.classId);
        }
        if (options.search) {
            sql += ` AND (f.fee_number ILIKE $${i} OR f.description ILIKE $${i} OR s.full_name ILIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        sql += ' ORDER BY f.issue_date DESC NULLS LAST, f.id DESC';

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

    async findByStudent(businessId, studentId, options = {}) {
        return this.findByBusinessId(businessId, { ...options, studentId });
    }

    async findByTerm(businessId, termId, options = {}) {
        return this.findByBusinessId(businessId, { ...options, termId });
    }

    async findByStatus(businessId, status, options = {}) {
        return this.findByBusinessId(businessId, { ...options, status });
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.studentId !== undefined) {
            fields.push(`student_id = $${i++}`);
            values.push(data.studentId);
        }
        if (data.termId !== undefined) {
            fields.push(`term_id = $${i++}`);
            values.push(data.termId);
        }
        if (data.classId !== undefined) {
            fields.push(`class_id = $${i++}`);
            values.push(data.classId);
        }
        if (data.feeNumber !== undefined) {
            fields.push(`fee_number = $${i++}`);
            values.push(data.feeNumber);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${i++}`);
            values.push(data.description);
        }
        if (data.amount !== undefined) {
            fields.push(`amount = $${i++}`);
            values.push(round2(data.amount));
        }
        if (data.amountPaid !== undefined) {
            fields.push(`amount_paid = $${i++}`);
            values.push(round2(data.amountPaid));
        }
        if (data.currency !== undefined) {
            fields.push(`currency = $${i++}`);
            values.push(data.currency);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(data.status);
        }
        if (data.issueDate !== undefined) {
            fields.push(`issue_date = $${i++}`);
            values.push(toDateOnly(data.issueDate));
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
            `UPDATE fees SET ${fields.join(', ')}
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
            'DELETE FROM fees WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM fees f WHERE f.business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            sql += ` AND f.status = $${i++}`;
            params.push(filters.status);
        }
        if (filters.studentId) {
            sql += ` AND f.student_id = $${i++}`;
            params.push(filters.studentId);
        }
        if (filters.termId) {
            sql += ` AND f.term_id = $${i++}`;
            params.push(filters.termId);
        }
        if (filters.classId) {
            sql += ` AND f.class_id = $${i++}`;
            params.push(filters.classId);
        }
        if (filters.search) {
            sql += ` AND (f.fee_number ILIKE $${i} OR f.description ILIKE $${i})`;
            params.push(`%${filters.search}%`);
            i++;
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async getSummary(businessId, filters = {}) {
        let sql = `
            SELECT
                COUNT(*)::int                                                AS total_count,
                COALESCE(SUM(amount), 0)::numeric                            AS total_amount,
                COALESCE(SUM(amount_paid), 0)::numeric                       AS total_paid,
                COALESCE(SUM(GREATEST(amount - amount_paid, 0)), 0)::numeric AS total_outstanding,
                COUNT(*) FILTER (
                    WHERE status IN ('SENT','OVERDUE')
                      AND due_date IS NOT NULL
                      AND due_date < CURRENT_DATE
                      AND amount_paid < amount
                )::int                                                       AS overdue_count
            FROM fees
            WHERE business_id = $1`;
        const params = [businessId];
        let i = 2;

        if (filters.termId) {
            sql += ` AND term_id = $${i++}`;
            params.push(filters.termId);
        }
        if (filters.studentId) {
            sql += ` AND student_id = $${i++}`;
            params.push(filters.studentId);
        }
        if (filters.classId) {
            sql += ` AND class_id = $${i++}`;
            params.push(filters.classId);
        }

        const result = await this._query(sql, params);
        const r = result.rows[0] || {};
        return {
            totalCount: Number(r.total_count) || 0,
            totalAmount: Number(r.total_amount) || 0,
            totalPaid: Number(r.total_paid) || 0,
            totalOutstanding: Number(r.total_outstanding) || 0,
            overdueCount: Number(r.overdue_count) || 0,
        };
    }

    async nextFeeNumber(businessId) {
        const result = await this._query(
            `SELECT fee_number
             FROM fees
             WHERE business_id = $1
               AND fee_number ~ '^FEE-[0-9]+$'
             ORDER BY CAST(SUBSTRING(fee_number FROM 5) AS INTEGER) DESC
             LIMIT 1`,
            [businessId]
        );
        const last = result.rows[0]?.fee_number;
        const lastNum = last ? parseInt(last.slice(4), 10) : 0;
        const next = lastNum + 1;
        return `FEE-${String(next).padStart(4, '0')}`;
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

module.exports = FeeRepository;