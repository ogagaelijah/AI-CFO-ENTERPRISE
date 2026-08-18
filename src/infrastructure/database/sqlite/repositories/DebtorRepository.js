// src/infrastructure/database/sqlite/repositories/DebtorRepository.js

const BaseRepository = require('./BaseRepository');

class DebtorRepository extends BaseRepository {
    constructor() {
        super('debtors');
    }

    create(debtorData) {
        const stmt = this.db.prepare(`
            INSERT INTO debtors (user_id, customer_name, total_owed, balance_remaining, status, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            debtorData.user_id,
            debtorData.customer_name,
            debtorData.total_owed,
            debtorData.balance_remaining || debtorData.total_owed,
            debtorData.status || 'ACTIVE',
            debtorData.due_date || null
        );
        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM debtors WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM debtors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
    }

    findActive(userId) {
        return this.db.prepare(
            `SELECT * FROM debtors 
             WHERE user_id = ? 
             AND balance_remaining > 0 
             AND status != 'PAID'
             ORDER BY balance_remaining DESC`
        ).all(userId);
    }

    findOverdue(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM debtors 
            WHERE user_id = ? 
            AND balance_remaining > 0 
            AND status != 'PAID'
            AND due_date IS NOT NULL
            AND DATE(due_date) < DATE(?)
            ORDER BY due_date ASC
        `).all(userId, today);
    }

    findByCustomerName(userId, customerName) {
        return this.db.prepare(`
            SELECT * FROM debtors 
            WHERE user_id = ? AND customer_name LIKE ? 
            ORDER BY balance_remaining DESC
        `).all(userId, `%${customerName}%`);
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
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_debtors,
                SUM(total_owed) as total_owed,
                SUM(amount_paid) as total_paid,
                SUM(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN balance_remaining ELSE 0 END) as total_outstanding,
                COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END) as active_count,
                COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END) as overdue_count
            FROM debtors 
            WHERE user_id = ?
        `).get(userId);
    }
}

module.exports = DebtorRepository;