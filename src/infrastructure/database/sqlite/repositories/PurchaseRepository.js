// src/infrastructure/database/sqlite/repositories/PurchaseRepository.js

const BaseRepository = require('./BaseRepository');

class PurchaseRepository extends BaseRepository {
    constructor() {
        super('purchases');
    }

    create(purchaseData) {
        // ✅ Ensure all values are properly converted to SQLite-compatible types
        const userId = purchaseData.user_id !== undefined && purchaseData.user_id !== null ? purchaseData.user_id : null;
        const businessId = purchaseData.business_id !== undefined && purchaseData.business_id !== null ? purchaseData.business_id : null;
        const supplierId = purchaseData.supplier_id !== undefined && purchaseData.supplier_id !== null ? purchaseData.supplier_id : null;
        const supplierName = purchaseData.supplier_name || null;
        const itemName = purchaseData.item_name || null;
        const quantity = purchaseData.quantity || 0;
        const unitCost = purchaseData.unit_cost || 0;
        const totalCost = purchaseData.total_cost || 0;
        const paymentStatus = purchaseData.payment_status || 'UNPAID';
        const amountPaid = purchaseData.amount_paid || 0;
        const balanceRemaining = purchaseData.balance_remaining || 0;
        const dueDate = purchaseData.due_date || null;
        const purchaseDate = purchaseData.purchase_date || new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO purchases (
                user_id, business_id, supplier_id, supplier_name, item_name, 
                quantity, unit_cost, total_cost, payment_status, 
                amount_paid, balance_remaining, due_date, purchase_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            userId,
            businessId,
            supplierId,
            supplierName,
            itemName,
            quantity,
            unitCost,
            totalCost,
            paymentStatus,
            amountPaid,
            balanceRemaining,
            dueDate,
            purchaseDate
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM purchases WHERE user_id = ? ORDER BY purchase_date DESC'
        ).all(userId);
    }

    findByBusinessId(businessId) {
        return this.db.prepare(
            'SELECT * FROM purchases WHERE business_id = ? ORDER BY purchase_date DESC'
        ).all(businessId);
    }

    findByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND DATE(purchase_date) BETWEEN ? AND ? 
            ORDER BY purchase_date DESC
        `).all(userId, startDate, endDate);
    }

    findByItemName(userId, itemName) {
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND item_name LIKE ? 
            ORDER BY purchase_date DESC
        `).all(userId, `%${itemName}%`);
    }

    findBySupplier(userId, supplierName) {
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND supplier_name LIKE ? 
            ORDER BY purchase_date DESC
        `).all(userId, `%${supplierName}%`);
    }

    findBySupplierId(userId, supplierId) {
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND supplier_id = ? 
            ORDER BY purchase_date DESC
        `).all(userId, supplierId);
    }

    getTodayPurchases(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND DATE(purchase_date) = ? 
            ORDER BY purchase_date DESC
        `).all(userId, today);
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.supplier_name !== undefined) {
            fields.push('supplier_name = ?');
            values.push(data.supplier_name);
        }
        if (data.supplier_id !== undefined) {
            fields.push('supplier_id = ?');
            values.push(data.supplier_id);
        }
        if (data.item_name !== undefined) {
            fields.push('item_name = ?');
            values.push(data.item_name);
        }
        if (data.quantity !== undefined) {
            fields.push('quantity = ?');
            values.push(data.quantity);
        }
        if (data.unit_cost !== undefined) {
            fields.push('unit_cost = ?');
            values.push(data.unit_cost);
        }
        if (data.total_cost !== undefined) {
            fields.push('total_cost = ?');
            values.push(data.total_cost);
        }
        if (data.payment_status !== undefined) {
            fields.push('payment_status = ?');
            values.push(data.payment_status);
        }
        if (data.amount_paid !== undefined) {
            fields.push('amount_paid = ?');
            values.push(data.amount_paid);
        }
        if (data.balance_remaining !== undefined) {
            fields.push('balance_remaining = ?');
            values.push(data.balance_remaining);
        }
        if (data.due_date !== undefined) {
            fields.push('due_date = ?');
            values.push(data.due_date);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE purchases SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Purchase not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM purchases WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    getPurchaseSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_purchases,
                SUM(total_cost) as total_amount,
                SUM(quantity) as total_items,
                AVG(total_cost) as average_purchase,
                COUNT(DISTINCT supplier_name) as suppliers_used,
                SUM(CASE WHEN payment_status = 'PAID' THEN total_cost ELSE 0 END) as total_paid,
                SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN balance_remaining ELSE 0 END) as total_outstanding
            FROM purchases 
            WHERE user_id = ?
        `).get(userId);
    }

    getMonthlySummary(userId, month, year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_purchases,
                SUM(total_cost) as total_amount,
                SUM(quantity) as total_items,
                AVG(total_cost) as average_purchase
            FROM purchases 
            WHERE user_id = ? 
            AND purchase_date BETWEEN ? AND ?
        `).get(userId, startDate, endDate);
    }
}

module.exports = PurchaseRepository;