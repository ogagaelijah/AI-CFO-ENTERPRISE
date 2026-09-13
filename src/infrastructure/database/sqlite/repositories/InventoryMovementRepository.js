// src/infrastructure/database/sqlite/repositories/InventoryMovementRepository.js
// Ledger for inventory_movements — the single source of truth for inventory audit.
// Uses named parameters to avoid column-order bugs.

const BaseRepository = require('./BaseRepository');

class InventoryMovementRepository extends BaseRepository {
    constructor(db = null) {
        super('inventory_movements', db);
    }

    create(data) {
        const stmt = this.db.prepare(`
            INSERT INTO inventory_movements (
                inventory_item_id, business_id, user_id, movement_type,
                quantity, unit_cost, total_cost,
                quantity_before, quantity_after,
                cost_price_before, cost_price_after,
                reference_type, reference_id,
                reason, notes, metadata, created_at
            ) VALUES (
                @inventory_item_id, @business_id, @user_id, @movement_type,
                @quantity, @unit_cost, @total_cost,
                @quantity_before, @quantity_after,
                @cost_price_before, @cost_price_after,
                @reference_type, @reference_id,
                @reason, @notes, @metadata, @created_at
            )
        `);

        const createdAt = data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : (data.createdAt || new Date().toISOString());

        const result = stmt.run({
            inventory_item_id: data.inventoryItemId,
            business_id: data.businessId,
            user_id: data.userId,
            movement_type: data.movementType,
            quantity: data.quantity,
            unit_cost: data.unitCost || 0,
            total_cost: data.totalCost || 0,
            quantity_before: data.quantityBefore || 0,
            quantity_after: data.quantityAfter || 0,
            cost_price_before: data.costPriceBefore || 0,
            cost_price_after: data.costPriceAfter || 0,
            reference_type: data.referenceType || null,
            reference_id: data.referenceId || null,
            reason: data.reason || '',
            notes: data.notes || '',
            metadata: JSON.stringify(data.metadata || {}),
            created_at: createdAt,
        });

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM inventory_movements WHERE id = ?').get(id);
        return row ? this._hydrate(row) : null;
    }

    findByInventoryItemId(inventoryItemId, options = {}) {
        let query = 'SELECT * FROM inventory_movements WHERE inventory_item_id = ?';
        const params = [inventoryItemId];

        if (options.movementType) {
            query += ' AND movement_type = ?';
            params.push(options.movementType);
        }
        if (options.startDate) {
            query += ' AND created_at >= ?';
            params.push(options.startDate.toISOString ? options.startDate.toISOString() : options.startDate);
        }
        if (options.endDate) {
            query += ' AND created_at <= ?';
            params.push(options.endDate.toISOString ? options.endDate.toISOString() : options.endDate);
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        return this.db.prepare(query).all(...params).map(r => this._hydrate(r));
    }

    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM inventory_movements WHERE business_id = ?';
        const params = [businessId];

        if (options.movementType) {
            query += ' AND movement_type = ?';
            params.push(options.movementType);
        }
        if (options.startDate) {
            query += ' AND created_at >= ?';
            params.push(options.startDate.toISOString ? options.startDate.toISOString() : options.startDate);
        }
        if (options.endDate) {
            query += ' AND created_at <= ?';
            params.push(options.endDate.toISOString ? options.endDate.toISOString() : options.endDate);
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        return this.db.prepare(query).all(...params).map(r => this._hydrate(r));
    }

    findByReference(businessId, referenceType, referenceId) {
        const rows = this.db.prepare(`
            SELECT * FROM inventory_movements
            WHERE business_id = ? AND reference_type = ? AND reference_id = ?
            ORDER BY created_at DESC
        `).all(businessId, referenceType, referenceId);
        return rows.map(r => this._hydrate(r));
    }

    findByDateRange(businessId, startDate, endDate, options = {}) {
        return this.findByBusinessId(businessId, {
            ...options,
            startDate,
            endDate,
        });
    }

    getSummary(businessId, options = {}) {
        let query = `
            SELECT
                movement_type,
                SUM(quantity) as total_quantity,
                SUM(total_cost) as total_cost,
                COUNT(*) as count
            FROM inventory_movements
            WHERE business_id = ?
        `;
        const params = [businessId];

        if (options.startDate) {
            query += ' AND created_at >= ?';
            params.push(options.startDate.toISOString ? options.startDate.toISOString() : options.startDate);
        }
        if (options.endDate) {
            query += ' AND created_at <= ?';
            params.push(options.endDate.toISOString ? options.endDate.toISOString() : options.endDate);
        }

        query += ' GROUP BY movement_type';

        const rows = this.db.prepare(query).all(...params);

        const summary = {
            totalIn: 0,
            totalOut: 0,
            totalAdjustments: 0,
            totalCount: 0,
            totalCostIn: 0,
            totalCostOut: 0,
            byType: {},
        };

        for (const row of rows) {
            summary.byType[row.movement_type] = {
                count: row.count,
                totalQuantity: row.total_quantity,
                totalCost: row.total_cost,
            };

            switch (row.movement_type) {
                case 'IN':
                case 'ADJUSTMENT_IN':
                case 'RETURN':
                    summary.totalIn += row.total_quantity || 0;
                    summary.totalCostIn += row.total_cost || 0;
                    break;
                case 'OUT':
                case 'DAMAGE':
                case 'LOSS':
                case 'TRANSFER':
                    summary.totalOut += row.total_quantity || 0;
                    summary.totalCostOut += row.total_cost || 0;
                    break;
                case 'ADJUSTMENT_OUT':
                    summary.totalAdjustments += row.total_quantity || 0;
                    summary.totalOut += row.total_quantity || 0;
                    summary.totalCostOut += row.total_cost || 0;
                    break;
                default:
                    break;
            }

            summary.totalCount += row.count;
        }

        return summary;
    }

    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM inventory_movements WHERE business_id = ?';
        const params = [businessId];

        if (filters.movementType) {
            query += ' AND movement_type = ?';
            params.push(filters.movementType);
        }
        if (filters.startDate) {
            query += ' AND created_at >= ?';
            params.push(filters.startDate.toISOString ? filters.startDate.toISOString() : filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND created_at <= ?';
            params.push(filters.endDate.toISOString ? filters.endDate.toISOString() : filters.endDate);
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    _hydrate(row) {
        const InventoryMovement = require('../../../../domain/entities/InventoryMovement');
        return new InventoryMovement({
            id: row.id,
            inventoryItemId: row.inventory_item_id,
            businessId: row.business_id,
            userId: row.user_id,
            movementType: row.movement_type,
            quantity: row.quantity,
            unitCost: row.unit_cost,
            totalCost: row.total_cost,
            quantityBefore: row.quantity_before,
            quantityAfter: row.quantity_after,
            costPriceBefore: row.cost_price_before,
            costPriceAfter: row.cost_price_after,
            referenceType: row.reference_type,
            referenceId: row.reference_id,
            reason: row.reason,
            notes: row.notes,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: row.created_at ? new Date(row.created_at) : null,
        });
    }
}

module.exports = InventoryMovementRepository;