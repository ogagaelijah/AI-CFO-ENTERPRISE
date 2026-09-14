// src/infrastructure/database/sqlite/repositories/InventoryRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
    constructor() {
        super('inventory');
    }

    async create(inventoryData) {
        const result = await this._query(
            `INSERT INTO inventory (
                user_id, business_id, item_name, quantity,
                cost_price, selling_price, last_purchase_cost, reorder_level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [
                inventoryData.userId ?? inventoryData.user_id ?? null,
                inventoryData.businessId ?? inventoryData.business_id ?? null,
                inventoryData.item_name || inventoryData.itemName,
                inventoryData.quantity || 0,
                inventoryData.cost_price || inventoryData.costPrice || 0,
                inventoryData.selling_price || inventoryData.sellingPrice || 0,
                inventoryData.last_purchase_cost || inventoryData.lastPurchaseCost || 0,
                inventoryData.reorder_level || inventoryData.reorderLevel || 5,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM inventory WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM inventory WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.search) {
            query += ` AND LOWER(item_name) LIKE LOWER($${i++})`;
            params.push(`%${options.search}%`);
        }

        query += ' ORDER BY item_name ASC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            query += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(query, params);
        return result.rows;
    }

    async findByUserId(userId) {
        const result = await this._query(
            'SELECT * FROM inventory WHERE user_id = $1 ORDER BY item_name ASC',
            [userId]
        );
        return result.rows;
    }

    async findByName(businessId, itemName) {
        const result = await this._query(
            'SELECT * FROM inventory WHERE business_id = $1 AND item_name = $2',
            [businessId, itemName]
        );
        return result.rows[0] || null;
    }

    async findByNameIgnoreCase(businessId, itemName) {
        const result = await this._query(
            'SELECT * FROM inventory WHERE business_id = $1 AND LOWER(item_name) = LOWER($2)',
            [businessId, itemName]
        );
        return result.rows[0] || null;
    }

    async searchByName(businessId, searchTerm) {
        const result = await this._query(
            `SELECT * FROM inventory
             WHERE business_id = $1 AND LOWER(item_name) LIKE LOWER($2)
             ORDER BY item_name ASC`,
            [businessId, `%${searchTerm}%`]
        );
        return result.rows;
    }

    async findByNameWithFallback(businessId, itemName) {
        const item = await this.findByNameIgnoreCase(businessId, itemName);
        if (item) return item;

        const results = await this.searchByName(businessId, itemName);
        return results.length > 0 ? results[0] : null;
    }

    async findLowStock(businessId, threshold = 5) {
        const result = await this._query(
            `SELECT * FROM inventory
             WHERE business_id = $1 AND quantity <= $2
             ORDER BY quantity ASC`,
            [businessId, threshold]
        );
        return result.rows;
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.item_name !== undefined || data.itemName !== undefined) {
            fields.push(`item_name = $${i++}`);
            values.push(data.item_name ?? data.itemName);
        }
        if (data.quantity !== undefined) {
            fields.push(`quantity = $${i++}`);
            values.push(data.quantity);
        }
        if (data.cost_price !== undefined || data.costPrice !== undefined) {
            fields.push(`cost_price = $${i++}`);
            values.push(data.cost_price ?? data.costPrice);
        }
        if (data.selling_price !== undefined || data.sellingPrice !== undefined) {
            fields.push(`selling_price = $${i++}`);
            values.push(data.selling_price ?? data.sellingPrice);
        }
        if (data.last_purchase_cost !== undefined || data.lastPurchaseCost !== undefined) {
            fields.push(`last_purchase_cost = $${i++}`);
            values.push(data.last_purchase_cost ?? data.lastPurchaseCost);
        }
        if (data.reorder_level !== undefined || data.reorderLevel !== undefined) {
            fields.push(`reorder_level = $${i++}`);
            values.push(data.reorder_level ?? data.reorderLevel);
        }
        if (data.businessId !== undefined || data.business_id !== undefined) {
            fields.push(`business_id = $${i++}`);
            values.push(data.businessId ?? data.business_id);
        }
        if (data.userId !== undefined || data.user_id !== undefined) {
            fields.push(`user_id = $${i++}`);
            values.push(data.userId ?? data.user_id);
        }

        fields.push('updated_at = NOW()');

        if (fields.length === 1) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const result = await this._query(
            `UPDATE inventory SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Item not found or no changes made');
        }

        return this.findById(id);
    }

    async updateCostOnPurchase(inventoryId, quantity, unitCost) {
        const item = await this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');

        const totalCurrentValue = (item.quantity || 0) * (Number(item.cost_price) || 0);
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

    async addStock(inventoryId, quantity) {
        const item = await this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');
        return this.update(inventoryId, {
            quantity: (item.quantity || 0) + quantity,
        });
    }

    async reduceStock(inventoryId, quantity) {
        const item = await this.findById(inventoryId);
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

    async getSummary(businessId) {
        const result = await this._query(
            `SELECT
                COUNT(*)::int as total_items,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * cost_price), 0) as total_cost_value,
                COALESCE(SUM(quantity * selling_price), 0) as total_selling_value,
                COALESCE(SUM(quantity * (selling_price - cost_price)), 0) as total_profit,
                COUNT(CASE WHEN quantity <= 5 THEN 1 END)::int as low_stock_count
             FROM inventory
             WHERE business_id = $1`,
            [businessId]
        );

        const r = result.rows[0] || {};
        return {
            total_items: r.total_items || 0,
            total_quantity: r.total_quantity || 0,
            total_cost_value: Number(r.total_cost_value) || 0,
            total_selling_value: Number(r.total_selling_value) || 0,
            total_profit: Number(r.total_profit) || 0,
            low_stock_count: r.low_stock_count || 0,
        };
    }

    async getTotalValue(businessId) {
        const result = await this._query(
            `SELECT
                COALESCE(SUM(quantity * cost_price), 0) as total_cost,
                COALESCE(SUM(quantity * selling_price), 0) as total_selling,
                COALESCE(SUM(quantity * (selling_price - cost_price)), 0) as total_profit
             FROM inventory
             WHERE business_id = $1`,
            [businessId]
        );
        const r = result.rows[0] || {};
        return {
            total_cost: Number(r.total_cost) || 0,
            total_selling: Number(r.total_selling) || 0,
            total_profit: Number(r.total_profit) || 0,
        };
    }

    async getItemsWithProfit(businessId) {
        const result = await this._query(
            `SELECT
                *,
                (selling_price - cost_price) as profit_per_item,
                CASE
                    WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price) * 100
                    ELSE 0
                END as profit_margin
             FROM inventory
             WHERE business_id = $1
             ORDER BY item_name ASC`,
            [businessId]
        );
        return result.rows;
    }

    async findByIdWithProfit(id) {
        const result = await this._query(
            `SELECT
                *,
                (selling_price - cost_price) as profit_per_item,
                CASE
                    WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price) * 100
                    ELSE 0
                END as profit_margin
             FROM inventory
             WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async delete(id) {
        const result = await this._query('DELETE FROM inventory WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*)::int as count FROM inventory WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.search) {
            query += ` AND LOWER(item_name) LIKE LOWER($${i++})`;
            params.push(`%${filters.search}%`);
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
    }
}

module.exports = InventoryRepository;