// src/infrastructure/database/sqlite/repositories/InventoryRepository.js

const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
    constructor() {
        super('inventory');
    }

    create(inventoryData) {
        const stmt = this.db.prepare(`
            INSERT INTO inventory (user_id, item_name, quantity, cost_price, selling_price, reorder_level)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            inventoryData.user_id,
            inventoryData.item_name,
            inventoryData.quantity || 0,
            inventoryData.cost_price || 0,
            inventoryData.selling_price || 0,
            inventoryData.reorder_level || 5
        );
        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? ORDER BY item_name ASC'
        ).all(userId);
    }

    /**
     * Find inventory item by exact name (case-sensitive)
     * @param {number} userId - User ID
     * @param {string} itemName - Item name (exact match)
     * @returns {Object|null} Inventory item or null
     */
    findByName(userId, itemName) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND item_name = ?'
        ).get(userId, itemName);
    }

    /**
     * Find inventory item by name (case-insensitive)
     * @param {number} userId - User ID
     * @param {string} itemName - Item name (case-insensitive)
     * @returns {Object|null} Inventory item or null
     */
    findByNameIgnoreCase(userId, itemName) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND LOWER(item_name) = LOWER(?)'
        ).get(userId, itemName);
    }

    /**
     * 🆕 Find by name with fallback to partial match
     * Use this when you want to be more flexible
     */
    findByNameIgnoreCaseWithFallback(userId, itemName) {
        // Try exact match first (case-insensitive)
        let item = this.findByNameIgnoreCase(userId, itemName);
        if (item) return item;

        // Try partial match
        const results = this.searchByName(userId, itemName);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Search inventory items by name (case-insensitive, partial match)
     * @param {number} userId - User ID
     * @param {string} searchTerm - Search term
     * @returns {Array} Array of matching inventory items
     */
    searchByName(userId, searchTerm) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND LOWER(item_name) LIKE LOWER(?) ORDER BY item_name ASC'
        ).all(userId, `%${searchTerm}%`);
    }

    findLowStock(userId, threshold = 5) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND quantity <= ? ORDER BY quantity ASC'
        ).all(userId, threshold);
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
        if (data.cost_price !== undefined) {
            fields.push('cost_price = ?');
            values.push(data.cost_price);
        }
        if (data.selling_price !== undefined) {
            fields.push('selling_price = ?');
            values.push(data.selling_price);
        }
        if (data.reorder_level !== undefined) {
            fields.push('reorder_level = ?');
            values.push(data.reorder_level);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Item not found or no changes made');
        }

        return this.findById(id);
    }

    addStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        return this.update(inventoryId, { quantity: item.quantity + quantity });
    }

    reduceStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        if (item.quantity < quantity) {
            throw new Error(`Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`);
        }
        return this.update(inventoryId, { quantity: item.quantity - quantity });
    }

    // =============================================
    // SUMMARY
    // =============================================
    getSummary(userId) {
        const result = this.db.prepare(`
            SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * cost_price), 0) as total_cost_value,
                COALESCE(SUM(quantity * selling_price), 0) as total_selling_value,
                COALESCE(SUM(quantity * (selling_price - cost_price)), 0) as total_profit,
                COUNT(CASE WHEN quantity <= 5 THEN 1 END) as low_stock_count
            FROM inventory 
            WHERE user_id = ?
        `).get(userId);

        return {
            total_items: result?.total_items || 0,
            total_quantity: result?.total_quantity || 0,
            total_cost_value: result?.total_cost_value || 0,
            total_selling_value: result?.total_selling_value || 0,
            total_profit: result?.total_profit || 0,
            low_stock_count: result?.low_stock_count || 0
        };
    }

    getTotalValue(userId) {
        const result = this.db.prepare(`
            SELECT 
                COALESCE(SUM(quantity * cost_price), 0) as total_cost,
                COALESCE(SUM(quantity * selling_price), 0) as total_selling,
                COALESCE(SUM(quantity * (selling_price - cost_price)), 0) as total_profit
            FROM inventory 
            WHERE user_id = ?
        `).get(userId);

        return {
            total_cost: result?.total_cost || 0,
            total_selling: result?.total_selling || 0,
            total_profit: result?.total_profit || 0
        };
    }

    /**
     * Delete inventory item by ID
     * @param {number} id - Inventory item ID
     * @returns {boolean} True if deleted
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM inventory WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // =============================================
    // 🆕 NEW: Reporting helpers
    // =============================================

    /**
     * Get all inventory items with profit calculations
     * @param {number} userId - User ID
     * @returns {Array} Items with profit_per_item and profit_margin
     */
    getItemsWithProfit(userId) {
        return this.db.prepare(`
            SELECT 
                *,
                (selling_price - cost_price) as profit_per_item,
                CASE 
                    WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price) * 100 
                    ELSE 0 
                END as profit_margin
            FROM inventory 
            WHERE user_id = ?
            ORDER BY item_name ASC
        `).all(userId);
    }

    /**
     * Get inventory item by ID with profit calculation
     * @param {number} id - Inventory item ID
     * @returns {Object|null} Item with profit_per_item and profit_margin
     */
    findByIdWithProfit(id) {
        return this.db.prepare(`
            SELECT 
                *,
                (selling_price - cost_price) as profit_per_item,
                CASE 
                    WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price) * 100 
                    ELSE 0 
                END as profit_margin
            FROM inventory 
            WHERE id = ?
        `).get(id);
    }
}

module.exports = InventoryRepository;