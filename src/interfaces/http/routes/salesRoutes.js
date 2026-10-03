// src/interfaces/http/routes/salesRoutes.js
// v2.1.0-prod — multi-tenant aware + 30s read cache for GET /
//
// v2.1.0 changes:
//   - GET / cached for 30s (+60s stale-while-revalidate) via
//     cacheService.getOrSet. Key: aicfo:sales:{businessId}.
//   - Cache auto-invalidated by invalidateAfterWrite on any successful
//     POST/PUT/DELETE under this business.
//   - Same response shape. No API contract change.

const express = require('express');
const router = express.Router();
const RecordSaleUseCase = require('../../../application/useCases/sales/RecordSaleUseCase');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { cacheService } = require('../../../infrastructure/services/cache/CacheService');

const saleRepo = new SaleRepository();
const inventoryRepo = new InventoryRepository();
const debtorRepo = new DebtorRepository();
const customerRepo = new CustomerRepository();
const paymentRepo = new PaymentRepository();

const recordSaleUseCase = new RecordSaleUseCase(
    saleRepo,
    inventoryRepo,
    debtorRepo,
    customerRepo,
    paymentRepo
);

router.use(authMiddleware);

const SALES_CACHE_TTL_MS = 30_000;

// =============================================
// GET /api/sales
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context missing' });
        }

        const cacheKey = `aicfo:sales:${businessId}`;

        const payload = await cacheService.getOrSet(
            cacheKey,
            async () => {
                const sales = await saleRepo.findByBusinessId(businessId);
                return {
                    success: true,
                    data: {
                        sales: sales || [],
                        count: sales?.length || 0,
                    },
                };
            },
            SALES_CACHE_TTL_MS
        );

        res.json(payload);
    } catch (error) {
        console.error('[salesRoutes] GET error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch sales',
        });
    }
});

// =============================================
// POST /api/sales
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context missing' });
        }

        const {
            itemName,
            quantity,
            unitPrice,
            customerName,
            customerId = null,
            customerType = 'CUSTOMER',
            paymentStatus = 'UNPAID',
            amountPaid = 0,
            skipInventory = false,
            inventoryId = null,
            saleDate = new Date(),
            items = [],
            totalCost = 0,
            totalRevenue = 0,
            totalProfit = 0,
            notes = '',
        } = req.body;

        const result = await recordSaleUseCase.execute({
            userId,
            businessId,
            itemName,
            quantity: quantity || (items.length > 0 ? items[0]?.quantity : 0),
            unitPrice: unitPrice || (items.length > 0 ? items[0]?.sellingPrice : 0),
            customerName,
            customerId,
            customerType,
            paymentStatus,
            amountPaid,
            skipInventory,
            inventoryId,
            saleDate: saleDate || new Date(),
            items,
            totalCost,
            totalRevenue,
            totalProfit,
            notes: notes || '',
        });

        const allSales = await saleRepo.findByBusinessId(businessId);

        res.status(201).json({
            success: true,
            message: 'Sale recorded successfully',
            data: {
                sale: result,
                allSales,
                count: allSales.length,
            },
        });
    } catch (error) {
        console.error('[salesRoutes] POST error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record sale',
        });
    }
});

// =============================================
// GET /api/sales/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId;

        const saleId = parseInt(id);
        if (isNaN(saleId)) {
            return res.status(400).json({ success: false, message: 'Invalid sale ID' });
        }

        const sale = await saleRepo.findById(saleId);
        if (!sale) {
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        if (sale.business_id !== businessId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: sale });
    } catch (error) {
        console.error('[salesRoutes] GET :id error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch sale',
        });
    }
});

module.exports = router;