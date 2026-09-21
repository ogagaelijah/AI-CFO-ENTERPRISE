// src/infrastructure/database/sqlite/repositories/DebtorRepository.js
// v3.5.0-prod — Read-time LEFT JOIN customers so existing rows with a
//               stale customer_name fall back to the real name.
//               Explicit null-preservation on create.

const BaseRepository = require('./BaseRepository');

class DebtorRepository extends BaseRepository {
    constructor() {
        super('debtors');
    }

    _hydrate(row) {
        if (!row) return null;
        // Prefer the joined customer name over the stored one.
        // Customers table is the source of truth for name.
        const resolvedName =
            row.joined_customer_name !== undefined && row.joined_customer_name !== null
                ? row.joined_customer_name
                : (row.customer_name || null);

        return {
            ...row,
            customer_name: resolvedName,
            total_owed: Number(row.total_owed) || 0,
            amount_paid: Number(row.amount_paid) || 0,
            balance_remaining: Number(row.balance_remaining) || 0,
        };
    }

    // Shared SELECT prefix — keeps the JOIN consistent across every read.
    static SELECT_WITH_CUSTOMER =
        `SELECT d.*, c.name AS joined_customer_name
         FROM debtors d
         LEFT JOIN customers c
           ON c.id = d.customer_id
          AND c.business_id = d.business_id`;

    async create(debtorData) {
        const result = await this._query(
            `INSERT INTO debtors (
                user_id, business_id, customer_name, total_owed, amount_paid, balance_remaining,
                status, due_date, customer_id, customer_type,
                reference_type, reference_id, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id`,
            [
                debtorData.userId ?? debtorData.user_id ?? null,
                debtorData.businessId ?? debtorData.business_id ?? null,
                // Preserve explicit null. Never fall through to a placeholder.
                debtorData.customer_name !== undefined
                    ? debtorData.customer_name
                    : (debtorData.customerName !== undefined ? debtorData.customerName : null),
                debtorData.total_owed ?? debtorData.totalOwed ?? 0,
                debtorData.amount_paid ?? debtorData.amountPaid ?? 0,
                debtorData.balance_remaining ?? debtorData.balanceRemaining
                    ?? debtorData.total_owed ?? debtorData.totalOwed ?? 0,
                debtorData.status || 'ACTIVE',
                debtorData.due_date ?? debtorData.dueDate ?? null,
                debtorData.customer_id ?? debtorData.customerId ?? null,
                debtorData.customer_type ?? debtorData.customerType ?? 'CUSTOMER',
                debtorData.reference_type ?? debtorData.referenceType ?? null,
                debtorData.reference_id ?? debtorData.referenceId ?? null,
                debtorData.notes || null,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER} WHERE d.id = $1`,
            [id]
        );
        return this._hydrate(result.rows[0] || null);
    }

    async findByReference(businessId, referenceType, referenceId) {
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER}
             WHERE d.business_id = $1
               AND d.reference_type = $2
               AND d.reference_id = $3
             LIMIT 1`,
            [businessId, referenceType, referenceId]
        );
        return this._hydrate(result.rows[0] || null);
    }

    async deleteByReference(businessId, referenceType, referenceId) {
        const result = await this._query(
            `DELETE FROM debtors
             WHERE business_id = $1
               AND reference_type = $2
               AND reference_id = $3`,
            [businessId, referenceType, referenceId]
        );
        return result.rowCount > 0;
    }

