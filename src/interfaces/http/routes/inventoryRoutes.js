// src/interfaces/http/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const AddStockUseCase = require('../../../application/useCases/inventory/AddStockUseCase');
const AdjustStockUseCase = require('../../../application/useCases/inventory/AdjustStockUseCase');
const ReleaseStockUseCase = require('../../../application/useCases/inventory/ReleaseStockUseCase');
const GetLowStockAlertUseCase = require('../../../application/useCases/inventory/GetLowStockAlertUseCase');
const GetInventoryValueUseCase = require('../../../application/useCases/inventory/GetInventoryValueUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');

// Initialize repository
const inventoryRepo = new InventoryRepository();

// Initialize use cases
const addStockUseCase = new AddStockUseCase({ inventoryRepository: inventoryRepo });
const adjustStockUseCase = new AdjustStockUseCase({ inventoryRepository: inventoryRepo });
const releaseStockUseCase = new ReleaseStockUseCase({ inventoryRepository: inventoryRepo });
const getLowStockAlertUseCase = new GetLowStockAlertUseCase({ inventoryRepository: inventoryRepo });
const getInventoryValueUseCase = new GetInventoryValueUseCase({ inventoryRepository: inventoryRepo });

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

        // Get summary
        const summary = await inventoryRepo.getSummary(userId);

        // Calculate margin
        const margin = summary.total_cost_value > 0 
            ? ((summary.total_profit / summary.total_cost_value) * 100) 
            : 0;

        res.json({
            success: true,
            data: {
                items,
                summary: {
                    ...summary,
                    margin: parseFloat(margin.toFixed(1))
                }
            }
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
// POST /api/inventory - Add new inventory item
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

        // Execute use case
        const result = await addStockUseCase.execute({
            userId,
            itemName,
            quantity,
            costPrice,
            sellingPrice,
            reorderLevel
        });

        res.status(201).json({
            success: true,
            message: 'Stock added successfully',
            data: result
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
// PUT /api/inventory/:id - Update inventory item
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { itemName, costPrice, sellingPrice, reorderLevel } = req.body;

        // Check if item exists
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

        // Build update data
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
        const { action, quantity } = req.body;

        // Validate
        if (!['add', 'remove', 'set'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be "add", "remove", or "set"'
            });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }

        // Check if item exists
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

        let result;
        switch (action) {
            case 'add':
                result = await inventoryRepo.addStock(id, quantity);
                break;
            case 'remove':
                result = await inventoryRepo.reduceStock(id, quantity);
                break;
            case 'set':
                result = await inventoryRepo.update(id, { quantity });
                break;
        }

        res.json({
            success: true,
            message: `Stock ${action}ed successfully`,
            data: result
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

        // Check if item exists
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
        const margin = summary.total_cost_value > 0 
            ? ((summary.total_profit / summary.total_cost_value) * 100) 
            : 0;

        res.json({
            success: true,
            data: {
                ...summary,
                margin: parseFloat(margin.toFixed(1))
            }
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

// =============================================
// GET /api/inventory/value - Get inventory value
// =============================================
router.get('/value', async (req, res) => {
    try {
        const userId = req.user.id;

        // Use the existing use case
        const result = await getInventoryValueUseCase.execute({ businessId: userId });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Error fetching inventory value:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch inventory value'
        });
    }
});

module.exports = router;