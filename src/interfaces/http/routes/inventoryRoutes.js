// src/interfaces/http/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const { authMiddleware } = require('../middleware/authMiddleware');

// ✅ Initialize repository
const inventoryRepo = new InventoryRepository();

// All routes require authentication
router.use(authMiddleware);

// =============================================
// GET /api/inventory - Get all inventory items
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { search, lowStock = 'false' } = req.query;

        let items;
        if (lowStock === 'true') {
            items = await inventoryRepo.findLowStock(userId);
        } else if (search) {
            items = await inventoryRepo.searchByName(userId, search);
        } else {
            items = await inventoryRepo.findByUserId(userId);
        }

        const summary = await inventoryRepo.getSummary(userId);

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
// GET /api/inventory/:id - Get single inventory item
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const item = await inventoryRepo.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        if (item.user_id !== userId) {
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
// POST /api/inventory - Add new inventory item (Add Stock)
// =============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemName, quantity, costPrice, sellingPrice, reorderLevel = 5 } = req.body;

        // Validate
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

        // Check if item already exists
        const existing = await inventoryRepo.findByNameIgnoreCase(userId, itemName);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `"${itemName}" already exists in inventory`,
                data: existing
            });
        }

        // Create new inventory item
        const newItem = await inventoryRepo.create({
            user_id: userId,
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
// PUT /api/inventory/:id - Update inventory item (Edit)
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { itemName, costPrice, sellingPrice, reorderLevel } = req.body;

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        if (existing.user_id !== userId) {
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
// PATCH /api/inventory/:id/stock - Adjust stock
// =============================================
router.patch('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
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

        if (existing.user_id !== userId) {
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
// DELETE /api/inventory/:id - Delete inventory item
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await inventoryRepo.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        if (existing.user_id !== userId) {
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

// =============================================
// GET /api/inventory/summary - Get inventory summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;

        const summary = await inventoryRepo.getSummary(userId);

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
// GET /api/inventory/low-stock - Get low stock items
// =============================================
router.get('/low-stock', async (req, res) => {
    try {
        const userId = req.user.id;
        const threshold = parseInt(req.query.threshold) || 5;

        const items = await inventoryRepo.findLowStock(userId, threshold);

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

module.exports = router;