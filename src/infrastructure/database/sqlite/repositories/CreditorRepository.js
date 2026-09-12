// src/infrastructure/database/sqlite/repositories/CreditorRepository.js
// v3.0.0-prod — Strict multi-tenant (business_id preferred, user_id kept for compatibility)

const BaseRepository = require('./BaseRepository');

class CreditorRepository extends BaseRepository {
    constructor(db = null) {
        super('creditors', db);
    }

    _hydrate(row) {
        if (!row) return null;
        return {
            ...row,
            total_owed: row.total_owed || 0,
            amount_paid: row.amount_paid || 0,
            balance_remaining: row.balance_remaining || 0,
        };
    }

    create(creditorData) {
        const stmt = this.db.prepare(`
            INSERT INTO creditors (
                user_id, business_id, supplier_id, supplier_name,
                total_owed, amount_paid, balance_remaining,
                status, due_date, reference_type, reference_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
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
            creditorData.reference_id ?? creditorData.referenceId ?? null
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM creditors WHERE id = ?').get(id);
        return this._hydrate(row);
    }

    findByBusinessId(businessId) {
        const rows = this.db.prepare(
            'SELECT * FROM creditors WHERE business_id = ? ORDER BY balance_remaining DESC'
        ).all(businessId);
        return rows.map(row => this._hydrate(row));
    }

    findByUserId(userId) {
        const rows = this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    findByFilters({ businessId = null, userId = null, status, limit = 50, offset = 0 }) {
        let sql = 'SELECT * FROM creditors WHERE 1=1';
        const params = [];

        if (businessId) {
            sql += ' AND business_id = ?';
            params.push(businessId);
        } else if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY balance_remaining DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this._hydrate(row));
    }

    countByFilters({ businessId = null, userId = null, status }) {
        let sql = 'SELECT COUNT(*) as total FROM creditors WHERE 1=1';
        const params = [];

        if (businessId) {
            sql += ' AND business_id = ?';
            params.push(businessId);
        } else if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        const result = this.db.prepare(sql).get(...params);
        return result?.total || 0;
    }

    findActive(businessId) {
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE business_id = ?
              AND balance_remaining > 0
              AND status != 'PAID'
            ORDER BY balance_remaining DESC
        `).all(businessId);
        return rows.map(row => this._hydrate(row));
    }

    getTotalOutstanding(businessId) {
        const result = this.db.prepare(`
            SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
            FROM creditors
            WHERE business_id = ?
              AND balance_remaining > 0
              AND status != 'PAID'
        `).get(businessId);
        return result?.total_outstanding || 0;
    }

    findOverdue(businessId) {
        const today = new Date().toISOString().split('T')[0];
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE business_id = ?
              AND balance_remaining > 0
              AND status != 'PAID'
              AND due_date IS NOT NULL
              AND DATE(due_date) < DATE(?)
            ORDER BY due_date ASC
        `).all(businessId, today);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplierName(businessId, supplierName) {
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE business_id = ? AND supplier_name LIKE ?
            ORDER BY balance_remaining DESC
        `).all(businessId, `%${supplierName}%`);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplierId(businessId, supplierId) {
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE business_id = ? AND supplier_id = ?
            ORDER BY balance_remaining DESC
        `).all(businessId, supplierId);
        return rows.map(row => this._hydrate(row));
    }

    findByReference(businessId, referenceType, referenceId) {
        const row = this.db.prepare(`
            SELECT * FROM creditors
            WHERE business_id = ?
              AND reference_type = ?
              AND reference_id = ?
        `).get(businessId, referenceType, referenceId);
        return this._hydrate(row);
    }

    recordPayment(creditorId, amount) {
        const creditor = this.findById(creditorId);
        if (!creditor) throw new Error('Creditor not found');

        const newPaid = (creditor.amount_paid || 0) + amount;
        const newBalance = Math.max(0, creditor.total_owed - newPaid);

        let status = 'ACTIVE';
        if (newBalance <= 0) {
            status = 'PAID';
        } else if (creditor.due_date) {
            const today = new Date().toISOString().split('T')[0];
            if (creditor.due_date.split('T')[0] < today) {
                status = 'OVERDUE';
            }
        }

        this.db.prepare(`
            UPDATE creditors
            SET amount_paid = ?,
                balance_remaining = ?,
                status = ?,
                last_payment_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newPaid, newBalance, status, new Date().toISOString(), creditorId);

        return this.findById(creditorId);
    }

    createFromPurchase(purchaseData) {
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

    getSummary(businessId) {
        const result = this.db.prepare(`
            SELECT
                COUNT(*) as total_creditors,
                COALESCE(SUM(total_owed), 0) as total_owed,
                COALESCE(SUM(amount_paid), 0) as total_paid,
                COALESCE(SUM(balance_remaining), 0) as total_outstanding,
                COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END) as active_count,
                COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END) as overdue_count
            FROM creditors
            WHERE business_id = ?
        `).get(businessId);

        return {
            total_creditors: result?.total_creditors || 0,
            total_owed: result?.total_owed || 0,
            total_paid: result?.total_paid || 0,
            total_outstanding: result?.total_outstanding || 0,
            active_count: result?.active_count || 0,
            paid_count: result?.paid_count || 0,
            overdue_count: result?.overdue_count || 0,
        };
    }

    delete(id) {
        const result = this.db.prepare('DELETE FROM creditors WHERE id = ?').run(id);
        return result.changes > 0;
    }
}

module.exports = CreditorRepository;