// src/infrastructure/database/sqlite/repositories/InventoryMovementRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

class InventoryMovementRepository extends BaseRepository {
    constructor() {
        super('inventory_movements');
    }

    async create(data) {
        const createdAt = data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : (data.createdAt || new Date().toISOString());

        const result = await this._query(
            `INSERT INTO inventory_movements (
                inventory_item_id, business_id, user_id, movement_type,
                quantity, unit_cost, total_cost,
                quantity_before, quantity_after,
                cost_price_before, cost_price_after,
                reference_type, reference_id,
                reason, notes, metadata, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) RETURNING id`,
            [
                data.inventoryItemId,
                data.businessId,
                data.userId,
                data.movementType,
                data.quantity,
                data.unitCost || 0,
                data.totalCost || 0,
                data.quantityBefore || 0,
                data.quantityAfter || 0,
                data.costPriceBefore || 0,
                data.costPriceAfter || 0,
                data.referenceType || null,
                data.referenceId || null,
                data.reason || '',
                data.notes || '',
                JSON.stringify(data.metadata || {}),
                createdAt,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM inventory_movements WHERE id = $1', [id]);
        return result.rows[0] ? this._hydrate(result.rows[0]) : null;
    }

    async findByInventoryItemId(inventoryItemId, options = {}) {
        let query = 'SELECT * FROM inventory_movements WHERE inventory_item_id = $1';
        const params = [inventoryItemId];
        let i = 2;

        if (options.movementType) {
            query += ` AND movement_type = $${i++}`;
            params.push(options.movementType);
        }
        if (options.startDate) {
            query += ` AND created_at >= $${i++}`;
            params.push(options.startDate.toISOString ? options.startDate.toISOString() : options.startDate);
        }
        if (options.endDate) {
            query += ` AND created_at <= $${i++}`;
            params.push(options.endDate.toISOString ? options.endDate.toISOString() : options.endDate);
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            query += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(query, params);
        return result.rows.map(r => this._hydrate(r));
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM inventory_movements WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.movementType) {
            query += ` AND movement_type = $${i++}`;
            params.push(options.movementType);
        }
        if (options.startDate) {
            query += ` AND created_at >= $${i++}`;
            params.push(options.startDate.toISOString ? options.startDate.toISOString() : options.startDate);
        }
        if (options.endDate) {
            query += ` AND created_at <= $${i++}`;
            params.push(options.endDate.toISOString ? options.endDate.toISOString() : options.endDate);
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            query += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(query, params);
        return result.rows.map(r => this._hydrate(r));
    }

    async findByReference(businessId, referenceType, referenceId) {
        const result = await this._query(
            `SELECT * FROM inventory_movements
             WHERE business_id = $1 AND reference_type = $2 AND reference_id = $3
             ORDER BY created_at DESC`,
            [businessId, referenceType, referenceId]
        );
        return result.rows.map(r => this._hydrate(r));
    }

    async findByDateRange(businessId, startDate, endDate, options = {}) {
        return this.findByBusinessId(businessId, {
            ...options,
            startDate,
            endDate,
        });
    }

    async getSummary(businessId, options = {}) {
        let query = `
            SELECT
                movement_type,
                SUM(quantity) as total_quantity,
                SUM(total_cost) as total_cost,
                COUNT(*)::int as count
            FROM inventory_movements
            WHERE business_id = $1
        `;
        const params = [businessId];
        let i = 2;

        if (options.startDate) {
            query += ` AND created_at >= $${i++}`;
            params.push(options.startDate.toISOString ? options.startDate.toISOString() : options.startDate);
        }
        if (options.endDate) {
            query += ` AND created_at <= $${i++}`;
            params.push(options.endDate.toISOString ? options.endDate.toISOString() : options.endDate);
        }

        query += ' GROUP BY movement_type';

        const result = await this._query(query, params);
        const rows = result.rows;

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
                totalQuantity: Number(row.total_quantity) || 0,
                totalCost: Number(row.total_cost) || 0,
            };

            switch (row.movement_type) {
                case 'IN':
                case 'ADJUSTMENT_IN':
                case 'RETURN':
                    summary.totalIn += Number(row.total_quantity) || 0;
                    summary.totalCostIn += Number(row.total_cost) || 0;
                    break;
                case 'OUT':
                case 'DAMAGE':
                case 'LOSS':
                case 'TRANSFER':
                    summary.totalOut += Number(row.total_quantity) || 0;
                    summary.totalCostOut += Number(row.total_cost) || 0;
                    break;
                case 'ADJUSTMENT_OUT':
                    summary.totalAdjustments += Number(row.total_quantity) || 0;
                    summary.totalOut += Number(row.total_quantity) || 0;
                    summary.totalCostOut += Number(row.total_cost) || 0;
                    break;
                default:
                    break;
            }

            summary.totalCount += row.count;
        }

        return summary;
    }

    async countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*)::int as count FROM inventory_movements WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.movementType) {
            query += ` AND movement_type = $${i++}`;
            params.push(filters.movementType);
        }
        if (filters.startDate) {
            query += ` AND created_at >= $${i++}`;
            params.push(filters.startDate.toISOString ? filters.startDate.toISOString() : filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND created_at <= $${i++}`;
            params.push(filters.endDate.toISOString ? filters.endDate.toISOString() : filters.endDate);
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
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
            unitCost: Number(row.unit_cost),
            totalCost: Number(row.total_cost),
            quantityBefore: row.quantity_before,
            quantityAfter: row.quantity_after,
            costPriceBefore: Number(row.cost_price_before),
            costPriceAfter: Number(row.cost_price_after),
            referenceType: row.reference_type,
            referenceId: row.reference_id,
            reason: row.reason,
            notes: row.notes,
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
            createdAt: row.created_at ? new Date(row.created_at) : null,
        });
    }
}

module.exports = InventoryMovementRepository;