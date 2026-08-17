// src/infrastructure/database/sqlite/repositories/InventoryRepository.js

const BaseRepository = require('./BaseRepository');

class InventoryRepository extends BaseRepository {
    constructor() {
        super('inventory');
    }

    create(inventoryData) {
        const stmt = this.db.prepare(`
            INSERT INTO inventory (user_id, item_name, quantity, cost_price, selling_price)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            inventoryData.user_id,
            inventoryData.item_name,
            inventoryData.quantity || 0,
            inventoryData.cost_price || 0,
            inventoryData.selling_price || 0
        );
        return this.findById(result.lastInsertRowid);
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

    findLowStock(userId) {
        return this.db.prepare(
            'SELECT * FROM inventory WHERE user_id = ? AND quantity <= 5 ORDER BY quantity ASC'
        ).all(userId);
    }

    addStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');

        const newQuantity = item.quantity + quantity;
        return this.update(inventoryId, { quantity: newQuantity });
    }

    reduceStock(inventoryId, quantity) {
        const item = this.findById(inventoryId);
        if (!item) throw new Error('Inventory item not found');

        if (item.quantity < quantity) {
            throw new Error(`Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`);
        }

        const newQuantity = item.quantity - quantity;
        return this.update(inventoryId, { quantity: newQuantity });
    }

    getSummary(userId) {
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_quantity,
                SUM(quantity * cost_price) as total_cost_value,
                SUM(quantity * selling_price) as total_selling_value,
                COUNT(CASE WHEN quantity <= 5 THEN 1 END) as low_stock_count
            FROM inventory 
            WHERE user_id = ?
        `).get(userId);
    }
}

module.exports = InventoryRepository;