// src/infrastructure/database/sqlite/repositories/CreditorRepository.js

const BaseRepository = require('./BaseRepository');

class CreditorRepository extends BaseRepository {
    constructor() {
        super('creditors');
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
        return this.db.prepare('SELECT * FROM creditors WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
    }

    findByBusinessId(businessId) {
        return this.db.prepare(
            'SELECT * FROM creditors WHERE business_id = ? ORDER BY balance_remaining DESC'
        ).all(businessId);
    }

    findActive(userId) {
        return this.db.prepare(
            `SELECT * FROM creditors 
             WHERE user_id = ? 
             AND balance_remaining > 0 
             AND status != 'PAID'
             ORDER BY balance_remaining DESC`
        ).all(userId);
    }

    getTotalOutstanding(userId) {
        const result = this.db.prepare(
            `SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
             FROM creditors 
             WHERE user_id = ? 
             AND balance_remaining > 0 
             AND status != 'PAID'`
        ).get(userId);
        return result?.total_outstanding || 0;
    }

    findOverdue(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM creditors 
            WHERE user_id = ? 
            AND balance_remaining > 0 
            AND status != 'PAID'
            AND due_date IS NOT NULL
            AND DATE(due_date) < DATE(?)
            ORDER BY due_date ASC
        `).all(userId, today);
    }

    findBySupplierName(userId, supplierName) {
        return this.db.prepare(`
            SELECT * FROM creditors 
            WHERE user_id = ? AND supplier_name LIKE ? 
            ORDER BY balance_remaining DESC
        `).all(userId, `%${supplierName}%`);
    }

    findBySupplierId(userId, supplierId) {
        return this.db.prepare(`
            SELECT * FROM creditors 
            WHERE user_id = ? AND supplier_id = ? 
            ORDER BY balance_remaining DESC
        `).all(userId, supplierId);
    }

    findByReference(businessId, referenceType, referenceId) {
        return this.db.prepare(`
            SELECT * FROM creditors 
            WHERE business_id = ? 
            AND reference_type = ? 
            AND reference_id = ?
        `).get(businessId, referenceType, referenceId);
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

        const stmt = this.db.prepare(`
            UPDATE creditors 
            SET amount_paid = ?,
                balance_remaining = ?,
                status = ?,
                last_payment_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            newPaid,
            finalBalance,
            status,
            new Date().toISOString(),
            creditorId
        );

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

    getSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_creditors,
                SUM(total_owed) as total_owed,
                SUM(amount_paid) as total_paid,
                SUM(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN balance_remaining ELSE 0 END) as total_outstanding,
                COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END) as active_count,
                COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END) as overdue_count
            FROM creditors 
            WHERE user_id = ?
        `).get(userId);
    }
}

module.exports = CreditorRepository;