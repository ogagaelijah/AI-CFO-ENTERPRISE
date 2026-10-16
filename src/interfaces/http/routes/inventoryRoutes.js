// src/interfaces/http/routes/inventoryRoutes.js
// v1.4.1-prod — Error classification: user errors return 400/404/409, not 500.
// v1.4.0-prod — Write endpoints require OWNER/ADMIN/MANAGER.
// v1.3.0-prod — Adds search param passthrough.
// v1.2.0-prod — Pagination at TOP LEVEL.

const express = require('express');
const router = express.Router();
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const inventoryRepo = new InventoryRepository();

router.use(authMiddleware);

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

/**
 * Classify error message → correct HTTP status.
 * Prevents 500s for user errors like duplicate names or validation failures.
 */
function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|minLength|too long/i.test(msg)) return 400;
  return 500;
}

// =============================================
// GET /api/inventory?page=1&limit=50&search=gala
// =============================================
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
            const items = all.slice(offset, offset + limit);
            const summary = await inventoryRepo.getSummary(businessId);

            return res.json({
                success: true,
                data: items,
                summary,
                pagination: buildPaginationMeta({ page, limit, total }),
            });
        }

        const filters = { search: searchTerm };

        const [items, total, summary] = await Promise.all([
            inventoryRepo.findByBusinessId(businessId, { ...filters, limit, offset }),
            inventoryRepo.countByBusinessId(businessId, filters),
            inventoryRepo.getSummary(businessId),
        ]);

        res.json({
            success: true,
            data: items || [],
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

// =============================================
// GET /api/inventory/summary
// =============================================
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

// =============================================
// GET /api/inventory/low-stock
// =============================================
router.get('/low-stock', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const threshold = parseInt(req.query.threshold) || 5;
        const items = await inventoryRepo.findLowStock(businessId, threshold);

        res.json({
            success: true,
            data: { items, count: items.length, threshold }
        });

    } catch (error) {
        console.error('❌ Error fetching low stock:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch low stock items' });
    }
});

// =============================================
// GET /api/inventory/:id
// =============================================
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

        res.json({ success: true, data: item });

    } catch (error) {
        console.error('❌ Error fetching inventory item:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch inventory item' });
    }
});

// =============================================
// POST /api/inventory — OWNER / ADMIN / MANAGER
// =============================================
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { itemName, quantity, costPrice, sellingPrice, reorderLevel = 5 } = req.body;

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
            reorder_level: reorderLevel
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

// =============================================
// PUT /api/inventory/:id — OWNER / ADMIN / MANAGER
// =============================================
router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { itemName, costPrice, sellingPrice, reorderLevel } = req.body;

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

        const updated = await inventoryRepo.update(id, updateData);

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
// PATCH /api/inventory/:id/stock — OWNER / ADMIN / MANAGER
// =============================================
router.patch('/:id/stock', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { adjustment, reason } = req.body;

        if (adjustment === undefined || adjustment === null) {
            return res.status(400).json({ success: false, message: 'Adjustment amount is required' });
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

        const currentQuantity = existing.quantity || 0;
        const newQuantity = currentQuantity + adjustment;

        if (newQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot adjust stock. Current quantity: ${currentQuantity}, Adjustment: ${adjustment} would result in negative stock.`
            });
        }

        const updated = await inventoryRepo.update(id, { quantity: newQuantity });

        res.json({
            success: true,
            message: `Stock adjusted by ${adjustment} (${adjustment > 0 ? 'added' : 'removed'})`,
            data: {
                previousQuantity: currentQuantity,
                newQuantity,
                adjustment,
                item: updated
            }
        });

    } catch (error) {
        console.error('❌ Error adjusting stock:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to adjust stock' });
    }
});

// =============================================
// DELETE /api/inventory/:id — OWNER / ADMIN / MANAGER
// =============================================
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