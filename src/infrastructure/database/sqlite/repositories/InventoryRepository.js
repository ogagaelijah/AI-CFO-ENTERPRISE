// src/infrastructure/database/sqlite/repositories/InventoryRepository.js

const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
    constructor(db = null) {
        super('inventory', db);
    }

    /**
     * Create a new inventory item
     * Requires businessId (preferred). userId is stored for compatibility.
     */
    create(inventoryData) {
        const stmt = this.db.prepare(`
            INSERT INTO inventory (
                user_id, business_id, item_name, quantity,
                cost_price, selling_price, last_purchase_cost, reorder_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            inventoryData.userId ?? inventoryData.user_id ?? null,
            inventoryData.businessId ?? inventoryData.business_id ?? null,
            inventoryData.item_name || inventoryData.itemName,
            inventoryData.quantity || 0,
            inventoryData.cost_price || inventoryData.costPrice || 0,
            inventoryData.selling_price || inventoryData.sellingPrice || 0,
            inventoryData.last_purchase_cost || inventoryData.lastPurchaseCost || 0,
            inventoryData.reorder_level || inventoryData.reorderLevel || 5
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    }

    /**
     * Preferred multi-tenant method
     */
    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM inventory WHERE business_id = ?';
        const params = [businessId];

        if (options.search) {
            query += ' AND LOWER(item_name) LIKE LOWER(?)';
            params.push(`%${options.search}%`);
        }

        query += ' ORDER BY item_name ASC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        return this.db.prepare(query).all(...params);
    }

    /**
     * Legacy / fallback method
     */
    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? ORDER BY item_name ASC'
        ).all(userId);
    }

    findByName(businessId, itemName) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE business_id = ? AND item_name = ?'
        ).get(businessId, itemName);
    }

    findByNameIgnoreCase(businessId, itemName) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE business_id = ? AND LOWER(item_name) = LOWER(?)'
        ).get(businessId, itemName);
    }

    searchByName(businessId, searchTerm) {
        return this.db.prepare(
            `SELECT * FROM inventory 
             WHERE business_id = ? AND LOWER(item_name) LIKE LOWER(?) 
             ORDER BY item_name ASC`
        ).all(businessId, `%${searchTerm}%`);
    }

    findByNameWithFallback(businessId, itemName) {
        let item = this.findByNameIgnoreCase(businessId, itemName);
        if (item) return item;

        const results = this.searchByName(businessId, itemName);
        return results.length > 0 ? results[0] : null;
    }

    findLowStock(businessId, threshold = 5) {
        return this.db.prepare(
            `SELECT * FROM inventory 
             WHERE business_id = ? AND quantity <= ? 
             ORDER BY quantity ASC`
        ).all(businessId, threshold);
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.item_name !== undefined || data.itemName !== undefined) {
            fields.push('item_name = ?');
            values.push(data.item_name ?? data.itemName);
        }
        if (data.quantity !== undefined) {
            fields.push('quantity = ?');
            values.push(data.quantity);
        }
        if (data.cost_price !== undefined || data.costPrice !== undefined) {
            fields.push('cost_price = ?');
            values.push(data.cost_price ?? data.costPrice);
        }
        if (data.selling_price !== undefined || data.sellingPrice !== undefined) {
            fields.push('selling_price = ?');
            values.push(data.selling_price ?? data.sellingPrice);
        }
        if (data.last_purchase_cost !== undefined || data.lastPurchaseCost !== undefined) {
            fields.push('last_purchase_cost = ?');
            values.push(data.last_purchase_cost ?? data.lastPurchaseCost);
        }
        if (data.reorder_level !== undefined || data.reorderLevel !== undefined) {
            fields.push('reorder_level = ?');
            values.push(data.reorder_level ?? data.reorderLevel);
        }
        if (data.businessId !== undefined || data.business_id !== undefined) {
            fields.push('business_id = ?');
            values.push(data.businessId ?? data.business_id);
        }
        if (data.userId !== undefined || data.user_id !== undefined) {
            fields.push('user_id = ?');
            values.push(data.userId ?? data.user_id);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 1) { // only updated_at
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

    updateCostOnPurchase(inventoryId, quantity, unitCost) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');

        const totalCurrentValue = (item.quantity || 0) * (item.cost_price || 0);
        const totalNewValue = quantity * unitCost;
        const totalQuantity = (item.quantity || 0) + quantity;
        const newCostPrice = totalQuantity > 0
            ? (totalCurrentValue + totalNewValue) / totalQuantity
            : unitCost;

        return this.update(inventoryId, {
            quantity: totalQuantity,
            cost_price: newCostPrice,
            last_purchase_cost: unitCost,
        });
    }

    addStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        return this.update(inventoryId, {
            quantity: (item.quantity || 0) + quantity,
        });
    }

    reduceStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        if ((item.quantity || 0) < quantity) {
            throw new Error(
                `Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`
            );
        }
        return this.update(inventoryId, {
            quantity: (item.quantity || 0) - quantity,
        });
    }

    getSummary(businessId) {
        const result = this.db.prepare(`
            SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * cost_price), 0) as total_cost_value,
                COALESCE(SUM(quantity * selling_price), 0) as total_selling_value,
                COALESCE(SUM(quantity * (selling_price - cost_price)), 0) as total_profit,
                COUNT(CASE WHEN quantity <= 5 THEN 1 END) as low_stock_count
            FROM inventory 
            WHERE business_id = ?
        `).get(businessId);

        return {
            total_items: result?.total_items || 0,
            total_quantity: result?.total_quantity || 0,
            total_cost_value: result?.total_cost_value || 0,
            total_selling_value: result?.total_selling_value || 0,
            total_profit: result?.total_profit || 0,
            low_stock_count: result?.low_stock_count || 0,
        };
    }

    getTotalValue(businessId) {
        const result = this.db.prepare(`
            SELECT 
                COALESCE(SUM(quantity * cost_price), 0) as total_cost,
                COALESCE(SUM(quantity * selling_price), 0) as total_selling,
                COALESCE(SUM(quantity * (selling_price - cost_price)), 0) as total_profit
            FROM inventory 
            WHERE business_id = ?
        `).get(businessId);

        return {
            total_cost: result?.total_cost || 0,
            total_selling: result?.total_selling || 0,
            total_profit: result?.total_profit || 0,
        };
    }

    getItemsWithProfit(businessId) {
        return this.db.prepare(`
            SELECT 
                *,
                (selling_price - cost_price) as profit_per_item,
                CASE 
                    WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price) * 100 
                    ELSE 0 
                END as profit_margin
            FROM inventory 
            WHERE business_id = ?
            ORDER BY item_name ASC
        `).all(businessId);
    }

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

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM inventory WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Count items for a business
     */
    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM inventory WHERE business_id = ?';
        const params = [businessId];

        if (filters.search) {
            query += ' AND LOWER(item_name) LIKE LOWER(?)';
            params.push(`%${filters.search}%`);
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }
}

module.exports = InventoryRepository;