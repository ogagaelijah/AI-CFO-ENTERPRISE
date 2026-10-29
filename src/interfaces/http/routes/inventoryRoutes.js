// src/interfaces/http/routes/inventoryRoutes.js
// v1.8.0-prod — Fixes PATCH /stock string concatenation bug.
//               Allows decimals on all adjustments.

const express = require('express');
const router = express.Router();
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const InventoryMovementRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryMovementRepository');
const { query } = require('../../../infrastructure/database/sqlite/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const inventoryRepo = new InventoryRepository();
const inventoryMovementRepo = new InventoryMovementRepository();

router.use(authMiddleware);

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|minLength|too long/i.test(msg)) return 400;
  return 500;
}

async function writeMovementSafe(payload) {
    try {
        await inventoryMovementRepo.create(payload);
    } catch (err) {
        console.error('[inventoryRoutes] movement write failed:', err.message, {
            businessId: payload.businessId,
            inventoryItemId: payload.inventoryItemId,
            movementType: payload.movementType,
        });
    }
}

async function attachPacks(items) {
    if (!Array.isArray(items) || items.length === 0) return items;
    const ids = items.map(i => i.id).filter(Boolean);
    if (ids.length === 0) return items;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const packsResult = await query(
        `SELECT * FROM inventory_packs WHERE inventory_id IN (${placeholders})`,
        ids
    );

    const packsByItem = {};
    for (const pack of packsResult.rows) {
        const key = String(pack.inventory_id);
        if (!packsByItem[key]) packsByItem[key] = [];
        packsByItem[key].push({
            id: pack.id,
            inventory_id: pack.inventory_id,
            pack_name: pack.pack_name,
            multiplier: Number(pack.multiplier) || 1,
            selling_price: Number(pack.selling_price) || 0,
        });
    }

    return items.map(item => ({
        ...item,
        packs: packsByItem[String(item.id)] || [],
    }));
}

router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { search, lowStock = 'false' } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const { page, limit, offset } = parsePagination(req.query);
        const searchTerm = (search || '').trim() || null;

        if (lowStock === 'true') {
            const all = await inventoryRepo.findLowStock(businessId);
            const total = all.length;
            const sliced = all.slice(offset, offset + limit);
            const items = await attachPacks(sliced);
            const summary = await inventoryRepo.getSummary(businessId);

            return res.json({
                success: true,
                data: items,
                summary,
                pagination: buildPaginationMeta({ page, limit, total }),
            });
        }

        const filters = { search: searchTerm };

        const [rawItems, total, summary] = await Promise.all([
            inventoryRepo.findByBusinessId(businessId, { ...filters, limit, offset }),
            inventoryRepo.countByBusinessId(businessId, filters),
            inventoryRepo.getSummary(businessId),
        ]);

        const items = await attachPacks(rawItems || []);

        res.json({
            success: true,
            data: items,
            summary: summary || {
                total_items: 0,
                total_quantity: 0,
                total_cost_value: 0,
                total_selling_value: 0,
                total_profit: 0,
                low_stock_count: 0,
            },
            pagination: buildPaginationMeta({ page, limit, total }),
        });
    } catch (error) {
        console.error('❌ Error fetching inventory:', error);
        res.status(classifyError(error)).json({
            success: false,
            message: error.message || 'Failed to fetch inventory'
        });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const summary = await inventoryRepo.getSummary(businessId);
        res.json({ success: true, data: summary });

    } catch (error) {
        console.error('❌ Error fetching inventory summary:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch inventory summary' });
    }
});

router.get('/low-stock', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const threshold = parseInt(req.query.threshold) || 5;
        const rawItems = await inventoryRepo.findLowStock(businessId, threshold);
        const items = await attachPacks(rawItems);

        res.json({
            success: true,
            data: { items, count: items.length, threshold }
        });

    } catch (error) {
        console.error('❌ Error fetching low stock:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch low stock items' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;

        const item = await inventoryRepo.findById(id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Inventory item not found' });
        }

        if (item.business_id !== businessId && item.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const packsResult = await query('SELECT * FROM inventory_packs WHERE inventory_id = $1', [id]);
        item.packs = packsResult.rows || [];

        res.json({ success: true, data: item });

    } catch (error) {
        console.error('❌ Error fetching inventory item:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch inventory item' });
    }
});

