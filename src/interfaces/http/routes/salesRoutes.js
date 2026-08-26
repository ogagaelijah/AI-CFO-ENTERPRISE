// src/interfaces/http/routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const RecordSaleUseCase = require('../../../application/useCases/sales/RecordSaleUseCase');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const InventoryRepository = require('../../../infrastructure/database/sqlite/repositories/InventoryRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const { authMiddleware } = require('../middleware/authMiddleware');

// Initialize repositories
const saleRepo = new SaleRepository();
const inventoryRepo = new InventoryRepository();
const debtorRepo = new DebtorRepository();
const customerRepo = new CustomerRepository();

// Initialize Use Case
const recordSaleUseCase = new RecordSaleUseCase(
    saleRepo,
    inventoryRepo,
    debtorRepo,
    customerRepo
);

// All routes require authentication
router.use(authMiddleware);

// =============================================
// ✅ GET /api/sales - Get all sales
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('🔍 GET /sales - User ID:', userId);

        const sales = await saleRepo.findByUserId(userId);

        console.log('🔍 GET /sales - Found:', sales?.length || 0, 'sales');

        res.json({
            success: true,
            data: {
                sales: sales || [],
                count: sales?.length || 0
            }
        });

    } catch (error) {
        console.error('❌ Error fetching sales:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch sales'
        });
    }
});

// =============================================
// ✅ POST /api/sales - Record a new sale (Single or Multi-item)
// =============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = userId;

        console.log('🔍 POST /sales - User ID:', userId);
        console.log('🔍 POST /sales - Body:', req.body);

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

        // ✅ Handle both single and multi-item in ONE call
        const result = await recordSaleUseCase.execute({
            userId,
            businessId: userId,
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
            items: items,
            totalCost,
            totalRevenue,
            totalProfit,
            notes: notes || '',
        });

        // ✅ Get all sales after recording
        const allSales = await saleRepo.findByUserId(userId);

        res.status(201).json({
            success: true,
            message: `Sale recorded successfully`,
            data: {
                sale: result,
                allSales: allSales,
                count: allSales.length
            }
        });

    } catch (error) {
        console.error('❌ Error recording sale:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record sale'
        });
    }
});

// =============================================
// ✅ GET /api/sales/:id - Get single sale
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const saleId = parseInt(id);
        if (isNaN(saleId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sale ID'
            });
        }

        const sale = await saleRepo.findById(saleId);

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found'
            });
        }

        if (sale.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: sale
        });

    } catch (error) {
        console.error('❌ Error fetching sale:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch sale'
        });
    }
});

module.exports = router;