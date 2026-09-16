// src/interfaces/http/routes/invoiceRoutes.js

'use strict';

const express = require('express');
const router = express.Router();

const InvoiceRepository = require('../../../infrastructure/database/sqlite/repositories/InvoiceRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const ProjectRepository = require('../../../infrastructure/database/sqlite/repositories/ProjectRepository');

const CreateInvoiceUseCase = require('../../../application/useCases/invoices/CreateInvoiceUseCase');
const GetInvoiceUseCase = require('../../../application/useCases/invoices/GetInvoiceUseCase');
const GetInvoicesUseCase = require('../../../application/useCases/invoices/GetInvoicesUseCase');
const UpdateInvoiceUseCase = require('../../../application/useCases/invoices/UpdateInvoiceUseCase');
const DeleteInvoiceUseCase = require('../../../application/useCases/invoices/DeleteInvoiceUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const invoiceRepo = new InvoiceRepository();
const customerRepo = new CustomerRepository();
const projectRepo = new ProjectRepository();

const createInvoiceUseCase = new CreateInvoiceUseCase({
    invoiceRepository: invoiceRepo,
    customerRepository: customerRepo,
    projectRepository: projectRepo,
});
const getInvoiceUseCase = new GetInvoiceUseCase({ invoiceRepository: invoiceRepo });
const getInvoicesUseCase = new GetInvoicesUseCase({ invoiceRepository: invoiceRepo });
const updateInvoiceUseCase = new UpdateInvoiceUseCase({
    invoiceRepository: invoiceRepo,
    customerRepository: customerRepo,
    projectRepository: projectRepo,
});
const deleteInvoiceUseCase = new DeleteInvoiceUseCase({ invoiceRepository: invoiceRepo });

router.use(authMiddleware);

// GET /api/invoices
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            limit = 50, offset = 0, status, customerId, projectId,
            fromDate, toDate, search,
        } = req.query;

        const result = await getInvoicesUseCase.execute({
            businessId,
            status: status || null,
            customerId: customerId ? parseInt(customerId, 10) : null,
            projectId: projectId ? parseInt(projectId, 10) : null,
            fromDate: fromDate || null,
            toDate: toDate || null,
            search: search || null,
            limit,
            offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/invoices]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch invoices' });
    }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await getInvoiceUseCase.execute({
            invoiceId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : 500;
        console.error('❌ [GET /api/invoices/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/invoices
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            customerId, projectId, invoiceNumber, issueDate, dueDate,
            subtotal, tax, currency, notes, metadata,
        } = req.body;

        const result = await createInvoiceUseCase.execute({
            businessId,
            customerId: customerId || null,
            projectId: projectId || null,
            invoiceNumber: invoiceNumber || null,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            subtotal,
            tax,
            currency,
            notes,
            metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/invoices]', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT /api/invoices/:id
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const {
            customerId, projectId, invoiceNumber, issueDate, dueDate,
            status, subtotal, tax, currency, notes, metadata,
        } = req.body;

        const result = await updateInvoiceUseCase.execute({
            invoiceId: parseInt(id, 10),
            businessId,
            customerId,
            projectId,
            invoiceNumber,
            issueDate: issueDate !== undefined ? (issueDate ? new Date(issueDate) : null) : undefined,
            dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
            status,
            subtotal,
            tax,
            currency,
            notes,
            metadata,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [PUT /api/invoices/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// DELETE /api/invoices/:id
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteInvoiceUseCase.execute({
            invoiceId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : 400;
        console.error('❌ [DELETE /api/invoices/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;