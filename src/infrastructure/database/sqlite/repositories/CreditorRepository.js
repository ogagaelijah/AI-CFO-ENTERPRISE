// src/infrastructure/database/sqlite/repositories/CreditorRepository.js

const BaseRepository = require('./BaseRepository');

class CreditorRepository extends BaseRepository {
    constructor() {
        super('creditors');
    }

    create(creditorData) {
        const stmt = this.db.prepare(`
            INSERT INTO creditors (user_id, supplier_name, total_owed, balance_remaining, status)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            creditorData.user_id,
            creditorData.supplier_name,
            creditorData.total_owed,
            creditorData.balance_remaining || creditorData.total_owed,
            creditorData.status || 'ACTIVE'
        );
        return this.findById(result.lastInsertRowid);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
    }

    findActive(userId) {
        return this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? AND balance_remaining > 0 ORDER BY balance_remaining DESC'
        ).all(userId);
    }

    findOverdue(userId) {
        return this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? AND status = "OVERDUE" AND balance_remaining > 0 ORDER BY balance_remaining DESC'
        ).all(userId);
    }

    findBySupplierName(userId, supplierName) {
        return this.db.prepare(`
            SELECT * FROM creditors 
            WHERE user_id = ? AND supplier_name LIKE ? 
            ORDER BY balance_remaining DESC
        `).all(userId, `%${supplierName}%`);
    }

    recordPayment(creditorId, amount) {
        const creditor = this.findById(creditorId);
        if (!creditor) throw new Error('Creditor not found');

        const newBalance = creditor.balance_remaining - amount;
        const newPaid = (creditor.amount_paid || 0) + amount;

        let status = creditor.status;
        if (newBalance <= 0) {
            status = 'PAID';
        }

        return this.update(creditorId, {
            amount_paid: newPaid,
            balance_remaining: newBalance > 0 ? newBalance : 0,
            status: status,
            last_payment_date: new Date().toISOString(),
        });
    }

    getSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_creditors,
                SUM(total_owed) as total_owed,
                SUM(amount_paid) as total_paid,
                SUM(balance_remaining) as total_outstanding,
                COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
                COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
            FROM creditors 
            WHERE user_id = ?
        `).get(userId);
    }
}

module.exports = CreditorRepository;