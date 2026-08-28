// src/interfaces/http/routes/customerRoutes.js

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

// Initialize repository
const customerRepo = new CustomerRepository();

// Initialize use cases
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

// =============================================
// GET /api/customers - Get all customers
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId || req.query.businessId;
        const { limit = 50, offset = 0, search, type } = req.query;

        console.log('🔍 [GET /api/customers] businessId:', businessId);
        console.log('🔍 [GET /api/customers] limit:', limit, 'offset:', offset, 'search:', search, 'type:', type);

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const result = await getCustomersUseCase.execute({
            businessId,
            limit: parseInt(limit),
            offset: parseInt(offset),
            search: search || null,
            type: type || null,
        });

        console.log('🔍 [GET /api/customers] result count:', result.customers?.length || 0);

        res.json(result);

    } catch (error) {
        console.error('❌ Error fetching customers:', error);
        console.error('❌ Error stack:', error.stack);
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

        console.log('🔍 [GET /api/customers/:id] id:', id);
        console.log('🔍 [GET /api/customers/:id] businessId:', businessId);

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

        console.log('🔍 [GET /api/customers/:id] result success:', result.success);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);

    } catch (error) {
        console.error('❌ Error fetching customer:', error);
        console.error('❌ Error stack:', error.stack);
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
        console.error('❌ Error fetching customer history:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customer history',
        });
    }
});

// =============================================
// POST /api/customers - Create customer
// =============================================
router.post('/', async (req, res) => {
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
        console.error('❌ Error creating customer:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create customer',
        });
    }
});

// =============================================
// PUT /api/customers/:id - Update customer
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const businessId = req.user.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                success: false,
                message: 'Business ID is required',
            });
        }

        const { name, phone, email, address, type, taxId, notes, metadata } = req.body;

        const result = await updateCustomerUseCase.execute({
            id: parseInt(id),
            businessId,
            name,
            phone,
            email,
            address,
            type,
            taxId,
            notes,
            metadata,
        });

        res.json(result);

    } catch (error) {
        console.error('❌ Error updating customer:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update customer',
        });
    }
});

// =============================================
// DELETE /api/customers/:id - Delete customer
// =============================================
router.delete('/:id', async (req, res) => {
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
        console.error('❌ Error deleting customer:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete customer',
        });
    }
});

module.exports = router;