// src/infrastructure/database/sqlite/repositories/SaleRepository.js

const BaseRepository = require('./BaseRepository');

class SaleRepository extends BaseRepository {
    constructor() {
        super('sales');
    }

    // Create a sale
    create(saleData) {
        const stmt = this.db.prepare(`
            INSERT INTO sales (user_id, item_name, quantity, unit_price, total_price, customer_name, payment_status, amount_paid, balance_remaining)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            saleData.user_id,
            saleData.item_name,
            saleData.quantity,
            saleData.unit_price,
            saleData.total_price,
            saleData.customer_name || null,
            saleData.payment_status || 'UNPAID',
            saleData.amount_paid || 0,
            saleData.balance_remaining || saleData.total_price
        );
        return this.findById(result.lastInsertRowid);
    }

    // Find sales by user ID
    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM sales WHERE user_id = ? ORDER BY sale_date DESC'
        ).all(userId);
    }

    // Find sales by date range
    findByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM sales 
            WHERE user_id = ? AND sale_date BETWEEN ? AND ? 
            ORDER BY sale_date DESC
        `).all(userId, startDate, endDate);
    }

    // Get today's sales
    getTodaySales(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM sales 
            WHERE user_id = ? AND DATE(sale_date) = ? 
            ORDER BY sale_date DESC
        `).all(userId, today);
    }

    // Get sales summary
    getSalesSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(total_price) as total_revenue,
                SUM(quantity) as total_items_sold,
                AVG(total_price) as average_sale_value,
                SUM(CASE WHEN payment_status = 'PAID' THEN total_price ELSE 0 END) as paid_amount,
                SUM(CASE WHEN payment_status = 'UNPAID' OR payment_status = 'PARTIAL' THEN balance_remaining ELSE 0 END) as unpaid_amount
            FROM sales 
            WHERE user_id = ?
        `).get(userId);
    }

    // Record payment on a sale
    recordPayment(saleId, amount) {
        const sale = this.findById(saleId);
        if (!sale) throw new Error('Sale not found');

        const currentPaid = sale.amount_paid || 0;
        const totalPrice = sale.total_price;
        const newPaid = currentPaid + amount;
        const balance = totalPrice - newPaid;

        let status = 'PARTIAL';
        if (balance <= 0) {
            status = 'PAID';
        }

        return this.update(saleId, {
            amount_paid: newPaid,
            balance_remaining: balance > 0 ? balance : 0,
            payment_status: status,
        });
    }

    // Get daily report
    getDailyReport(userId, date) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(total_price) as total_revenue,
                SUM(quantity) as total_items
            FROM sales 
            WHERE user_id = ? AND DATE(sale_date) = ?
        `).get(userId, targetDate);
    }

    // Get weekly report
    getWeeklyReport(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT 
                DATE(sale_date) as day,
                COUNT(*) as transactions,
                SUM(total_price) as revenue,
                SUM(quantity) as items_sold
            FROM sales 
            WHERE user_id = ? AND DATE(sale_date) BETWEEN ? AND ?
            GROUP BY DATE(sale_date)
            ORDER BY day DESC
        `).all(userId, startDate, endDate);
    }
}

module.exports = SaleRepository;