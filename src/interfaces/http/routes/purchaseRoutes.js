// src/interfaces/http/routes/purchaseRoutes.js
// v2.4.0-prod — Adds pagination to GET /.
// v2.3.0-prod — Purchases are append-only: PUT and DELETE always return 405.
//               POST requires OWNER/ADMIN/MANAGER.
// v2.2.0-prod — Backend-enforced confirmation

const express = require('express');
const router = express.Router();
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const InventoryMovementRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryMovementRepository');
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const SupplierRepository = require('../../../infrastructure/database/sqlite/repositories/SupplierRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const RecordPurchaseUseCase = require('../../../application/useCases/purchases/RecordPurchaseUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination'); // ★ NEW

const purchaseRepo = new PurchaseRepository();
const inventoryRepo = new InventoryRepository();
const inventoryMovementRepo = new InventoryMovementRepository();
const creditorRepo = new CreditorRepository();
const supplierRepo = new SupplierRepository();
const paymentRepo = new PaymentRepository();

const recordPurchaseUseCase = new RecordPurchaseUseCase({
    purchaseRepository: purchaseRepo,
    transactionRepository: null,
    inventoryRepository: inventoryRepo,
    inventoryMovementRepository: inventoryMovementRepo,
    creditorRepository: creditorRepo,
    supplierRepository: supplierRepo,
    paymentRepository: paymentRepo,
});

router.use(authMiddleware);

// =============================================
// GET /api/purchases?page=1&limit=50
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context missing' });
        }

        const { startDate, endDate, itemName, supplier } = req.query;

        // ★ NEW: If filters are applied, we fall back to non-paginated (for now)
        // Otherwise, use pagination
        if (!startDate && !endDate && !supplier && !itemName) {
            const { page, limit, offset } = parsePagination(req.query);
            
            const [purchases, total, summary] = await Promise.all([
                purchaseRepo.findByBusinessIdPaginated(businessId, { limit, offset }),
                purchaseRepo.countByBusinessId(businessId),
                purchaseRepo.getPurchaseSummary(businessId)
            ]);

            return res.json({
                success: true,
                data: {
                    purchases: purchases || [],
                    summary,
                    pagination: buildPaginationMeta({ page, limit, total }),
                },
            });
        }

        // Fallback for filtered queries (unchanged logic)
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
                summary,
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
// POST /api/purchases — REQUIRES confirmed: true — OWNER / ADMIN / MANAGER
// =============================================
router.post(
    '/',
    requireRole('OWNER', 'ADMIN', 'MANAGER'),
    invalidateAfterWrite,
    async (req, res) => {
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
                confirmed,
            } = req.body;

            if (confirmed !== true) {
                return res.status(400).json({
                    success: false,
                    message: 'Purchase not confirmed. Set "confirmed": true to record.',
                    code: 'CONFIRMATION_REQUIRED',
                });
            }

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
    }
);

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
// PUT /api/purchases/:id — BLOCKED (append-only)
// =============================================
router.put('/:id', (req, res) => {
    res.status(405).json({
        success: false,
        message: 'Purchase records cannot be edited. Record a reversal entry instead.',
    });
});

// =============================================
// DELETE /api/purchases/:id — BLOCKED (append-only)
// =============================================
router.delete('/:id', (req, res) => {
    res.status(405).json({
        success: false,
        message: 'Purchase records cannot be deleted. Record a reversal entry instead.',
    });
});

module.exports = router;