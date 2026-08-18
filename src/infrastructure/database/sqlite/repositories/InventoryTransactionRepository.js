// src/infrastructure/database/sqlite/repositories/InventoryTransactionRepository.js

const BaseRepository = require('./BaseRepository');

class InventoryTransactionRepository extends BaseRepository {
    constructor() {
        super('inventory_transactions');
    }

    /**
     * Create a new inventory transaction
     * @param {Object} transactionData - Inventory transaction entity data
     * @returns {Promise<Object>} Created transaction
     */
    create(transactionData) {
        const stmt = this.db.prepare(`
            INSERT INTO inventory_transactions (
                inventory_item_id, business_id, type, quantity,
                previous_quantity, new_quantity, reference_type, reference_id,
                reason, notes, metadata, date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            transactionData.inventoryItemId,
            transactionData.businessId,
            transactionData.type,
            transactionData.quantity,
            transactionData.previousQuantity || 0,
            transactionData.newQuantity || 0,
            transactionData.referenceType || null,
            transactionData.referenceId || null,
            transactionData.reason || '',
            transactionData.notes || '',
            JSON.stringify(transactionData.metadata || {}),
            transactionData.date ? transactionData.date.toISOString() : new Date().toISOString()
        );

        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find inventory transaction by ID
     * @param {string|number} id - Transaction ID
     * @returns {Promise<Object|null>} Transaction or null
     */
    findById(id) {
        const result = this.db.prepare('SELECT * FROM inventory_transactions WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    /**
     * Find inventory transactions by inventory item ID
     * @param {string|number} inventoryItemId - Inventory item ID
     * @param {Object} options - { limit, offset, type, startDate, endDate }
     * @returns {Promise<Array>} Array of transactions
     */
    findByInventoryItemId(inventoryItemId, options = {}) {
        let query = 'SELECT * FROM inventory_transactions WHERE inventory_item_id = ?';
        const params = [inventoryItemId];

        if (options.type) {
            query += ' AND type = ?';
            params.push(options.type);
        }

        if (options.startDate) {
            query += ' AND date >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND date <= ?';
            params.push(options.endDate.toISOString());
        }

        query += ' ORDER BY date DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    /**
     * Find inventory transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, startDate, endDate }
     * @returns {Promise<Array>} Array of transactions
     */
    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM inventory_transactions WHERE business_id = ?';
        const params = [businessId];

        if (options.type) {
            query += ' AND type = ?';
            params.push(options.type);
        }

        if (options.startDate) {
            query += ' AND date >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND date <= ?';
            params.push(options.endDate.toISOString());
        }

        query += ' ORDER BY date DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    /**
     * Find inventory transactions by reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - SALE, PURCHASE, ADJUSTMENT, PRODUCTION
     * @param {string|number} referenceId - Reference ID
     * @returns {Promise<Array>} Array of transactions
     */
    findByReference(businessId, referenceType, referenceId) {
        const results = this.db.prepare(`
            SELECT * FROM inventory_transactions
            WHERE business_id = ? AND reference_type = ? AND reference_id = ?
            ORDER BY date DESC
        `).all(businessId, referenceType, referenceId);

        return results.map(r => this._hydrate(r));
    }

    /**
     * Find inventory transactions by date range
     * @param {string|number} businessId - Business ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - { type, limit, offset }
     * @returns {Promise<Array>} Array of transactions
     */
    findByDateRange(businessId, startDate, endDate, options = {}) {
        return this.findByBusinessId(businessId, {
            ...options,
            startDate,
            endDate,
        });
    }

    /**
     * Update an inventory transaction
     * @param {string|number} id - Transaction ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated transaction
     */
    update(id, data) {
        const fields = [];
        const values = [];

        if (data.type !== undefined) {
            fields.push('type = ?');
            values.push(data.type);
        }
        if (data.quantity !== undefined) {
            fields.push('quantity = ?');
            values.push(data.quantity);
        }
        if (data.previousQuantity !== undefined) {
            fields.push('previous_quantity = ?');
            values.push(data.previousQuantity);
        }
        if (data.newQuantity !== undefined) {
            fields.push('new_quantity = ?');
            values.push(data.newQuantity);
        }
        if (data.referenceType !== undefined) {
            fields.push('reference_type = ?');
            values.push(data.referenceType);
        }
        if (data.referenceId !== undefined) {
            fields.push('reference_id = ?');
            values.push(data.referenceId);
        }
        if (data.reason !== undefined) {
            fields.push('reason = ?');
            values.push(data.reason);
        }
        if (data.notes !== undefined) {
            fields.push('notes = ?');
            values.push(data.notes);
        }
        if (data.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(data.metadata));
        }
        if (data.date !== undefined) {
            fields.push('date = ?');
            values.push(data.date.toISOString());
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE inventory_transactions SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Transaction not found or no changes made');
        }

        return this.findById(id);
    }

    /**
     * Delete an inventory transaction
     * @param {string|number} id - Transaction ID
     * @returns {Promise<boolean>} True if deleted
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM inventory_transactions WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Get inventory transaction summary
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { startDate, endDate }
     * @returns {Promise<Object>} Summary with total in/out/adjustment
     */
    getSummary(businessId, options = {}) {
        let query = `
            SELECT
                type,
                SUM(quantity) as total_quantity,
                COUNT(*) as count
            FROM inventory_transactions
            WHERE business_id = ?
        `;
        const params = [businessId];

        if (options.startDate) {
            query += ' AND date >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND date <= ?';
            params.push(options.endDate.toISOString());
        }

        query += ' GROUP BY type';

        const results = this.db.prepare(query).all(...params);

        const summary = {
            totalIn: 0,
            totalOut: 0,
            totalAdjustments: 0,
            totalCount: 0,
            byType: {},
        };

        for (const row of results) {
            summary.byType[row.type] = {
                count: row.count,
                totalQuantity: row.total_quantity,
            };

            if (row.type === 'IN') {
                summary.totalIn += row.total_quantity || 0;
            } else if (row.type === 'OUT') {
                summary.totalOut += row.total_quantity || 0;
            } else if (row.type === 'ADJUSTMENT') {
                summary.totalAdjustments += row.total_quantity || 0;
            }
            summary.totalCount += row.count;
        }

        return summary;
    }

    /**
     * Count inventory transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, startDate, endDate }
     * @returns {Promise<number>} Count of transactions
     */
    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM inventory_transactions WHERE business_id = ?';
        const params = [businessId];

        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }

        if (filters.startDate) {
            query += ' AND date >= ?';
            params.push(filters.startDate.toISOString());
        }

        if (filters.endDate) {
            query += ' AND date <= ?';
            params.push(filters.endDate.toISOString());
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    /**
     * Hydrate database row to entity
     * @param {Object} row - Database row
     * @returns {Object} InventoryTransaction entity
     */
    _hydrate(row) {
        const InventoryTransaction = require('../../../domain/entities/InventoryTransaction');
        return new InventoryTransaction({
            id: row.id,
            inventoryItemId: row.inventory_item_id,
            businessId: row.business_id,
            type: row.type,
            quantity: row.quantity,
            previousQuantity: row.previous_quantity,
            newQuantity: row.new_quantity,
            referenceType: row.reference_type,
            referenceId: row.reference_id,
            reason: row.reason,
            notes: row.notes,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            date: new Date(row.date),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = InventoryTransactionRepository;