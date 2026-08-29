// src/infrastructure/database/sqlite/repositories/InventoryRepository.js

const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
    constructor(db = null) {
        super('inventory', db);
    }

    create(inventoryData) {
        const stmt = this.db.prepare(`
            INSERT INTO inventory (user_id, item_name, quantity, cost_price, selling_price, last_purchase_cost, reorder_level)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            inventoryData.user_id,
            inventoryData.item_name,
            inventoryData.quantity || 0,
            inventoryData.cost_price || 0,
            inventoryData.selling_price || 0,
            inventoryData.last_purchase_cost || 0,
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

    findByName(userId, itemName) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND item_name = ?'
        ).get(userId, itemName);
    }

    findByNameIgnoreCase(userId, itemName) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND LOWER(item_name) = LOWER(?)'
        ).get(userId, itemName);
    }

    searchByName(userId, searchTerm) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND LOWER(item_name) LIKE LOWER(?) ORDER BY item_name ASC'
        ).all(userId, `%${searchTerm}%`);
    }

    findByNameWithFallback(userId, itemName) {
        let item = this.findByNameIgnoreCase(userId, itemName);
        if (item) return item;
        const results = this.searchByName(userId, itemName);
        return results.length > 0 ? results[0] : null;
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
        if (data.last_purchase_cost !== undefined) {
            fields.push('last_purchase_cost = ?');
            values.push(data.last_purchase_cost);
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

    updateCostOnPurchase(inventoryId, quantity, unitCost) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        
        const totalCurrentValue = (item.quantity || 0) * (item.cost_price || 0);
        const totalNewValue = quantity * unitCost;
        const totalQuantity = (item.quantity || 0) + quantity;
        const newCostPrice = totalQuantity > 0 ? (totalCurrentValue + totalNewValue) / totalQuantity : unitCost;
        
        const updateData = {
            quantity: totalQuantity,
            cost_price: newCostPrice,
            last_purchase_cost: unitCost,
        };
        
        // Log for debugging
        console.log(`📊 updateCostOnPurchase: item ${item.id}, old qty: ${item.quantity}, old cost: ${item.cost_price}, new qty: ${totalQuantity}, new cost: ${newCostPrice}`);
        
        return this.update(inventoryId, updateData);
    }

    addStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        return this.update(inventoryId, { quantity: (item.quantity || 0) + quantity });
    }

    reduceStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        if ((item.quantity || 0) < quantity) {
            throw new Error(`Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`);
        }
        return this.update(inventoryId, { quantity: (item.quantity || 0) - quantity });
    }

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

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM inventory WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

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