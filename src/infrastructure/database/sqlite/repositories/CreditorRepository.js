// src/infrastructure/database/sqlite/repositories/CreditorRepository.js
// v2.0.0-prod — Strict business_id with userId fallback
// Relies on migration 027 indexes: (business_id, balance_remaining), (business_id, status)

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
            creditorData.user_id,
            creditorData.business_id || null,
            creditorData.supplier_id || null,
            creditorData.supplier_name,
            creditorData.total_owed,
            creditorData.amount_paid || 0,
            creditorData.balance_remaining || creditorData.total_owed,
            creditorData.status || 'ACTIVE',
            creditorData.due_date || null,
            creditorData.reference_type || null,
            creditorData.reference_id || null
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM creditors WHERE id = ?').get(id);
        return this._hydrate(row);
    }

    findByUserId(userId) {
        const rows = this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    findByBusinessId(businessId) {
        const rows = this.db.prepare(
            'SELECT * FROM creditors WHERE business_id = ? ORDER BY balance_remaining DESC'
        ).all(businessId);
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

    findActive(businessId, userId = null) {
        if (businessId) {
            const rows = this.db.prepare(`
                SELECT * FROM creditors
                WHERE business_id = ?
                  AND balance_remaining > 0
                  AND status != 'PAID'
                ORDER BY balance_remaining DESC
            `).all(businessId);
            return rows.map(row => this._hydrate(row));
        }
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE user_id = ?
              AND balance_remaining > 0
              AND status != 'PAID'
            ORDER BY balance_remaining DESC
        `).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    findActiveByUser(userId) {
        return this.findActive(null, userId);
    }

    getTotalOutstanding(businessId, userId = null) {
        if (businessId) {
            const result = this.db.prepare(`
                SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
                FROM creditors
                WHERE business_id = ?
                  AND balance_remaining > 0
                  AND status != 'PAID'
            `).get(businessId);
            return result?.total_outstanding || 0;
        }
        const result = this.db.prepare(`
            SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
            FROM creditors
            WHERE user_id = ?
              AND balance_remaining > 0
              AND status != 'PAID'
        `).get(userId);
        return result?.total_outstanding || 0;
    }

    findOverdue(businessId, userId = null) {
        const today = new Date().toISOString().split('T')[0];
        if (businessId) {
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
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE user_id = ?
              AND balance_remaining > 0
              AND status != 'PAID'
              AND due_date IS NOT NULL
              AND DATE(due_date) < DATE(?)
            ORDER BY due_date ASC
        `).all(userId, today);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplierName(userId, supplierName) {
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE user_id = ? AND supplier_name LIKE ?
            ORDER BY balance_remaining DESC
        `).all(userId, `%${supplierName}%`);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplierId(userId, supplierId) {
        const rows = this.db.prepare(`
            SELECT * FROM creditors
            WHERE user_id = ? AND supplier_id = ?
            ORDER BY balance_remaining DESC
        `).all(userId, supplierId);
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
        const newBalance = creditor.total_owed - newPaid;
        const finalBalance = newBalance < 0 ? 0 : newBalance;

        let status = creditor.status;
        if (finalBalance <= 0) {
            status = 'PAID';
        } else {
            const today = new Date().toISOString().split('T')[0];
            if (creditor.due_date && creditor.due_date.split('T')[0] < today) {
                status = 'OVERDUE';
            } else {
                status = 'ACTIVE';
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
        `).run(newPaid, finalBalance, status, new Date().toISOString(), creditorId);

        return this.findById(creditorId);
    }

    createFromPurchase(purchaseData) {
        return this.create({
            user_id: purchaseData.user_id,
            business_id: purchaseData.business_id,
            supplier_id: purchaseData.supplier_id,
            supplier_name: purchaseData.supplier_name,
            total_owed: purchaseData.total_owed,
            amount_paid: purchaseData.amount_paid || 0,
            balance_remaining: purchaseData.balance_remaining || purchaseData.total_owed,
            status: purchaseData.status || 'ACTIVE',
            due_date: purchaseData.due_date || null,
            reference_type: 'PURCHASE',
            reference_id: purchaseData.purchase_id || null,
        });
    }

    updateFromPayment(creditorId, amountPaid) {
        return this.recordPayment(creditorId, amountPaid);
    }

    getSummary(businessId, userId = null) {
        if (businessId) {
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
            return this._summaryShape(result);
        }

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
            WHERE user_id = ?
        `).get(userId);
        return this._summaryShape(result);
    }

    _summaryShape(result) {
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