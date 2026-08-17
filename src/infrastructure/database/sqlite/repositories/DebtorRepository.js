// src/infrastructure/database/sqlite/repositories/DebtorRepository.js

const BaseRepository = require('./BaseRepository');

class DebtorRepository extends BaseRepository {
    constructor() {
        super('debtors');
    }

    create(debtorData) {
        const stmt = this.db.prepare(`
            INSERT INTO debtors (user_id, customer_name, total_owed, balance_remaining, status)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            debtorData.user_id,
            debtorData.customer_name,
            debtorData.total_owed,
            debtorData.balance_remaining || debtorData.total_owed,
            debtorData.status || 'ACTIVE'
        );
        return this.findById(result.lastInsertRowid);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM debtors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
    }

    findActive(userId) {
        return this.db.prepare(
            'SELECT * FROM debtors WHERE user_id = ? AND balance_remaining > 0 ORDER BY balance_remaining DESC'
        ).all(userId);
    }

    findOverdue(userId) {
        return this.db.prepare(
            'SELECT * FROM debtors WHERE user_id = ? AND status = "OVERDUE" AND balance_remaining > 0 ORDER BY balance_remaining DESC'
        ).all(userId);
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

        const newBalance = debtor.balance_remaining - amount;
        const newPaid = (debtor.amount_paid || 0) + amount;

        let status = debtor.status;
        if (newBalance <= 0) {
            status = 'PAID';
        }

        return this.update(debtorId, {
            amount_paid: newPaid,
            balance_remaining: newBalance > 0 ? newBalance : 0,
            status: status,
            last_payment_date: new Date().toISOString(),
        });
    }

    getSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_debtors,
                SUM(total_owed) as total_owed,
                SUM(amount_paid) as total_paid,
                SUM(balance_remaining) as total_outstanding,
                COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
                COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
            FROM debtors 
            WHERE user_id = ?
        `).get(userId);
    }
}

module.exports = DebtorRepository;