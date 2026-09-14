// src/infrastructure/database/sqlite/repositories/CreditorRepository.js
// v3.1.0-prod — Postgres async. Same logic as SQLite v3.0.0.

const BaseRepository = require('./BaseRepository');

class CreditorRepository extends BaseRepository {
    constructor() {
        super('creditors');
    }

    _hydrate(row) {
        if (!row) return null;
        return {
            ...row,
            total_owed: Number(row.total_owed) || 0,
            amount_paid: Number(row.amount_paid) || 0,
            balance_remaining: Number(row.balance_remaining) || 0,
        };
    }

    async create(creditorData) {
        const result = await this._query(
            `INSERT INTO creditors (
                user_id, business_id, supplier_id, supplier_name,
                total_owed, amount_paid, balance_remaining,
                status, due_date, reference_type, reference_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id`,
            [
                creditorData.userId ?? creditorData.user_id ?? null,
                creditorData.businessId ?? creditorData.business_id ?? null,
                creditorData.supplier_id ?? creditorData.supplierId ?? null,
                creditorData.supplier_name ?? creditorData.supplierName,
                creditorData.total_owed ?? creditorData.totalOwed,
                creditorData.amount_paid ?? creditorData.amountPaid ?? 0,
                creditorData.balance_remaining ?? creditorData.balanceRemaining ?? creditorData.total_owed ?? creditorData.totalOwed,
                creditorData.status || 'ACTIVE',
                creditorData.due_date ?? creditorData.dueDate ?? null,
                creditorData.reference_type ?? creditorData.referenceType ?? null,
                creditorData.reference_id ?? creditorData.referenceId ?? null,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM creditors WHERE id = $1', [id]);
        return this._hydrate(result.rows[0] || null);
    }

    async findByBusinessId(businessId) {
        const result = await this._query(
            'SELECT * FROM creditors WHERE business_id = $1 ORDER BY balance_remaining DESC',
            [businessId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByUserId(userId) {
        const result = await this._query(
            'SELECT * FROM creditors WHERE user_id = $1 ORDER BY balance_remaining DESC',
            [userId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByFilters({ businessId = null, userId = null, status, limit = 50, offset = 0 }) {
        let sql = 'SELECT * FROM creditors WHERE 1=1';
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

        sql += ` ORDER BY balance_remaining DESC LIMIT $${i++} OFFSET $${i++}`;
        params.push(limit, offset);

        const result = await this._query(sql, params);
        return result.rows.map(row => this._hydrate(row));
    }

    async countByFilters({ businessId = null, userId = null, status }) {
        let sql = 'SELECT COUNT(*)::int as total FROM creditors WHERE 1=1';
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

        const result = await this._query(sql, params);
        return result.rows[0]?.total || 0;
    }

    async findActive(businessId) {
        const result = await this._query(
            `SELECT * FROM creditors
             WHERE business_id = $1
               AND balance_remaining > 0
               AND status != 'PAID'
             ORDER BY balance_remaining DESC`,
            [businessId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async getTotalOutstanding(businessId) {
        const result = await this._query(
            `SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
             FROM creditors
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
            `SELECT * FROM creditors
             WHERE business_id = $1
               AND balance_remaining > 0
               AND status != 'PAID'
               AND due_date IS NOT NULL
               AND DATE(due_date) < DATE($2)
             ORDER BY due_date ASC`,
            [businessId, today]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findBySupplierName(businessId, supplierName) {
        const result = await this._query(
            `SELECT * FROM creditors
             WHERE business_id = $1 AND supplier_name LIKE $2
             ORDER BY balance_remaining DESC`,
            [businessId, `%${supplierName}%`]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findBySupplierId(businessId, supplierId) {
        const result = await this._query(
            `SELECT * FROM creditors
             WHERE business_id = $1 AND supplier_id = $2
             ORDER BY balance_remaining DESC`,
            [businessId, supplierId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByReference(businessId, referenceType, referenceId) {
        const result = await this._query(
            `SELECT * FROM creditors
             WHERE business_id = $1
               AND reference_type = $2
               AND reference_id = $3`,
            [businessId, referenceType, referenceId]
        );
        return this._hydrate(result.rows[0] || null);
    }

    async recordPayment(creditorId, amount) {
        const creditor = await this.findById(creditorId);
        if (!creditor) throw new Error('Creditor not found');

        const newPaid = (creditor.amount_paid || 0) + amount;
        const newBalance = Math.max(0, creditor.total_owed - newPaid);

        let status = 'ACTIVE';
        if (newBalance <= 0) {
            status = 'PAID';
        } else if (creditor.due_date) {
            const today = new Date().toISOString().split('T')[0];
            const dueDateStr = String(creditor.due_date).split('T')[0];
            if (dueDateStr < today) {
                status = 'OVERDUE';
            }
        }

        await this._query(
            `UPDATE creditors
             SET amount_paid = $1,
                 balance_remaining = $2,
                 status = $3,
                 last_payment_date = $4,
                 updated_at = NOW()
             WHERE id = $5`,
            [newPaid, newBalance, status, new Date().toISOString(), creditorId]
        );

        return this.findById(creditorId);
    }

    async createFromPurchase(purchaseData) {
        return this.create({
            user_id: purchaseData.user_id ?? purchaseData.userId,
            business_id: purchaseData.business_id ?? purchaseData.businessId,
            supplier_id: purchaseData.supplier_id ?? purchaseData.supplierId,
            supplier_name: purchaseData.supplier_name ?? purchaseData.supplierName,
            total_owed: purchaseData.total_owed ?? purchaseData.totalOwed,
            amount_paid: purchaseData.amount_paid ?? purchaseData.amountPaid ?? 0,
            balance_remaining: purchaseData.balance_remaining ?? purchaseData.balanceRemaining,
            status: purchaseData.status || 'ACTIVE',
            due_date: purchaseData.due_date ?? purchaseData.dueDate,
            reference_type: 'PURCHASE',
            reference_id: purchaseData.purchase_id ?? purchaseData.id,
        });
    }

    async getSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_creditors,
                COALESCE(SUM(total_owed), 0) as total_owed,
                COALESCE(SUM(amount_paid), 0) as total_paid,
                COALESCE(SUM(balance_remaining), 0) as total_outstanding,
                COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END)::int as active_count,
                COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END)::int as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END)::int as overdue_count
             FROM creditors
             WHERE business_id = $1`,
            [businessId]
        );

        const r = result.rows[0] || {};
        return {
            total_creditors: r.total_creditors || 0,
            total_owed: Number(r.total_owed) || 0,
            total_paid: Number(r.total_paid) || 0,
            total_outstanding: Number(r.total_outstanding) || 0,
            active_count: r.active_count || 0,
            paid_count: r.paid_count || 0,
            overdue_count: r.overdue_count || 0,
        };
    }

    async delete(id) {
        const result = await this._query('DELETE FROM creditors WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = CreditorRepository;