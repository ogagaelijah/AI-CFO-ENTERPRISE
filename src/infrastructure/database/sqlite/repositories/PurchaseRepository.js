// src/infrastructure/database/sqlite/repositories/PurchaseRepository.js

const BaseRepository = require('./BaseRepository');

class PurchaseRepository extends BaseRepository {
    constructor() {
        super('purchases');
    }

    /**
     * Create a new purchase record
     */
    create(purchaseData) {
        const stmt = this.db.prepare(`
            INSERT INTO purchases (user_id, item_name, quantity, unit_cost, total_cost, supplier_name, purchase_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            purchaseData.user_id,
            purchaseData.item_name,
            purchaseData.quantity,
            purchaseData.unit_cost,
            purchaseData.total_cost,
            purchaseData.supplier_name || null,
            purchaseData.purchase_date || new Date().toISOString()
        );
        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find purchase by ID
     */
    findById(id) {
        return this.db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
    }

    /**
     * Find all purchases for a user
     */
    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM purchases WHERE user_id = ? ORDER BY purchase_date DESC'
        ).all(userId);
    }

    /**
     * Find purchases by date range
     */
    findByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND DATE(purchase_date) BETWEEN ? AND ? 
            ORDER BY purchase_date DESC
        `).all(userId, startDate, endDate);
    }

    /**
     * Find purchases by item name
     */
    findByItemName(userId, itemName) {
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND item_name LIKE ? 
            ORDER BY purchase_date DESC
        `).all(userId, `%${itemName}%`);
    }

    /**
     * Find purchases by supplier
     */
    findBySupplier(userId, supplierName) {
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND supplier_name LIKE ? 
            ORDER BY purchase_date DESC
        `).all(userId, `%${supplierName}%`);
    }

    /**
     * Get today's purchases
     */
    getTodayPurchases(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM purchases 
            WHERE user_id = ? AND DATE(purchase_date) = ? 
            ORDER BY purchase_date DESC
        `).all(userId, today);
    }

    /**
     * Get purchase summary
     */
    getPurchaseSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_purchases,
                SUM(total_cost) as total_amount,
                SUM(quantity) as total_items,
                AVG(total_cost) as average_purchase,
                COUNT(DISTINCT supplier_name) as suppliers_used
            FROM purchases 
            WHERE user_id = ?
        `).get(userId);
    }

    /**
     * Get monthly purchase summary
     */
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

    /**
     * Delete purchase
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM purchases WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
}

module.exports = PurchaseRepository;