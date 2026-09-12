// src/infrastructure/database/sqlite/repositories/PurchaseRepository.js
// v3.0.1-prod — Strict multi-tenant

const BaseRepository = require('./BaseRepository');

class PurchaseRepository extends BaseRepository {
    constructor(db = null) {
        super('purchases', db);
    }

    _hydrate(row) {
        if (!row) return null;
        let items = [];
        if (row.items) {
            try {
                items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
            } catch (e) {
                items = [];
            }
        }
        return { ...row, items };
    }

    create(purchaseData) {
        const stmt = this.db.prepare(`
            INSERT INTO purchases (
                user_id, business_id, supplier_id, supplier_name, item_name, 
                quantity, unit_cost, total_cost, payment_status, 
                amount_paid, balance_remaining, due_date, purchase_date,
                items, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            purchaseData.userId ?? purchaseData.user_id ?? null,
            purchaseData.businessId ?? purchaseData.business_id ?? null,
            purchaseData.supplier_id ?? purchaseData.supplierId ?? null,
            purchaseData.supplier_name ?? purchaseData.supplierName ?? null,
            purchaseData.item_name ?? purchaseData.itemName ?? null,
            purchaseData.quantity || 0,
            (purchaseData.unit_cost ?? purchaseData.unitCost) || 0,
            (purchaseData.total_cost ?? purchaseData.totalCost) || 0,
            (purchaseData.payment_status ?? purchaseData.paymentStatus) || 'UNPAID',
            (purchaseData.amount_paid ?? purchaseData.amountPaid) || 0,
            (purchaseData.balance_remaining ?? purchaseData.balanceRemaining) || 0,
            purchaseData.due_date ?? purchaseData.dueDate ?? null,
            purchaseData.purchase_date ?? purchaseData.purchaseDate ?? new Date().toISOString(),
            purchaseData.items ? JSON.stringify(purchaseData.items) : null,
            purchaseData.notes || null
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
        return this._hydrate(row);
    }

    findByBusinessId(businessId) {
        const rows = this.db.prepare(
            'SELECT * FROM purchases WHERE business_id = ? ORDER BY purchase_date DESC'
        ).all(businessId);
        return rows.map(row => this._hydrate(row));
    }

    findByUserId(userId) {
        const rows = this.db.prepare(
            'SELECT * FROM purchases WHERE user_id = ? ORDER BY purchase_date DESC'
        ).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    findByDateRange(businessId, startDate, endDate) {
        const rows = this.db.prepare(`
            SELECT * FROM purchases 
            WHERE business_id = ? AND DATE(purchase_date) BETWEEN ? AND ? 
            ORDER BY purchase_date DESC
        `).all(businessId, startDate, endDate);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplier(businessId, supplierName) {
        const rows = this.db.prepare(`
            SELECT * FROM purchases 
            WHERE business_id = ? AND supplier_name LIKE ? 
            ORDER BY purchase_date DESC
        `).all(businessId, `%${supplierName}%`);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplierId(businessId, supplierId) {
        const rows = this.db.prepare(`
            SELECT * FROM purchases 
            WHERE business_id = ? AND supplier_id = ? 
            ORDER BY purchase_date DESC
        `).all(businessId, supplierId);
        return rows.map(row => this._hydrate(row));
    }

    getTodayPurchases(businessId) {
        const today = new Date().toISOString().split('T')[0];
        const rows = this.db.prepare(`
            SELECT * FROM purchases 
            WHERE business_id = ? AND DATE(purchase_date) = ? 
            ORDER BY purchase_date DESC
        `).all(businessId, today);
        return rows.map(row => this._hydrate(row));
    }

    getPurchaseSummary(businessId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_purchases,
                COALESCE(SUM(total_cost), 0) as total_amount,
                COALESCE(SUM(quantity), 0) as total_items,
                COALESCE(AVG(total_cost), 0) as average_purchase,
                COUNT(DISTINCT supplier_name) as suppliers_used,
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_cost ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN balance_remaining ELSE 0 END), 0) as total_outstanding
            FROM purchases 
            WHERE business_id = ?
        `).get(businessId);
    }

    getMonthlySummary(businessId, month, year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_purchases,
                COALESCE(SUM(total_cost), 0) as total_amount,
                COALESCE(SUM(quantity), 0) as total_items,
                COALESCE(AVG(total_cost), 0) as average_purchase
            FROM purchases 
            WHERE business_id = ? 
              AND purchase_date BETWEEN ? AND ?
        `).get(businessId, startDate, endDate);
    }

    update(id, data) {
        const fields = [];
        const values = [];

        const map = {
            supplier_name: data.supplier_name ?? data.supplierName,
            supplier_id: data.supplier_id ?? data.supplierId,
            item_name: data.item_name ?? data.itemName,
            quantity: data.quantity,
            unit_cost: data.unit_cost ?? data.unitCost,
            total_cost: data.total_cost ?? data.totalCost,
            payment_status: data.payment_status ?? data.paymentStatus,
            amount_paid: data.amount_paid ?? data.amountPaid,
            balance_remaining: data.balance_remaining ?? data.balanceRemaining,
            due_date: data.due_date ?? data.dueDate,
            notes: data.notes,
            business_id: data.businessId ?? data.business_id,
            user_id: data.userId ?? data.user_id,
        };

        for (const [col, val] of Object.entries(map)) {
            if (val !== undefined) {
                fields.push(`${col} = ?`);
                values.push(val);
            }
        }

        if (data.items !== undefined) {
            fields.push('items = ?');
            values.push(JSON.stringify(data.items));
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 1) throw new Error('No fields to update');

        values.push(id);

        const result = this.db.prepare(
            `UPDATE purchases SET ${fields.join(', ')} WHERE id = ?`
        ).run(...values);

        if (result.changes === 0) throw new Error('Purchase not found or no changes made');
        return this.findById(id);
    }

    delete(id) {
        const result = this.db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
        return result.changes > 0;
    }
}

module.exports = PurchaseRepository;