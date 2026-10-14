// src/interfaces/http/routes/invoiceRoutes.js
// v1.1.0-prod — GET / pagination standardized. Response shape preserved
//               ({ success, invoices, summary, pagination }); pagination
//               block now { page, limit, total, totalPages, hasNext, hasPrev }.

'use strict';

const express = require('express');
const router = express.Router();

const InvoiceRepository = require('../../../infrastructure/database/sqlite/repositories/InvoiceRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const ProjectRepository = require('../../../infrastructure/database/sqlite/repositories/ProjectRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const TransactionRepository = require('../../../infrastructure/database/sqlite/repositories/TransactionRepository');

const CreateInvoiceUseCase = require('../../../application/useCases/invoices/CreateInvoiceUseCase');
const GetInvoiceUseCase = require('../../../application/useCases/invoices/GetInvoiceUseCase');
const GetInvoicesUseCase = require('../../../application/useCases/invoices/GetInvoicesUseCase');
const UpdateInvoiceUseCase = require('../../../application/useCases/invoices/UpdateInvoiceUseCase');
const DeleteInvoiceUseCase = require('../../../application/useCases/invoices/DeleteInvoiceUseCase');
const RecordInvoicePaymentUseCase = require('../../../application/useCases/invoices/RecordInvoicePaymentUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const invoiceRepo = new InvoiceRepository();
const customerRepo = new CustomerRepository();
const projectRepo = new ProjectRepository();
const debtorRepo = new DebtorRepository();
const paymentRepo = new PaymentRepository();
const transactionRepo = new TransactionRepository();

const createInvoiceUseCase = new CreateInvoiceUseCase({
    invoiceRepository: invoiceRepo,
    customerRepository: customerRepo,
    projectRepository: projectRepo,
    debtorRepository: debtorRepo,
});
const getInvoiceUseCase = new GetInvoiceUseCase({ invoiceRepository: invoiceRepo });
const getInvoicesUseCase = new GetInvoicesUseCase({ invoiceRepository: invoiceRepo });
const updateInvoiceUseCase = new UpdateInvoiceUseCase({
    invoiceRepository: invoiceRepo,
    customerRepository: customerRepo,
    projectRepository: projectRepo,
    debtorRepository: debtorRepo,
});
const deleteInvoiceUseCase = new DeleteInvoiceUseCase({
    invoiceRepository: invoiceRepo,
    debtorRepository: debtorRepo,
});
const recordInvoicePaymentUseCase = new RecordInvoicePaymentUseCase({
    invoiceRepository: invoiceRepo,
    debtorRepository: debtorRepo,
    paymentRepository: paymentRepo,
    transactionRepository: transactionRepo,
});

router.use(authMiddleware);

// GET /api/invoices?page=1&limit=50
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { status, customerId, projectId, fromDate, toDate, search } = req.query;
        const { page, limit, offset } = parsePagination(req.query);

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

        // Extract total from the use case's pagination block (which uses
        // { total, limit, offset, hasMore }) and re-emit as standardized.
        const total = result?.pagination?.total || 0;

        res.json({
            ...result,
            pagination: buildPaginationMeta({ page, limit, total }),
        });
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
        const userId = req.user.id;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            customerId, projectId, invoiceNumber, issueDate, dueDate,
            status, subtotal, tax, currency, notes, metadata,
        } = req.body;

        const result = await createInvoiceUseCase.execute({
            businessId,
            userId,
            customerId: customerId || null,
            projectId: projectId || null,
            invoiceNumber: invoiceNumber || null,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'DRAFT',
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
        const userId = req.user.id;
        const { id } = req.params;

        const {
            customerId, projectId, invoiceNumber, issueDate, dueDate,
            status, subtotal, tax, currency, notes, metadata,
        } = req.body;

        const result = await updateInvoiceUseCase.execute({
            invoiceId: parseInt(id, 10),
            businessId,
            userId,
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

// =============================================
// POST /api/invoices/:id/payments
// =============================================
router.post('/:id/payments', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;
        const { id } = req.params;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { amount, paymentDate, notes, paymentMethod } = req.body;

        const result = await recordInvoicePaymentUseCase.execute({
            invoiceId: parseInt(id, 10),
            businessId,
            userId,
            amount,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            notes: notes || '',
            paymentMethod: paymentMethod || 'CASH',
        });

        res.status(201).json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            /already|exceeds|cannot|DRAFT|CANCELLED/i.test(error.message) ? 400 :
            500;
        console.error('❌ [POST /api/invoices/:id/payments]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;