router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { itemName, quantity, costPrice, sellingPrice, reorderLevel = 5, baseUnit = 'Piece', packs = [] } = req.body;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }
        if (!itemName || itemName.length < 2) {
            return res.status(400).json({ success: false, message: 'Item name must be at least 2 characters' });
        }
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
        }
        if (costPrice === undefined || costPrice < 0) {
            return res.status(400).json({ success: false, message: 'Cost price must be a valid number' });
        }
        if (sellingPrice === undefined || sellingPrice < 0) {
            return res.status(400).json({ success: false, message: 'Selling price must be a valid number' });
        }

        const existing = await inventoryRepo.findByNameIgnoreCase(businessId, itemName);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `"${itemName}" already exists in inventory`,
                data: existing
            });
        }

        const newItem = await inventoryRepo.create({
            userId,
            businessId,
            item_name: itemName,
            quantity: quantity,
            cost_price: costPrice,
            selling_price: sellingPrice,
            last_purchase_cost: costPrice,
            reorder_level: reorderLevel,
            base_unit: baseUnit
        });

        if (packs && packs.length > 0) {
            for (const pack of packs) {
                await query(
                    `INSERT INTO inventory_packs (inventory_id, pack_name, multiplier, selling_price) 
                     VALUES ($1, $2, $3, $4)`,
                    [newItem.id, pack.packName, pack.multiplier, pack.sellingPrice || 0]
                );
            }
        }

        const qty = Number(quantity);
        const cost = Number(costPrice) || 0;
        await writeMovementSafe({
            inventoryItemId: newItem.id,
            businessId,
            userId,
            movementType: 'IN',
            quantity: qty,
            unitCost: cost,
            totalCost: qty * cost,
            quantityBefore: 0,
            quantityAfter: qty,
            costPriceBefore: 0,
            costPriceAfter: cost,
            referenceType: 'OPENING',
            referenceId: null,
            reason: 'Initial stock on item creation',
            notes: '',
            metadata: {},
            createdAt: new Date(),
        });

        res.status(201).json({
            success: true,
            message: 'Stock added successfully',
            data: newItem
        });

    } catch (error) {
        console.error('❌ Error adding inventory:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to add inventory item' });
    }
});

router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { itemName, costPrice, sellingPrice, reorderLevel, baseUnit, packs } = req.body;

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Inventory item not found' });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const updateData = {};
        if (itemName !== undefined) updateData.item_name = itemName;
        if (costPrice !== undefined) updateData.cost_price = costPrice;
        if (sellingPrice !== undefined) updateData.selling_price = sellingPrice;
        if (reorderLevel !== undefined) updateData.reorder_level = reorderLevel;
        if (baseUnit !== undefined) updateData.base_unit = baseUnit;

        const updated = await inventoryRepo.update(id, updateData);

        if (packs !== undefined) {
            await query('DELETE FROM inventory_packs WHERE inventory_id = $1', [id]);
            if (packs && packs.length > 0) {
                for (const pack of packs) {
                    await query(
                        `INSERT INTO inventory_packs (inventory_id, pack_name, multiplier, selling_price) 
                         VALUES ($1, $2, $3, $4)`,
                        [id, pack.packName, pack.multiplier, pack.sellingPrice || 0]
                    );
                }
            }
        }

        res.json({
            success: true,
            message: 'Inventory item updated successfully',
            data: updated
        });

    } catch (error) {
        console.error('❌ Error updating inventory:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to update inventory item' });
    }
});

// =============================================
// PATCH /api/inventory/:id/stock — FIXED
// =============================================
router.patch('/:id/stock', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        
        // ★ THE FIX: Force numbers and reject strings
        const adjustment = Number(req.body?.adjustment);
        const reason = req.body?.reason;

        if (!Number.isFinite(adjustment)) {
            return res.status(400).json({ success: false, message: 'Adjustment must be a valid number' });
        }
        if (adjustment === 0) {
            return res.status(400).json({ success: false, message: 'Adjustment cannot be zero' });
        }

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Inventory item not found' });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // ★ THE FIX: Force numbers on both sides so "40.5" + "-3" doesn't become "40.5-3"
        const currentQuantity = Number(existing.quantity) || 0;
        const newQuantity = currentQuantity + adjustment;

        if (newQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot adjust stock. Current quantity: ${currentQuantity}, Adjustment: ${adjustment} would result in negative stock.`
            });
        }

        // Round to 3 decimals to match DB precision
        const roundedQuantity = Math.round(newQuantity * 1000) / 1000;
        const updated = await inventoryRepo.update(id, { quantity: roundedQuantity });

        const adj = adjustment;
        const absQty = Math.abs(adj);
        const cost = Number(existing.cost_price) || 0;

        await writeMovementSafe({
            inventoryItemId: existing.id,
            businessId,
            userId,
            movementType: adj > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
            quantity: absQty,
            unitCost: cost,
            totalCost: absQty * cost,
            quantityBefore: currentQuantity,
            quantityAfter: roundedQuantity,
            costPriceBefore: cost,
            costPriceAfter: cost,
            referenceType: 'ADJUSTMENT',
            referenceId: null,
            reason: reason || (adj > 0 ? 'Manual stock increase' : 'Manual stock decrease'),
            notes: '',
            metadata: {},
            createdAt: new Date(),
        });

        res.json({
            success: true,
            message: `Stock adjusted by ${adj} (${adj > 0 ? 'added' : 'removed'})`,
            data: {
                previousQuantity: currentQuantity,
                newQuantity: roundedQuantity,
                adjustment: adj,
                item: updated
            }
        });

    } catch (error) {
        console.error('❌ Error adjusting stock:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to adjust stock' });
    }
});

router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Inventory item not found' });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await inventoryRepo.delete(id);

        res.json({ success: true, message: 'Inventory item deleted successfully' });

    } catch (error) {
        console.error('❌ Error deleting inventory:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to delete inventory item' });
    }
});

module.exports = router;