    async findByBusinessId(businessId) {
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER}
             WHERE d.business_id = $1
             ORDER BY d.balance_remaining DESC`,
            [businessId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByUserId(userId) {
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER}
             WHERE d.user_id = $1
             ORDER BY d.balance_remaining DESC`,
            [userId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findActive(businessId) {
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER}
             WHERE d.business_id = $1
               AND d.balance_remaining > 0
               AND d.status != 'PAID'
             ORDER BY d.balance_remaining DESC`,
            [businessId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async getTotalOutstanding(businessId) {
        const result = await this._query(
            `SELECT COALESCE(SUM(balance_remaining), 0) AS total_outstanding
             FROM debtors
             WHERE business_id = $1
               AND balance_remaining > 0
               AND status != 'PAID'`,
            [businessId]
        );
        return Number(result.rows[0]?.total_outstanding) || 0;
    }

    async findOverdue(businessId) {
        const today = new Date().toISOString().split('T')[0];
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER}
             WHERE d.business_id = $1
               AND d.balance_remaining > 0
               AND d.status != 'PAID'
               AND d.due_date IS NOT NULL
               AND DATE(d.due_date) < DATE($2)
             ORDER BY d.due_date ASC`,
            [businessId, today]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findAllOverdue() {
        const today = new Date().toISOString().split('T')[0];
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER}
             WHERE d.balance_remaining > 0
               AND d.status != 'PAID'
               AND d.due_date IS NOT NULL
               AND DATE(d.due_date) < DATE($1)
             ORDER BY d.due_date ASC`,
            [today]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByCustomerName(businessId, customerName) {
        const result = await this._query(
            `${DebtorRepository.SELECT_WITH_CUSTOMER}
             WHERE d.business_id = $1
               AND d.customer_name LIKE $2
             ORDER BY d.balance_remaining DESC`,
            [businessId, `%${customerName}%`]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async recordPayment(debtorId, amount) {
        const debtor = await this.findById(debtorId);
        if (!debtor) throw new Error('Debtor not found');

        const newBalance = Math.max(0, debtor.balance_remaining - amount);
        const newPaid = (debtor.amount_paid || 0) + amount;

        let status = 'ACTIVE';
        if (newBalance <= 0) {
            status = 'PAID';
        } else if (debtor.due_date) {
            const today = new Date().toISOString().split('T')[0];
            const dueDateStr = String(debtor.due_date).split('T')[0];
            if (dueDateStr < today) {
                status = 'OVERDUE';
            }
        }

        await this._query(
            `UPDATE debtors
             SET amount_paid = $1,
                 balance_remaining = $2,
                 status = $3,
                 last_payment_date = $4,
                 updated_at = NOW()
             WHERE id = $5`,
            [newPaid, newBalance, status, new Date().toISOString(), debtorId]
        );

        return this.findById(debtorId);
    }

    async getSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int AS total_debtors,
                COALESCE(SUM(total_owed), 0) AS total_owed,
                COALESCE(SUM(amount_paid), 0) AS total_paid,
                COALESCE(SUM(balance_remaining), 0) AS total_outstanding,
                COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END)::int AS active_count,
                COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END)::int AS paid_count,
                COUNT(
                    CASE
                        WHEN balance_remaining > 0
                         AND status != 'PAID'
                         AND due_date IS NOT NULL
                         AND DATE(due_date) < CURRENT_DATE
                        THEN 1
                    END
                )::int AS overdue_count
             FROM debtors
             WHERE business_id = $1`,
            [businessId]
        );

        const r = result.rows[0] || {};
        return {
            total_debtors: r.total_debtors || 0,
            total_owed: Number(r.total_owed) || 0,
            total_paid: Number(r.total_paid) || 0,
            total_outstanding: Number(r.total_outstanding) || 0,
            active_count: r.active_count || 0,
            paid_count: r.paid_count || 0,
            overdue_count: r.overdue_count || 0,
        };
    }

    async findByFilters({
        businessId = null, userId = null, status, customerType, limit = 50, offset = 0,
    }) {
        let sql = `${DebtorRepository.SELECT_WITH_CUSTOMER} WHERE 1=1`;
        const params = [];
        let i = 1;

        if (businessId) {
            sql += ` AND d.business_id = $${i++}`;
            params.push(businessId);
        } else if (userId) {
            sql += ` AND d.user_id = $${i++}`;
            params.push(userId);
        }

        if (status) {
            sql += ` AND d.status = $${i++}`;
            params.push(status);
        }
        if (customerType) {
            sql += ` AND d.customer_type = $${i++}`;
            params.push(customerType);
        }

        sql += ` ORDER BY d.balance_remaining DESC LIMIT $${i++} OFFSET $${i++}`;
        params.push(limit, offset);

        const result = await this._query(sql, params);
        return result.rows.map(row => this._hydrate(row));
    }

    async countByFilters({ businessId = null, userId = null, status, customerType }) {
        let sql = 'SELECT COUNT(*)::int AS total FROM debtors WHERE 1=1';
        const params = [];
        let i = 1;

        if (businessId) {
            sql += ` AND business_id = $${i++}`;
            params.push(businessId);
        } else if (userId) {
            sql += ` AND user_id = $${i++}`;
            params.push(userId);
        }

        if (status) {
            sql += ` AND status = $${i++}`;
            params.push(status);
        }
        if (customerType) {
            sql += ` AND customer_type = $${i++}`;
            params.push(customerType);
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.total || 0;
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        const allowed = [
            'customer_name', 'customer_id', 'customer_type',
            'total_owed', 'amount_paid', 'balance_remaining',
            'status', 'due_date', 'reference_type', 'reference_id',
            'notes', 'last_payment_date', 'business_id', 'user_id',
        ];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${i++}`);
                values.push(data[key]);
            }
        }

        if (fields.length === 0) throw new Error('No fields to update');

        fields.push('updated_at = NOW()');
        values.push(id);

        const result = await this._query(
            `UPDATE debtors SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) throw new Error('Debtor not found or no changes made');
        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM debtors WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = DebtorRepository;