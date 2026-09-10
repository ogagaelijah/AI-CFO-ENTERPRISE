// src/infrastructure/database/sqlite/repositories/DebtorRepository.js
// v2.0.0-prod — Strict business_id with userId fallback
// Relies on migration 027 indexes: (business_id, balance_remaining), (business_id, status)

const BaseRepository = require('./BaseRepository');

class DebtorRepository extends BaseRepository {
    constructor(db = null) {
        super('debtors', db);
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

    create(debtorData) {
        const stmt = this.db.prepare(`
            INSERT INTO debtors (
                user_id, business_id, customer_name, total_owed, amount_paid, balance_remaining,
                status, due_date, customer_id, customer_type,
                reference_type, reference_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            debtorData.user_id,
            debtorData.business_id || null,
            debtorData.customer_name,
            debtorData.total_owed,
            debtorData.amount_paid || 0,
            debtorData.balance_remaining !== undefined ? debtorData.balance_remaining : debtorData.total_owed,
            debtorData.status || 'ACTIVE',
            debtorData.due_date || null,
            debtorData.customer_id || null,
            debtorData.customer_type || 'CUSTOMER',
            debtorData.reference_type || null,
            debtorData.reference_id || null,
            debtorData.notes || null
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM debtors WHERE id = ?').get(id);
        return this._hydrate(row);
    }

    findByUserId(userId) {
        const rows = this.db.prepare(
            'SELECT * FROM debtors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    findByBusinessId(businessId) {
        const rows = this.db.prepare(
            'SELECT * FROM debtors WHERE business_id = ? ORDER BY balance_remaining DESC'
        ).all(businessId);
        return rows.map(row => this._hydrate(row));
    }

    findActive(businessId, userId = null) {
        if (businessId) {
            const rows = this.db.prepare(`
                SELECT * FROM debtors
                WHERE business_id = ?
                  AND balance_remaining > 0
                  AND status != 'PAID'
                ORDER BY balance_remaining DESC
            `).all(businessId);
            return rows.map(row => this._hydrate(row));
        }
        // Fallback for legacy (pre-migration) records
        const rows = this.db.prepare(`
            SELECT * FROM debtors
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
                FROM debtors
                WHERE business_id = ?
                  AND balance_remaining > 0
                  AND status != 'PAID'
            `).get(businessId);
            return result?.total_outstanding || 0;
        }
        // Fallback for legacy records
        const result = this.db.prepare(`
            SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
            FROM debtors
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
                SELECT * FROM debtors
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
            SELECT * FROM debtors
            WHERE user_id = ?
              AND balance_remaining > 0
              AND status != 'PAID'
              AND due_date IS NOT NULL
              AND DATE(due_date) < DATE(?)
            ORDER BY due_date ASC
        `).all(userId, today);
        return rows.map(row => this._hydrate(row));
    }

    findAllOverdue() {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM debtors
            WHERE balance_remaining > 0
              AND status != 'PAID'
              AND due_date IS NOT NULL
              AND DATE(due_date) < DATE(?)
            ORDER BY due_date ASC
        `).all(today);
    }

    findByCustomerName(userId, customerName) {
        const rows = this.db.prepare(`
            SELECT * FROM debtors
            WHERE user_id = ? AND customer_name LIKE ?
            ORDER BY balance_remaining DESC
        `).all(userId, `%${customerName}%`);
        return rows.map(row => this._hydrate(row));
    }

    recordPayment(debtorId, amount) {
        const debtor = this.findById(debtorId);
        if (!debtor) throw new Error('Debtor not found');

        let newBalance = debtor.balance_remaining - amount;
        if (newBalance < 0) newBalance = 0;

        const newPaid = (debtor.amount_paid || 0) + amount;

        let status = debtor.status;
        if (newBalance <= 0) {
            status = 'PAID';
        } else {
            const today = new Date().toISOString().split('T')[0];
            if (debtor.due_date && debtor.due_date.split('T')[0] < today) {
                status = 'OVERDUE';
            } else {
                status = 'ACTIVE';
            }
        }

        this.db.prepare(`
            UPDATE debtors
            SET amount_paid = ?,
                balance_remaining = ?,
                status = ?,
                last_payment_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newPaid, newBalance, status, new Date().toISOString(), debtorId);

        return this.findById(debtorId);
    }

    getSummary(businessId, userId = null) {
        if (businessId) {
            const result = this.db.prepare(`
                SELECT
                    COUNT(*) as total_debtors,
                    COALESCE(SUM(total_owed), 0) as total_owed,
                    COALESCE(SUM(amount_paid), 0) as total_paid,
                    COALESCE(SUM(balance_remaining), 0) as total_outstanding,
                    COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END) as active_count,
                    COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END) as paid_count,
                    COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END) as overdue_count
                FROM debtors
                WHERE business_id = ?
            `).get(businessId);
            return this._summaryShape(result);
        }

        const result = this.db.prepare(`
            SELECT
                COUNT(*) as total_debtors,
                COALESCE(SUM(total_owed), 0) as total_owed,
                COALESCE(SUM(amount_paid), 0) as total_paid,
                COALESCE(SUM(balance_remaining), 0) as total_outstanding,
                COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END) as active_count,
                COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END) as overdue_count
            FROM debtors
            WHERE user_id = ?
        `).get(userId);
        return this._summaryShape(result);
    }

    _summaryShape(result) {
        return {
            total_debtors: result?.total_debtors || 0,
            total_owed: result?.total_owed || 0,
            total_paid: result?.total_paid || 0,
            total_outstanding: result?.total_outstanding || 0,
            active_count: result?.active_count || 0,
            paid_count: result?.paid_count || 0,
            overdue_count: result?.overdue_count || 0,
        };
    }

    delete(id) {
        const result = this.db.prepare('DELETE FROM debtors WHERE id = ?').run(id);
        return result.changes > 0;
    }

    update(id, data) {
        const fields = [];
        const values = [];

        const allowed = [
            'customer_name', 'customer_id', 'customer_type',
            'total_owed', 'amount_paid', 'balance_remaining',
            'status', 'due_date', 'reference_type', 'reference_id',
            'notes', 'last_payment_date', 'business_id',
        ];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }

        if (fields.length === 0) throw new Error('No fields to update');

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const result = this.db.prepare(
            `UPDATE debtors SET ${fields.join(', ')} WHERE id = ?`
        ).run(...values);

        if (result.changes === 0) throw new Error('Debtor not found or no changes made');
        return this.findById(id);
    }

    findByFilters({ businessId = null, userId = null, status, customerType, limit = 50, offset = 0 }) {
        let sql = 'SELECT * FROM debtors WHERE 1=1';
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
        if (customerType) {
            sql += ' AND customer_type = ?';
            params.push(customerType);
        }

        sql += ' ORDER BY balance_remaining DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this._hydrate(row));
    }

    countByFilters({ businessId = null, userId = null, status, customerType }) {
        let sql = 'SELECT COUNT(*) as total FROM debtors WHERE 1=1';
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
        if (customerType) {
            sql += ' AND customer_type = ?';
            params.push(customerType);
        }

        const result = this.db.prepare(sql).get(...params);
        return result?.total || 0;
    }
}

module.exports = DebtorRepository;