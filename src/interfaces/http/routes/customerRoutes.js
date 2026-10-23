// src/interfaces/http/routes/customerRoutes.js
// v1.4.1-prod — Error classification: user errors return 400/404/409, not 500.
// v1.4.0-prod — Write routes require OWNER/ADMIN/MANAGER/CASHIER.
// v1.3.0-prod — GET / pagination standardized.

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
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { cacheService } = require('../../../infrastructure/services/cache/CacheService');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const customerRepo = new CustomerRepository();

const getCustomersUseCase = new GetCustomersUseCase({ customerRepository: customerRepo });
const getCustomerUseCase = new GetCustomerUseCase({ customerRepository: customerRepo });
const getCustomerHistoryUseCase = new GetCustomerHistoryUseCase({
    customerRepository: customerRepo,
    saleRepository: require('../../../infrastructure/database/sqlite/repositories/SaleRepository'),
    debtorRepository: require('../../../infrastructure/database/sqlite/repositories/DebtorRepository'),
});
const createCustomerUseCase = new CreateCustomerUseCase({ customerRepository: customerRepo });
const updateCustomerUseCase = new UpdateCustomerUseCase({ customerRepository: customerRepo });
const deleteCustomerUseCase = new DeleteCustomerUseCase({ customerRepository: customerRepo });

router.use(authMiddleware);

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'];
const CUSTOMERS_CACHE_TTL_MS = 30_000;

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

// =============================================
// GET /api/customers
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId || req.query.businessId;
        const { search, type } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { page, limit, offset } = parsePagination(req.query);
        const normalizedSearch = search || '';
        const normalizedType = type || '';

        const cacheKey = `aicfo:customers:${businessId}:p${page}:l${limit}:${normalizedSearch}:${normalizedType}`;

        const payload = await cacheService.getOrSet(
            cacheKey,
            async () => {
                const result = await getCustomersUseCase.execute({
                    businessId, limit, offset,
                    search: normalizedSearch || null,
                    type: normalizedType || null,
                });

                return {
                    ...result,
                    pagination: buildPaginationMeta({
                        page, limit, total: result?.total || 0,
                    }),
                };
            },
            CUSTOMERS_CACHE_TTL_MS
        );

        res.json(payload);
    } catch (error) {
        console.error('❌ Error fetching customers:', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch customers' });
    }
});

// =============================================
// GET /api/customers/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
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
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch customer' });
    }
});

// =============================================
// GET /api/customers/:id/history
// =============================================
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
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
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch customer history' });
    }
});

// =============================================
// POST /api/customers — OWNER / ADMIN / MANAGER / CASHIER
// =============================================
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { name, phone, email, address, type, notes, metadata } = req.body;

        const result = await createCustomerUseCase.execute({
            businessId, name, phone, email, address,
            type: type || 'CUSTOMER',
            notes, metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ Error creating customer:', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to create customer' });
    }
});

// =============================================
// PUT /api/customers/:id — OWNER / ADMIN / MANAGER / CASHIER
// =============================================
router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { name, phone, email, address, type, notes, metadata } = req.body;

        const result = await updateCustomerUseCase.execute({
            id: parseInt(id), businessId,
            name, phone, email, address, type, notes, metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error updating customer:', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to update customer' });
    }
});

// =============================================
// DELETE /api/customers/:id — OWNER / ADMIN / MANAGER / CASHIER
// =============================================
router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.query.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const result = await deleteCustomerUseCase.execute({
            id: parseInt(id),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ Error deleting customer:', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to delete customer' });
    }
});

module.exports = router;