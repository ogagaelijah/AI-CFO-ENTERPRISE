// src/infrastructure/database/sqlite/repositories/DebtorRepository.js

const BaseRepository = require('./BaseRepository');

class DebtorRepository extends BaseRepository {
    constructor() {
        super('debtors');
    }

    // ✅ Helper to hydrate data
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
                user_id, customer_name, total_owed, amount_paid, balance_remaining,
                status, due_date, customer_id, customer_type,
                reference_type, reference_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            debtorData.user_id,
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

    findActive(userId) {
        const rows = this.db.prepare(
            `SELECT * FROM debtors 
             WHERE user_id = ? 
             AND balance_remaining > 0 
             AND status != 'PAID'
             ORDER BY balance_remaining DESC`
        ).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    findActiveByUser(userId) {
        return this.findActive(userId);
    }

    getTotalOutstanding(userId) {
        const result = this.db.prepare(
            `SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
             FROM debtors 
             WHERE user_id = ? 
             AND balance_remaining > 0 
             AND status != 'PAID'`
        ).get(userId);
        return result?.total_outstanding || 0;
    }

    findOverdue(userId) {
        const today = new Date().toISOString().split('T')[0];
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

    // ✅ NEW: Find ALL overdue debtors across all users (for notification job)
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

        const stmt = this.db.prepare(`
            UPDATE debtors 
            SET amount_paid = ?,
                balance_remaining = ?,
                status = ?,
                last_payment_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            newPaid,
            newBalance,
            status,
            new Date().toISOString(),
            debtorId
        );

        return this.findById(debtorId);
    }

    getSummary(userId) {
        const result = this.db.prepare(`
            SELECT 
                COUNT(*) as total_debtors,
                COALESCE(SUM(total_owed), 0) as total_owed,
                COALESCE(SUM(amount_paid), 0) as total_paid,
                COALESCE(SUM(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN balance_remaining ELSE 0 END), 0) as total_outstanding,
                COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END) as active_count,
                COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END) as overdue_count
            FROM debtors 
            WHERE user_id = ?
        `).get(userId);

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
        const stmt = this.db.prepare('DELETE FROM debtors WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.customer_name !== undefined) {
            fields.push('customer_name = ?');
            values.push(data.customer_name);
        }
        if (data.customer_id !== undefined) {
            fields.push('customer_id = ?');
            values.push(data.customer_id);
        }
        if (data.customer_type !== undefined) {
            fields.push('customer_type = ?');
            values.push(data.customer_type);
        }
        if (data.total_owed !== undefined) {
            fields.push('total_owed = ?');
            values.push(data.total_owed);
        }
        if (data.amount_paid !== undefined) {
            fields.push('amount_paid = ?');
            values.push(data.amount_paid);
        }
        if (data.balance_remaining !== undefined) {
            fields.push('balance_remaining = ?');
            values.push(data.balance_remaining);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (data.due_date !== undefined) {
            fields.push('due_date = ?');
            values.push(data.due_date);
        }
        if (data.reference_type !== undefined) {
            fields.push('reference_type = ?');
            values.push(data.reference_type);
        }
        if (data.reference_id !== undefined) {
            fields.push('reference_id = ?');
            values.push(data.reference_id);
        }
        if (data.notes !== undefined) {
            fields.push('notes = ?');
            values.push(data.notes);
        }
        if (data.last_payment_date !== undefined) {
            fields.push('last_payment_date = ?');
            values.push(data.last_payment_date);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE debtors SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Debtor not found or no changes made');
        }

        return this.findById(id);
    }

    // ✅ Find by filters for web API
    findByFilters({ businessId, status, customerType, limit = 50, offset = 0 }) {
        let sql = 'SELECT * FROM debtors WHERE user_id = ?';
        const params = [businessId];

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

    // ✅ Count by filters
    countByFilters({ businessId, status, customerType }) {
        let sql = 'SELECT COUNT(*) as total FROM debtors WHERE user_id = ?';
        const params = [businessId];

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