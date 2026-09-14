// src/infrastructure/database/sqlite/repositories/SaleRepository.js
// v3.1.0-prod — Postgres async. Same logic as SQLite v3.0.1.

const BaseRepository = require('./BaseRepository');

class SaleRepository extends BaseRepository {
    constructor() {
        super('sales');
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
            total_price: Number(row.total_price) || 0,
            unit_price: Number(row.unit_price) || 0,
            unit_cost: Number(row.unit_cost) || 0,
            cogs: Number(row.cogs) || 0,
            gross_profit: Number(row.gross_profit) || 0,
            margin_percentage: Number(row.margin_percentage) || 0,
            amount_paid: Number(row.amount_paid) || 0,
            balance_remaining: Number(row.balance_remaining) || 0,
            items,
        };
    }

    async create(saleData) {
        const result = await this._query(
            `INSERT INTO sales (
                user_id, item_name, quantity, unit_price, total_price,
                customer_name, customer_id, customer_type, business_id,
                payment_status, amount_paid, balance_remaining, sale_date,
                unit_cost, cogs, gross_profit, margin_percentage,
                items, invoice_no, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id`,
            [
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
                saleData.notes || null,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM sales WHERE id = $1', [id]);
        return this._hydrate(result.rows[0] || null);
    }

    async findByBusinessId(businessId) {
        const result = await this._query(
            'SELECT * FROM sales WHERE business_id = $1 ORDER BY sale_date DESC',
            [businessId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByUserId(userId) {
        const result = await this._query(
            'SELECT * FROM sales WHERE user_id = $1 ORDER BY sale_date DESC',
            [userId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByDateRange(businessId, startDate, endDate) {
        const result = await this._query(
            `SELECT * FROM sales
             WHERE business_id = $1
               AND DATE(sale_date) >= DATE($2)
               AND DATE(sale_date) <= DATE($3)
             ORDER BY sale_date DESC`,
            [businessId, startDate, endDate]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByCustomerId(businessId, customerId) {
        const result = await this._query(
            `SELECT * FROM sales
             WHERE business_id = $1 AND customer_id = $2
             ORDER BY sale_date DESC`,
            [businessId, customerId]
        );
        return result.rows.map(row => this._hydrate(row));
    }

    async findByBusinessIdWithFilters(businessId, filters = {}) {
        let sql = 'SELECT * FROM sales WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.startDate && filters.endDate) {
            sql += ` AND DATE(sale_date) >= DATE($${i++}) AND DATE(sale_date) <= DATE($${i++})`;
            params.push(filters.startDate, filters.endDate);
        }
        if (filters.paymentStatus) {
            sql += ` AND payment_status = $${i++}`;
            params.push(filters.paymentStatus);
        }

        sql += ' ORDER BY sale_date DESC, id DESC';

        if (filters.limit) {
            sql += ` LIMIT $${i++}`;
            params.push(filters.limit);
            if (filters.offset) {
                sql += ` OFFSET $${i++}`;
                params.push(filters.offset);
            }
        }

        const result = await this._query(sql, params);
        return result.rows.map(row => this._hydrate(row));
    }

    async getStats(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_sales,
                COALESCE(SUM(total_price), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_price ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN balance_remaining ELSE 0 END), 0) as total_outstanding,
                COALESCE(SUM(gross_profit), 0) as total_profit,
                COALESCE(AVG(margin_percentage), 0) as avg_margin,
                COUNT(DISTINCT customer_name)::int as unique_customers
             FROM sales
             WHERE business_id = $1`,
            [businessId]
        );
        const r = result.rows[0] || {};
        return {
            total_sales: r.total_sales || 0,
            total_revenue: Number(r.total_revenue) || 0,
            total_paid: Number(r.total_paid) || 0,
            total_outstanding: Number(r.total_outstanding) || 0,
            total_profit: Number(r.total_profit) || 0,
            avg_margin: Number(r.avg_margin) || 0,
            unique_customers: r.unique_customers || 0,
        };
    }

    async getSummary(businessId) {
        return this.getStats(businessId);
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        const allowed = [
            'item_name', 'quantity', 'unit_price', 'total_price',
            'customer_name', 'customer_id', 'payment_status',
            'amount_paid', 'balance_remaining', 'unit_cost',
            'cogs', 'gross_profit', 'margin_percentage',
            'invoice_no', 'notes', 'business_id', 'user_id',
        ];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${i++}`);
                values.push(data[key]);
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
            `UPDATE sales SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) throw new Error('Sale not found or no changes made');
        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM sales WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = SaleRepository;