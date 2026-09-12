// src/interfaces/http/routes/purchaseRoutes.js
// v2.0.0-prod — multi-tenant aware

const express = require('express');
const router = express.Router();
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const InventoryTransactionRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryTransactionRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const SupplierRepository = require('../../../infrastructure/database/sqlite/repositories/SupplierRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const RecordPurchaseUseCase = require('../../../application/useCases/purchases/RecordPurchaseUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const purchaseRepo = new PurchaseRepository();
const inventoryRepo = new InventoryRepository();
const inventoryTransactionRepo = new InventoryTransactionRepository();
const creditorRepo = new CreditorRepository();
const supplierRepo = new SupplierRepository();
const paymentRepo = new PaymentRepository();

const recordPurchaseUseCase = new RecordPurchaseUseCase({
    purchaseRepository: purchaseRepo,
    transactionRepository: null,
    inventoryRepository: inventoryRepo,
    inventoryTransactionRepository: inventoryTransactionRepo,
    creditorRepository: creditorRepo,
    supplierRepository: supplierRepo,
    paymentRepository: paymentRepo,
});

router.use(authMiddleware);

// =============================================
// GET /api/purchases
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context missing' });
        }

        const { startDate, endDate, itemName, supplier } = req.query;

        let purchases;
        if (startDate && endDate) {
            purchases = await purchaseRepo.findByDateRange(businessId, startDate, endDate);
        } else if (supplier) {
            purchases = await purchaseRepo.findBySupplier(businessId, supplier);
        } else {
            purchases = await purchaseRepo.findByBusinessId(businessId);
        }

        const summary = await purchaseRepo.getPurchaseSummary(businessId);

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
                },
            },
        });
    } catch (error) {
        console.error('[purchaseRoutes] GET error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch purchases',
        });
    }
});

// =============================================
// GET /api/purchases/today
// =============================================
router.get('/today', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const purchases = await purchaseRepo.getTodayPurchases(businessId);

        res.json({
            success: true,
            data: {
                purchases: purchases || [],
                count: purchases.length,
                total: purchases.reduce((sum, p) => sum + p.total_cost, 0),
            },
        });
    } catch (error) {
        console.error('[purchaseRoutes] GET /today error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch today purchases',
        });
    }
});

// =============================================
// GET /api/purchases/summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { month, year } = req.query;

        let summary;
        if (month && year) {
            summary = await purchaseRepo.getMonthlySummary(businessId, parseInt(month), parseInt(year));
        } else {
            summary = await purchaseRepo.getPurchaseSummary(businessId);
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
            },
        });
    } catch (error) {
        console.error('[purchaseRoutes] GET /summary error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch purchase summary',
        });
    }
});

// =============================================
// POST /api/purchases
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context missing' });
        }

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

        const hasItems = items && items.length > 0;
        const hasSingleItem = itemName && quantity && unitCost;

        if (!hasItems && !hasSingleItem) {
            return res.status(400).json({
                success: false,
                message: 'Either "items" array or (itemName, quantity, unitCost) is required',
            });
        }

        if (hasItems) {
            for (const item of items) {
                if (!item.name || !item.name.trim()) {
                    return res.status(400).json({ success: false, message: 'All items must have a name' });
                }
                if (!item.quantity || item.quantity <= 0) {
                    return res.status(400).json({ success: false, message: `Quantity for "${item.name}" must be greater than 0` });
                }
                if (!item.unitCost || item.unitCost <= 0) {
                    return res.status(400).json({ success: false, message: `Unit cost for "${item.name}" must be greater than 0` });
                }
            }
        }

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

        res.status(201).json({
            success: true,
            message: 'Purchase recorded successfully',
            data: result,
        });
    } catch (error) {
        console.error('[purchaseRoutes] POST error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record purchase',
        });
    }
});

// =============================================
// GET /api/purchases/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;

        const purchase = await purchaseRepo.findById(parseInt(id));

        if (!purchase) {
            return res.status(404).json({ success: false, message: 'Purchase record not found' });
        }
        if (purchase.business_id !== businessId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: purchase });
    } catch (error) {
        console.error('[purchaseRoutes] GET :id error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch purchase' });
    }
});

// =============================================
// PUT /api/purchases/:id
// =============================================
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;
        const { supplierName, itemName, quantity, unitCost, totalCost, paymentStatus, amountPaid, dueDate } = req.body;

        const existing = await purchaseRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Purchase record not found' });
        }
        if (existing.business_id !== businessId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
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

        res.json({ success: true, message: 'Purchase updated successfully', data: updated });
    } catch (error) {
        console.error('[purchaseRoutes] PUT error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to update purchase' });
    }
});

// =============================================
// DELETE /api/purchases/:id
// =============================================
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;

        const existing = await purchaseRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Purchase record not found' });
        }
        if (existing.business_id !== businessId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await purchaseRepo.delete(parseInt(id));

        res.json({ success: true, message: 'Purchase record deleted successfully' });
    } catch (error) {
        console.error('[purchaseRoutes] DELETE error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete purchase' });
    }
});

module.exports = router;