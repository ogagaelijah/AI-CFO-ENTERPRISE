// src/interfaces/http/routes/invoiceRoutes.js
// v1.2.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER. Payments add CASHIER.
//               Error classification applied.
// v1.1.0-prod — GET / pagination standardized.

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
const { requireRole } = require('../middleware/requireRole');
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

const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];
const PAYMENT_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long|DRAFT|CANCELLED/i.test(msg)) return 400;
  return 500;
}

// =============================================
// GET /api/invoices?page=1&limit=50
// =============================================
router.get('/', requireRole(...READ_ROLES), async (req, res) => {
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

        const total = result?.pagination?.total || 0;

        res.json({
            ...result,
            pagination: buildPaginationMeta({ page, limit, total }),
        });
    } catch (error) {
        console.error('❌ [GET /api/invoices]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch invoices' });
    }
});

// =============================================
// GET /api/invoices/:id
// =============================================
router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await getInvoiceUseCase.execute({
            invoiceId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/invoices/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// =============================================
// POST /api/invoices — OWNER / ADMIN / MANAGER
// =============================================
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
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
            businessId, userId,
            customerId: customerId || null,
            projectId: projectId || null,
            invoiceNumber: invoiceNumber || null,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'DRAFT',
            subtotal, tax, currency, notes, metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/invoices]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// =============================================
// PUT /api/invoices/:id — OWNER / ADMIN / MANAGER
// =============================================
router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
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
            businessId, userId,
            customerId, projectId, invoiceNumber,
            issueDate: issueDate !== undefined ? (issueDate ? new Date(issueDate) : null) : undefined,
            dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
            status, subtotal, tax, currency, notes, metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [PUT /api/invoices/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// =============================================
// DELETE /api/invoices/:id — OWNER / ADMIN / MANAGER
// =============================================
router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteInvoiceUseCase.execute({
            invoiceId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [DELETE /api/invoices/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// =============================================
// POST /api/invoices/:id/payments — OWNER / ADMIN / MANAGER / CASHIER
// =============================================
router.post('/:id/payments', requireRole(...PAYMENT_ROLES), invalidateAfterWrite, async (req, res) => {
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
            businessId, userId, amount,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            notes: notes || '',
            paymentMethod: paymentMethod || 'CASH',
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/invoices/:id/payments]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;