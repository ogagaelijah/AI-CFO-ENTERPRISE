// src/infrastructure/database/sqlite/repositories/SaleRepository.js

const BaseRepository = require('./BaseRepository');

class SaleRepository extends BaseRepository {
    constructor() {
        super('sales');
    }

    create(saleData) {
        const stmt = this.db.prepare(`
            INSERT INTO sales (
                user_id, item_name, quantity, unit_price, total_price,
                customer_name, customer_id, customer_type, business_id,
                payment_status, amount_paid, balance_remaining, sale_date,
                unit_cost, cogs, gross_profit, margin_percentage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            saleData.user_id,
            saleData.item_name,
            saleData.quantity,
            saleData.unit_price,
            saleData.total_price,
            saleData.customer_name || null,
            saleData.customer_id || null,
            saleData.customer_type || 'CUSTOMER',
            saleData.business_id || null,
            saleData.payment_status || 'UNPAID',
            saleData.amount_paid || 0,
            saleData.balance_remaining || 0,
            saleData.sale_date || new Date().toISOString(),
            saleData.unit_cost || 0,
            saleData.cogs || 0,
            saleData.gross_profit || 0,
            saleData.margin_percentage || 0
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM sales WHERE user_id = ? ORDER BY sale_date DESC'
        ).all(userId);
    }

    findByBusinessId(businessId) {
        return this.db.prepare(
            'SELECT * FROM sales WHERE business_id = ? ORDER BY sale_date DESC'
        ).all(businessId);
    }

    findByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM sales 
            WHERE user_id = ? 
            AND sale_date >= ? 
            AND sale_date <= ?
            ORDER BY sale_date DESC
        `).all(userId, startDate, endDate);
    }

    findByCustomerName(userId, customerName) {
        return this.db.prepare(`
            SELECT * FROM sales 
            WHERE user_id = ? 
            AND customer_name LIKE ?
            ORDER BY sale_date DESC
        `).all(userId, `%${customerName}%`);
    }

    findByCustomerId(businessId, customerId) {
        return this.db.prepare(`
            SELECT * FROM sales 
            WHERE business_id = ? 
            AND customer_id = ?
            ORDER BY sale_date DESC
        `).all(businessId, customerId);
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.item_name !== undefined) {
            fields.push('item_name = ?');
            values.push(data.item_name);
        }
        if (data.quantity !== undefined) {
            fields.push('quantity = ?');
            values.push(data.quantity);
        }
        if (data.unit_price !== undefined) {
            fields.push('unit_price = ?');
            values.push(data.unit_price);
        }
        if (data.total_price !== undefined) {
            fields.push('total_price = ?');
            values.push(data.total_price);
        }
        if (data.customer_name !== undefined) {
            fields.push('customer_name = ?');
            values.push(data.customer_name);
        }
        if (data.customer_id !== undefined) {
            fields.push('customer_id = ?');
            values.push(data.customer_id);
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
        // 🆕 Cost fields
        if (data.unit_cost !== undefined) {
            fields.push('unit_cost = ?');
            values.push(data.unit_cost);
        }
        if (data.cogs !== undefined) {
            fields.push('cogs = ?');
            values.push(data.cogs);
        }
        if (data.gross_profit !== undefined) {
            fields.push('gross_profit = ?');
            values.push(data.gross_profit);
        }
        if (data.margin_percentage !== undefined) {
            fields.push('margin_percentage = ?');
            values.push(data.margin_percentage);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE sales SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Sale not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM sales WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    getSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(total_price) as total_amount,
                SUM(CASE WHEN payment_status = 'PAID' THEN total_price ELSE 0 END) as total_paid,
                SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN balance_remaining ELSE 0 END) as total_outstanding,
                COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN payment_status = 'UNPAID' THEN 1 END) as unpaid_count,
                COUNT(CASE WHEN payment_status = 'PARTIAL' THEN 1 END) as partial_count
            FROM sales 
            WHERE user_id = ?
        `).get(userId);
    }

    // =============================================
    // 🆕 NEW: Cost-aware methods for reporting
    // =============================================

    /**
     * Get sales with cost data for a date range
     * Returns full sale records including cost fields
     */
    findWithCostByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT 
                s.*,
                s.unit_cost,
                s.cogs,
                s.gross_profit,
                s.margin_percentage
            FROM sales s
            WHERE s.user_id = ? 
            AND s.sale_date >= ? 
            AND s.sale_date <= ?
            ORDER BY s.sale_date DESC
        `).all(userId, startDate, endDate);
    }

    /**
     * Get cost summary for a date range
     */
    getCostSummary(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT 
                COALESCE(SUM(total_price), 0) as total_revenue,
                COALESCE(SUM(cogs), 0) as total_cogs,
                COALESCE(SUM(gross_profit), 0) as total_gross_profit,
                COALESCE(AVG(margin_percentage), 0) as avg_margin,
                COUNT(*) as total_sales
            FROM sales 
            WHERE user_id = ? 
            AND sale_date >= ? 
            AND sale_date <= ?
            AND (unit_cost > 0 OR cogs > 0)
        `).get(userId, startDate, endDate);
    }
}

module.exports = SaleRepository;