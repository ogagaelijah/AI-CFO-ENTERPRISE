// src/interfaces/http/routes/purchaseRoutes.js
const express = require('express');
const router = express.Router();
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const InventoryTransactionRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryTransactionRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const SupplierRepository = require('../../../infrastructure/database/sqlite/repositories/SupplierRepository');
const RecordPurchaseUseCase = require('../../../application/useCases/purchases/RecordPurchaseUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');

// Initialize repositories
const purchaseRepo = new PurchaseRepository();
const inventoryRepo = new InventoryRepository();
const inventoryTransactionRepo = new InventoryTransactionRepository();
const creditorRepo = new CreditorRepository();
const supplierRepo = new SupplierRepository();

// Initialize use case
const recordPurchaseUseCase = new RecordPurchaseUseCase({
    purchaseRepository: purchaseRepo,
    transactionRepository: null,
    inventoryRepository: inventoryRepo,
    inventoryTransactionRepository: inventoryTransactionRepo,
    creditorRepository: creditorRepo,
    supplierRepository: supplierRepo,
});

router.use(authMiddleware);

// =============================================
// GET /api/purchases - Get all purchases
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, itemName, supplier } = req.query;

        let purchases;
        if (startDate && endDate) {
            purchases = await purchaseRepo.findByDateRange(userId, startDate, endDate);
        } else if (itemName) {
            purchases = await purchaseRepo.findByItemName(userId, itemName);
        } else if (supplier) {
            purchases = await purchaseRepo.findBySupplier(userId, supplier);
        } else {
            purchases = await purchaseRepo.findByUserId(userId);
        }

        const summary = await purchaseRepo.getPurchaseSummary(userId);

        res.json({
            success: true,
            data: {
                purchases: purchases || [],
                summary: summary || {
                    total_purchases: 0,
                    total_amount: 0,
                    total_items: 0,
                    average_purchase: 0,
                    suppliers_used: 0,
                    total_paid: 0,
                    total_outstanding: 0,
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching purchases:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch purchases'
        });
    }
});

// =============================================
// GET /api/purchases/today - Get today's purchases
// =============================================
router.get('/today', async (req, res) => {
    try {
        const userId = req.user.id;

        const purchases = await purchaseRepo.getTodayPurchases(userId);

        res.json({
            success: true,
            data: {
                purchases: purchases || [],
                count: purchases.length,
                total: purchases.reduce((sum, p) => sum + p.total_cost, 0)
            }
        });

    } catch (error) {
        console.error('❌ Error fetching today purchases:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch today purchases'
        });
    }
});

// =============================================
// GET /api/purchases/summary - Get purchase summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const { month, year } = req.query;

        let summary;
        if (month && year) {
            summary = await purchaseRepo.getMonthlySummary(userId, parseInt(month), parseInt(year));
        } else {
            summary = await purchaseRepo.getPurchaseSummary(userId);
        }

        res.json({
            success: true,
            data: summary || {
                total_purchases: 0,
                total_amount: 0,
                total_items: 0,
                average_purchase: 0,
                suppliers_used: 0,
                total_paid: 0,
                total_outstanding: 0,
            }
        });

    } catch (error) {
        console.error('❌ Error fetching purchase summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch purchase summary'
        });
    }
});

// =============================================
// POST /api/purchases - Record new purchase
// =============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId || req.body.businessId;

        console.log('🔍 ===== PURCHASE POST DEBUG =====');
        console.log('🔍 userId:', userId);
        console.log('🔍 businessId:', businessId);
        console.log('🔍 req.user:', req.user);
        console.log('🔍 req.body:', JSON.stringify(req.body, null, 2));
        console.log('🔍 =================================');

        const {
            supplierName,
            supplierPhone,
            supplierEmail,
            itemName,
            quantity,
            unitCost,
            totalCost,
            paymentStatus = 'UNPAID',
            amountPaid = 0,
            dueDate = null,
            notes = '',
            purchaseDate = new Date(),
            items = [],
        } = req.body;

        // ✅ Check if using multi-item format
        const hasItems = items && items.length > 0;
        const hasSingleItem = itemName && quantity && unitCost;

        console.log('🔍 hasItems:', hasItems);
        console.log('🔍 hasSingleItem:', hasSingleItem);
        console.log('🔍 items array:', items);

        // ✅ Validate based on format
        if (!hasItems && !hasSingleItem) {
            return res.status(400).json({
                success: false,
                message: 'Either "items" array or (itemName, quantity, unitCost) is required'
            });
        }

        // ✅ If using multi-item, validate each item
        if (hasItems) {
            for (const item of items) {
                if (!item.name || !item.name.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'All items must have a name'
                    });
                }
                if (!item.quantity || item.quantity <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Quantity for "${item.name}" must be greater than 0`
                    });
                }
                if (!item.unitCost || item.unitCost <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Unit cost for "${item.name}" must be greater than 0`
                    });
                }
                // ✅ REMOVED: selling price validation
            }
        } else {
            // ✅ Validate single item
            if (!itemName) {
                return res.status(400).json({
                    success: false,
                    message: 'Item name is required'
                });
            }
            if (!quantity || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity must be greater than 0'
                });
            }
            if (!unitCost || unitCost <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Unit cost must be greater than 0'
                });
            }
            // ✅ REMOVED: selling price validation
        }

        console.log('✅ Validation passed, executing use case...');

        const result = await recordPurchaseUseCase.execute({
            userId,
            businessId,
            supplierName,
            supplierPhone,
            supplierEmail,
            itemName,
            quantity,
            unitCost,
            totalCost,
            paymentStatus,
            amountPaid,
            dueDate,
            notes,
            purchaseDate,
            items: hasItems ? items : [],
        });

        console.log('✅ Purchase recorded successfully:', result.purchase?.id);

        res.status(201).json({
            success: true,
            message: 'Purchase recorded successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ Error recording purchase:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record purchase'
        });
    }
});

// =============================================
// GET /api/purchases/:id - Get single purchase
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const purchase = await purchaseRepo.findById(parseInt(id));

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Purchase record not found'
            });
        }

        if (purchase.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: purchase
        });

    } catch (error) {
        console.error('❌ Error fetching purchase:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch purchase'
        });
    }
});

// =============================================
// PUT /api/purchases/:id - Update purchase
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const {
            supplierName,
            itemName,
            quantity,
            unitCost,
            totalCost,
            paymentStatus,
            amountPaid,
            dueDate,
        } = req.body;

        const existing = await purchaseRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Purchase record not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updateData = {};
        if (supplierName !== undefined) updateData.supplier_name = supplierName;
        if (itemName !== undefined) updateData.item_name = itemName;
        if (quantity !== undefined) updateData.quantity = quantity;
        if (unitCost !== undefined) updateData.unit_cost = unitCost;
        if (totalCost !== undefined) updateData.total_cost = totalCost;
        if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
        if (amountPaid !== undefined) updateData.amount_paid = amountPaid;
        if (dueDate !== undefined) updateData.due_date = dueDate;

        const updated = await purchaseRepo.update(parseInt(id), updateData);

        res.json({
            success: true,
            message: 'Purchase updated successfully',
            data: updated
        });

    } catch (error) {
        console.error('❌ Error updating purchase:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update purchase'
        });
    }
});

// =============================================
// DELETE /api/purchases/:id - Delete purchase
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await purchaseRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Purchase record not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await purchaseRepo.delete(parseInt(id));

        res.json({
            success: true,
            message: 'Purchase record deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting purchase:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete purchase'
        });
    }
});

module.exports = router;