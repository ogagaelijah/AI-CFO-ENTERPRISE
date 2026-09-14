// src/infrastructure/database/sqlite/repositories/PurchaseRepository.js
// v3.1.0-prod — Postgres async. Same logic as SQLite v3.0.1.

const BaseRepository = require('./BaseRepository');

class PurchaseRepository extends BaseRepository {
    constructor() {
        super('purchases');
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
        return {
            ...row,
            total_cost: Number(row.total_cost) || 0,
            unit_cost: Number(row.unit_cost) || 0,
            amount_paid: Number(row.amount_paid) || 0,
            balance_remaining: Number(row.balance_remaining) || 0,
            items,
        };
    }

    async create(purchaseData) {
        const result = await this._query(
            `INSERT INTO purchases (
                user_id, business_id, supplier_id, supplier_name, item_name,
                quantity, unit_cost, total_cost, payment_status,
                amount_paid, balance_remaining, due_date, purchase_date,
                items, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id`,
            [
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
                purchaseData.notes || null,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM purchases WHERE id = $1', [id]);
        return this._hydrate(result.rows[0] || null);
    }

    async findByBusinessId(businessId) {
        const result = await this._query(
            'SELECT * FROM purchases WHERE business_id = $1 ORDER BY purchase_date DESC',
            [businessId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByUserId(userId) {
        const result = await this._query(
            'SELECT * FROM purchases WHERE user_id = $1 ORDER BY purchase_date DESC',
            [userId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByDateRange(businessId, startDate, endDate) {
        const result = await this._query(
            `SELECT * FROM purchases
             WHERE business_id = $1 AND DATE(purchase_date) BETWEEN $2 AND $3
             ORDER BY purchase_date DESC`,
            [businessId, startDate, endDate]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findBySupplier(businessId, supplierName) {
        const result = await this._query(
            `SELECT * FROM purchases
             WHERE business_id = $1 AND supplier_name LIKE $2
             ORDER BY purchase_date DESC`,
            [businessId, `%${supplierName}%`]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findBySupplierId(businessId, supplierId) {
        const result = await this._query(
            `SELECT * FROM purchases
             WHERE business_id = $1 AND supplier_id = $2
             ORDER BY purchase_date DESC`,
            [businessId, supplierId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async getTodayPurchases(businessId) {
        const today = new Date().toISOString().split('T')[0];
        const result = await this._query(
            `SELECT * FROM purchases
             WHERE business_id = $1 AND DATE(purchase_date) = $2
             ORDER BY purchase_date DESC`,
            [businessId, today]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async getPurchaseSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_purchases,
                COALESCE(SUM(total_cost), 0) as total_amount,
                COALESCE(SUM(quantity), 0) as total_items,
                COALESCE(AVG(total_cost), 0) as average_purchase,
                COUNT(DISTINCT supplier_name)::int as suppliers_used,
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_cost ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN balance_remaining ELSE 0 END), 0) as total_outstanding
             FROM purchases
             WHERE business_id = $1`,
            [businessId]
        );
        const r = result.rows[0] || {};
        return {
            total_purchases: r.total_purchases || 0,
            total_amount: Number(r.total_amount) || 0,
            total_items: Number(r.total_items) || 0,
            average_purchase: Number(r.average_purchase) || 0,
            suppliers_used: r.suppliers_used || 0,
            total_paid: Number(r.total_paid) || 0,
            total_outstanding: Number(r.total_outstanding) || 0,
        };
    }

    async getMonthlySummary(businessId, month, year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_purchases,
                COALESCE(SUM(total_cost), 0) as total_amount,
                COALESCE(SUM(quantity), 0) as total_items,
                COALESCE(AVG(total_cost), 0) as average_purchase
             FROM purchases
             WHERE business_id = $1
               AND purchase_date BETWEEN $2 AND $3`,
            [businessId, startDate, endDate]
        );
        return result.rows[0];
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

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
                fields.push(`${col} = $${i++}`);
                values.push(val);
            }
        }

        if (data.items !== undefined) {
            fields.push(`items = $${i++}`);
            values.push(JSON.stringify(data.items));
        }

        fields.push('updated_at = NOW()');

        if (fields.length === 1) throw new Error('No fields to update');

        values.push(id);

        const result = await this._query(
            `UPDATE purchases SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) throw new Error('Purchase not found or no changes made');
        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM purchases WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = PurchaseRepository;