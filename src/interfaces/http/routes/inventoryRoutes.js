// src/interfaces/http/routes/inventoryRoutes.js

const express = require('express');
const router = express.Router();
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const inventoryRepo = new InventoryRepository();

router.use(authMiddleware);

// =============================================
// GET /api/inventory
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { search, lowStock = 'false' } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        let items;
        if (lowStock === 'true') {
            items = await inventoryRepo.findLowStock(businessId);
        } else if (search) {
            items = await inventoryRepo.searchByName(businessId, search);
        } else {
            items = await inventoryRepo.findByBusinessId(businessId);
        }

        const summary = await inventoryRepo.getSummary(businessId);

        res.json({
            success: true,
            data: items,
            summary: summary
        });

    } catch (error) {
        console.error('❌ Error fetching inventory:', error);
        res.status(500).json({
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

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        console.error('❌ Error fetching inventory summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch inventory summary'
        });
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
            data: {
                items,
                count: items.length,
                threshold
            }
        });

    } catch (error) {
        console.error('❌ Error fetching low stock:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch low stock items'
        });
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
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        if (item.business_id !== businessId && item.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('❌ Error fetching inventory item:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch inventory item'
        });
    }
});

// =============================================
// POST /api/inventory
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { itemName, quantity, costPrice, sellingPrice, reorderLevel = 5 } = req.body;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }
        if (!itemName || itemName.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Item name must be at least 2 characters'
            });
        }
        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }
        if (costPrice === undefined || costPrice < 0) {
            return res.status(400).json({
                success: false,
                message: 'Cost price must be a valid number'
            });
        }
        if (sellingPrice === undefined || sellingPrice < 0) {
            return res.status(400).json({
                success: false,
                message: 'Selling price must be a valid number'
            });
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
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add inventory item'
        });
    }
});

// =============================================
// PUT /api/inventory/:id
// =============================================
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { itemName, costPrice, sellingPrice, reorderLevel } = req.body;

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
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
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update inventory item'
        });
    }
});

// =============================================
// PATCH /api/inventory/:id/stock
// =============================================
router.patch('/:id/stock', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { adjustment, reason } = req.body;

        if (adjustment === undefined || adjustment === null) {
            return res.status(400).json({
                success: false,
                message: 'Adjustment amount is required'
            });
        }
        if (adjustment === 0) {
            return res.status(400).json({
                success: false,
                message: 'Adjustment cannot be zero'
            });
        }

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const currentQuantity = existing.quantity || 0;
        const newQuantity = currentQuantity + adjustment;

        if (newQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot adjust stock. Current quantity: ${currentQuantity}, Adjustment: ${adjustment} would result in negative stock.`
            });
        }

        const updated = await inventoryRepo.update(id, {
            quantity: newQuantity
        });

        res.json({
            success: true,
            message: `Stock adjusted by ${adjustment} (${adjustment > 0 ? 'added' : 'removed'})`,
            data: {
                previousQuantity: currentQuantity,
                newQuantity: newQuantity,
                adjustment: adjustment,
                item: updated
            }
        });

    } catch (error) {
        console.error('❌ Error adjusting stock:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to adjust stock'
        });
    }
});

// =============================================
// DELETE /api/inventory/:id
// =============================================
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await inventoryRepo.delete(id);

        res.json({
            success: true,
            message: 'Inventory item deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting inventory:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete inventory item'
        });
    }
});

module.exports = router;