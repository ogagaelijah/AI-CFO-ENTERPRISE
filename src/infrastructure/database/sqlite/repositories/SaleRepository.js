// src/infrastructure/database/sqlite/repositories/SaleRepository.js
// v3.0.1-prod — Strict multi-tenant

const BaseRepository = require('./BaseRepository');

class SaleRepository extends BaseRepository {
    constructor(db = null) {
        super('sales', db);
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

    create(saleData) {
        const stmt = this.db.prepare(`
            INSERT INTO sales (
                user_id, item_name, quantity, unit_price, total_price,
                customer_name, customer_id, customer_type, business_id,
                payment_status, amount_paid, balance_remaining, sale_date,
                unit_cost, cogs, gross_profit, margin_percentage,
                items, invoice_no, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            saleData.userId ?? saleData.user_id ?? null,
            saleData.item_name ?? saleData.itemName ?? null,
            saleData.quantity || 0,
            (saleData.unit_price ?? saleData.unitPrice) || 0,
            (saleData.total_price ?? saleData.totalPrice) || 0,
            saleData.customer_name ?? saleData.customerName ?? null,
            saleData.customer_id ?? saleData.customerId ?? null,
            (saleData.customer_type ?? saleData.customerType) || 'CUSTOMER',
            saleData.businessId ?? saleData.business_id ?? null,
            (saleData.payment_status ?? saleData.paymentStatus) || 'UNPAID',
            (saleData.amount_paid ?? saleData.amountPaid) || 0,
            (saleData.balance_remaining ?? saleData.balanceRemaining) || 0,
            saleData.sale_date ?? saleData.saleDate ?? new Date().toISOString(),
            (saleData.unit_cost ?? saleData.unitCost) || 0,
            saleData.cogs || 0,
            (saleData.gross_profit ?? saleData.grossProfit) || 0,
            (saleData.margin_percentage ?? saleData.marginPercentage) || 0,
            saleData.items ? JSON.stringify(saleData.items) : null,
            saleData.invoice_no ?? saleData.invoiceNo ?? null,
            saleData.notes || null
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
        return this._hydrate(row);
    }

    findByBusinessId(businessId) {
        const rows = this.db.prepare(
            'SELECT * FROM sales WHERE business_id = ? ORDER BY sale_date DESC'
        ).all(businessId);
        return rows.map(row => this._hydrate(row));
    }

    findByUserId(userId) {
        const rows = this.db.prepare(
            'SELECT * FROM sales WHERE user_id = ? ORDER BY sale_date DESC'
        ).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    findByDateRange(businessId, startDate, endDate) {
        const rows = this.db.prepare(`
            SELECT * FROM sales
            WHERE business_id = ?
              AND date(sale_date) >= date(?)
              AND date(sale_date) <= date(?)
            ORDER BY sale_date DESC
        `).all(businessId, startDate, endDate);
        return rows.map(row => this._hydrate(row));
    }

    findByCustomerId(businessId, customerId) {
        const rows = this.db.prepare(`
            SELECT * FROM sales
            WHERE business_id = ? AND customer_id = ?
            ORDER BY sale_date DESC
        `).all(businessId, customerId);
        return rows.map(row => this._hydrate(row));
    }

    findByBusinessIdWithFilters(businessId, filters = {}) {
        let sql = 'SELECT * FROM sales WHERE business_id = ?';
        const params = [businessId];

        if (filters.startDate && filters.endDate) {
            sql += ' AND date(sale_date) >= date(?) AND date(sale_date) <= date(?)';
            params.push(filters.startDate, filters.endDate);
        }
        if (filters.paymentStatus) {
            sql += ' AND payment_status = ?';
            params.push(filters.paymentStatus);
        }

        sql += ' ORDER BY sale_date DESC, id DESC';

        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
            if (filters.offset) {
                sql += ' OFFSET ?';
                params.push(filters.offset);
            }
        }

        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this._hydrate(row));
    }

    getStats(businessId) {
        const result = this.db.prepare(`
            SELECT
                COUNT(*) as total_sales,
                COALESCE(SUM(total_price), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_price ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN balance_remaining ELSE 0 END), 0) as total_outstanding,
                COALESCE(SUM(gross_profit), 0) as total_profit,
                COALESCE(AVG(margin_percentage), 0) as avg_margin,
                COUNT(DISTINCT customer_name) as unique_customers
            FROM sales
            WHERE business_id = ?
        `).get(businessId);

        return result || {
            total_sales: 0,
            total_revenue: 0,
            total_paid: 0,
            total_outstanding: 0,
            total_profit: 0,
            avg_margin: 0,
            unique_customers: 0,
        };
    }

    getSummary(businessId) {
        return this.getStats(businessId);
    }

    update(id, data) {
        const fields = [];
        const values = [];

        const allowed = [
            'item_name', 'quantity', 'unit_price', 'total_price',
            'customer_name', 'customer_id', 'payment_status',
            'amount_paid', 'balance_remaining', 'unit_cost',
            'cogs', 'gross_profit', 'margin_percentage',
            'invoice_no', 'notes', 'business_id', 'user_id'
        ];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
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
            `UPDATE sales SET ${fields.join(', ')} WHERE id = ?`
        ).run(...values);

        if (result.changes === 0) throw new Error('Sale not found or no changes made');
        return this.findById(id);
    }

    delete(id) {
        const result = this.db.prepare('DELETE FROM sales WHERE id = ?').run(id);
        return result.changes > 0;
    }
}

module.exports = SaleRepository;