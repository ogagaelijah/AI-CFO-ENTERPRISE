// src/interfaces/http/routes/customerRoutes.js
// v1.2.0-prod — 30s read cache on list endpoint. Removed taxId (migration 019).
//
// v1.2.0 changes:
//   - GET / (list) now cached for 30s (+60s stale-while-revalidate).
//     Key: aicfo:customers:{businessId}:{limit}:{offset}:{search}:{type}.
//   - Single-customer, history, create, update, delete: unchanged.
//   - Cache auto-invalidated on any successful write via
//     invalidateAfterWrite (already mounted on POST/PUT/DELETE).

const express = require('express');
const router = express.Router();
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const GetCustomersUseCase = require('../../../application/useCases/customers/GetCustomersUseCase');
const GetCustomerUseCase = require('../../../application/useCases/customers/GetCustomerUseCase');
const GetCustomerHistoryUseCase = require('../../../application/useCases/customers/GetCustomerHistoryUseCase');
const CreateCustomerUseCase = require('../../../application/useCases/customers/CreateCustomerUseCase');
const UpdateCustomerUseCase = require('../../../application/useCases/customers/UpdateCustomerUseCase');
const DeleteCustomerUseCase = require('../../../application/useCases/customers/DeleteCustomerUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { cacheService } = require('../../../infrastructure/services/cache/CacheService');

const customerRepo = new CustomerRepository();

const getCustomersUseCase = new GetCustomersUseCase({
    customerRepository: customerRepo,
});

const getCustomerUseCase = new GetCustomerUseCase({
    customerRepository: customerRepo,
});

const getCustomerHistoryUseCase = new GetCustomerHistoryUseCase({
    customerRepository: customerRepo,
    saleRepository: require('../../../infrastructure/database/sqlite/repositories/SaleRepository'),
    debtorRepository: require('../../../infrastructure/database/sqlite/repositories/DebtorRepository'),
});

const createCustomerUseCase = new CreateCustomerUseCase({
    customerRepository: customerRepo,
});

const updateCustomerUseCase = new UpdateCustomerUseCase({
    customerRepository: customerRepo,
});

const deleteCustomerUseCase = new DeleteCustomerUseCase({
    customerRepository: customerRepo,
});

router.use(authMiddleware);

const CUSTOMERS_CACHE_TTL_MS = 30_000;

// =============================================
// GET /api/customers - Get all customers
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId || req.query.businessId;
        const { limit = 50, offset = 0, search, type } = req.query;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const parsedLimit = parseInt(limit);
        const parsedOffset = parseInt(offset);
        const normalizedSearch = search || '';
        const normalizedType = type || '';

        const cacheKey = `aicfo:customers:${businessId}:${parsedLimit}:${parsedOffset}:${normalizedSearch}:${normalizedType}`;

        const payload = await cacheService.getOrSet(
            cacheKey,
            () => getCustomersUseCase.execute({
                businessId,
                limit: parsedLimit,
                offset: parsedOffset,
                search: normalizedSearch || null,
                type: normalizedType || null,
            }),
            CUSTOMERS_CACHE_TTL_MS
        );

        res.json(payload);
    } catch (error) {
        console.error('❌ Error fetching customers:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customers',
        });
    }
});

// =============================================
// GET /api/customers/:id - Get single customer
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await getCustomerUseCase.execute({
            customerId: parseInt(id),
            businessId: businessId,
        });

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching customer:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customer',
        });
    }
});

// =============================================
// GET /api/customers/:id/history - Get customer history
// =============================================
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await getCustomerHistoryUseCase.execute({
            customerId: parseInt(id),
            businessId: businessId,
            limit: parseInt(req.query.limit) || 20,
        });

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ Error fetching customer history:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customer history',
        });
    }
});

// =============================================
// POST /api/customers - Create customer
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const { name, phone, email, address, type, notes, metadata } = req.body;

        const result = await createCustomerUseCase.execute({
            businessId,
            name,
            phone,
            email,
            address,
            type: type || 'CUSTOMER',
            notes,
            metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ Error creating customer:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create customer',
        });
    }
});

// =============================================
// PUT /api/customers/:id - Update customer
// =============================================
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const { name, phone, email, address, type, notes, metadata } = req.body;

        const result = await updateCustomerUseCase.execute({
            id: parseInt(id),
            businessId,
            name,
            phone,
            email,
            address,
            type,
            notes,
            metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error updating customer:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update customer',
        });
    }
});

// =============================================
// DELETE /api/customers/:id - Delete customer
// =============================================
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await deleteCustomerUseCase.execute({
            id: parseInt(id),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error deleting customer:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete customer',
        });
    }
});

module.exports = router;