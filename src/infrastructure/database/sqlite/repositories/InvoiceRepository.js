// src/infrastructure/database/sqlite/repositories/InvoiceRepository.js
// Postgres async. Multi-tenant. Explicit columns only (no key-derived SQL).
// v1.1.0-prod — Added markAsSent, applyPayment.

'use strict';

const BaseRepository = require('./BaseRepository');
const Invoice = require('../../../../domain/entities/Invoice');

class InvoiceRepository extends BaseRepository {
    constructor() {
        super('invoices');
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO invoices (
                business_id, customer_id, project_id, invoice_number,
                issue_date, due_date, status,
                subtotal, tax, total, amount_paid, currency,
                notes, metadata
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7,
                $8, $9, $10, $11, $12,
                $13, $14
            ) RETURNING id`,
            [
                data.businessId,
                data.customerId || null,
                data.projectId || null,
                data.invoiceNumber,
                data.issueDate ? toDateOnly(data.issueDate) : null,
                data.dueDate ? toDateOnly(data.dueDate) : null,
                data.status || 'DRAFT',
                round2(data.subtotal),
                round2(data.tax),
                round2(data.total),
                round2(data.amountPaid),
                data.currency || 'NGN',
                data.notes || '',
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = 'SELECT * FROM invoices WHERE id = $1';
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
        let sql = 'SELECT * FROM invoices WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.status) {
            sql += ` AND status = $${i++}`;
            params.push(options.status);
        }
        if (options.customerId) {
            sql += ` AND customer_id = $${i++}`;
            params.push(options.customerId);
        }
        if (options.projectId) {
            sql += ` AND project_id = $${i++}`;
            params.push(options.projectId);
        }
        if (options.fromDate) {
            sql += ` AND issue_date >= $${i++}`;
            params.push(toDateOnly(options.fromDate));
        }
        if (options.toDate) {
            sql += ` AND issue_date <= $${i++}`;
            params.push(toDateOnly(options.toDate));
        }
        if (options.search) {
            sql += ` AND (invoice_number ILIKE $${i} OR notes ILIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        sql += ' ORDER BY issue_date DESC, id DESC';

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

    async findByCustomer(businessId, customerId, options = {}) {
        return this.findByBusinessId(businessId, { ...options, customerId });
    }

    async findByStatus(businessId, status, options = {}) {
        return this.findByBusinessId(businessId, { ...options, status });
    }

    async findOverdue(businessId, asOf = new Date()) {
        const result = await this._query(
            `SELECT * FROM invoices
             WHERE business_id = $1
               AND status IN ('SENT', 'OVERDUE')
               AND due_date IS NOT NULL
               AND due_date < $2
               AND amount_paid < total
             ORDER BY due_date ASC`,
            [businessId, toDateOnly(asOf)]
        );
        return result.rows.map((r) => this._hydrate(r));
    }

    /**
     * Mark invoice as SENT. Only valid when current status is DRAFT.
     * Returns the updated invoice, or null if not found / not in DRAFT.
     */
    async markAsSent(invoiceId, businessId) {
        const result = await this._query(
            `UPDATE invoices
             SET status = 'SENT',
                 updated_at = NOW()
             WHERE id = $1 AND business_id = $2 AND status = 'DRAFT'
             RETURNING id`,
            [invoiceId, businessId]
        );
        if (result.rowCount === 0) return null;
        return this.findById(invoiceId, businessId);
    }

    /**
     * Apply a payment to an invoice. Increments amount_paid and
     * flips status to PAID when fully settled. Never touches amount
     * other than amount_paid — total is the source of truth.
     *
     * Returns the updated invoice, or null if not found / paid over.
     */
    async applyPayment(invoiceId, businessId, amount) {
        const amt = round2(amount);
        if (amt <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        // Compute new amount_paid and status in SQL for atomicity.
        const result = await this._query(
            `UPDATE invoices
             SET amount_paid = amount_paid + $1,
                 status = CASE
                     WHEN amount_paid + $1 >= total THEN 'PAID'
                     ELSE status
                 END,
                 updated_at = NOW()
             WHERE id = $2
               AND business_id = $3
               AND status IN ('DRAFT', 'SENT', 'OVERDUE')
               AND amount_paid + $1 <= total
             RETURNING id`,
            [amt, invoiceId, businessId]
        );
        if (result.rowCount === 0) return null;
        return this.findById(invoiceId, businessId);
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.customerId !== undefined) {
            fields.push(`customer_id = $${i++}`);
            values.push(data.customerId);
        }
        if (data.projectId !== undefined) {
            fields.push(`project_id = $${i++}`);
            values.push(data.projectId);
        }
        if (data.invoiceNumber !== undefined) {
            fields.push(`invoice_number = $${i++}`);
            values.push(data.invoiceNumber);
        }
        if (data.issueDate !== undefined) {
            fields.push(`issue_date = $${i++}`);
            values.push(data.issueDate ? toDateOnly(data.issueDate) : null);
        }
        if (data.dueDate !== undefined) {
            fields.push(`due_date = $${i++}`);
            values.push(data.dueDate ? toDateOnly(data.dueDate) : null);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(data.status);
        }
        if (data.subtotal !== undefined) {
            fields.push(`subtotal = $${i++}`);
            values.push(round2(data.subtotal));
        }
        if (data.tax !== undefined) {
            fields.push(`tax = $${i++}`);
            values.push(round2(data.tax));
        }
        if (data.total !== undefined) {
            fields.push(`total = $${i++}`);
            values.push(round2(data.total));
        }
        if (data.amountPaid !== undefined) {
            fields.push(`amount_paid = $${i++}`);
            values.push(round2(data.amountPaid));
        }
        if (data.currency !== undefined) {
            fields.push(`currency = $${i++}`);
            values.push(data.currency);
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
            `UPDATE invoices SET ${fields.join(', ')}
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
            'DELETE FROM invoices WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM invoices WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            sql += ` AND status = $${i++}`;
            params.push(filters.status);
        }
        if (filters.customerId) {
            sql += ` AND customer_id = $${i++}`;
            params.push(filters.customerId);
        }
        if (filters.projectId) {
            sql += ` AND project_id = $${i++}`;
            params.push(filters.projectId);
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async getSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int                                              AS total_count,
                COALESCE(SUM(total), 0)::numeric                           AS total_invoiced,
                COALESCE(SUM(amount_paid), 0)::numeric                     AS total_paid,
                COALESCE(SUM(total - amount_paid), 0)::numeric             AS total_outstanding,
                COUNT(*) FILTER (
                    WHERE status IN ('SENT','OVERDUE')
                      AND due_date IS NOT NULL
                      AND due_date < CURRENT_DATE
                      AND amount_paid < total
                )::int                                                     AS overdue_count
             FROM invoices
             WHERE business_id = $1`,
            [businessId]
        );
        const row = result.rows[0] || {};
        return {
            totalCount: Number(row.total_count) || 0,
            totalInvoiced: Number(row.total_invoiced) || 0,
            totalPaid: Number(row.total_paid) || 0,
            totalOutstanding: Number(row.total_outstanding) || 0,
            overdueCount: Number(row.overdue_count) || 0,
        };
    }

    async nextInvoiceNumber(businessId) {
        const result = await this._query(
            `SELECT invoice_number
             FROM invoices
             WHERE business_id = $1
               AND invoice_number ~ '^INV-[0-9]+$'
             ORDER BY CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER) DESC
             LIMIT 1`,
            [businessId]
        );
        const last = result.rows[0]?.invoice_number;
        const lastNum = last ? parseInt(last.slice(4), 10) : 0;
        const next = lastNum + 1;
        return `INV-${String(next).padStart(4, '0')}`;
    }

    _hydrate(row) {
        return new Invoice({
            id: row.id,
            businessId: row.business_id,
            customerId: row.customer_id,
            projectId: row.project_id,
            invoiceNumber: row.invoice_number,
            issueDate: row.issue_date,
            dueDate: row.due_date,
            status: row.status,
            subtotal: Number(row.subtotal) || 0,
            tax: Number(row.tax) || 0,
            total: Number(row.total) || 0,
            amountPaid: Number(row.amount_paid) || 0,
            currency: row.currency,
            notes: row.notes || '',
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

module.exports = InvoiceRepository;