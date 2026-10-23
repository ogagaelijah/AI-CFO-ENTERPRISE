// src/interfaces/http/routes/feeRoutes.js
// v1.4.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER. Payments add CASHIER.
//               Error classification applied.
// v1.3.0-prod — GET / pagination standardized.

'use strict';

const express = require('express');
const router = express.Router();

const FeeRepository = require('../../../infrastructure/database/sqlite/repositories/FeeRepository');
const StudentRepository = require('../../../infrastructure/database/sqlite/repositories/StudentRepository');
const TermRepository = require('../../../infrastructure/database/sqlite/repositories/TermRepository');
const ClassRepository = require('../../../infrastructure/database/sqlite/repositories/ClassRepository');
const EnrollmentRepository = require('../../../infrastructure/database/sqlite/repositories/EnrollmentRepository');
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const TransactionRepository = require('../../../infrastructure/database/sqlite/repositories/TransactionRepository');

const GenerateFeeUseCase = require('../../../application/useCases/fees/GenerateFeeUseCase');
const GenerateFeesForClassUseCase = require('../../../application/useCases/fees/GenerateFeesForClassUseCase');
const GetFeeUseCase = require('../../../application/useCases/fees/GetFeeUseCase');
const GetFeesUseCase = require('../../../application/useCases/fees/GetFeesUseCase');
const UpdateFeeUseCase = require('../../../application/useCases/fees/UpdateFeeUseCase');
const DeleteFeeUseCase = require('../../../application/useCases/fees/DeleteFeeUseCase');
const RecordFeePaymentUseCase = require('../../../application/useCases/fees/RecordFeePaymentUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const feeRepo = new FeeRepository();
const studentRepo = new StudentRepository();
const termRepo = new TermRepository();
const classRepo = new ClassRepository();
const enrollmentRepo = new EnrollmentRepository();
const debtorRepo = new DebtorRepository();
const paymentRepo = new PaymentRepository();
const transactionRepo = new TransactionRepository();

const generateFee = new GenerateFeeUseCase({
    feeRepository: feeRepo,
    studentRepository: studentRepo,
    termRepository: termRepo,
    classRepository: classRepo,
    debtorRepository: debtorRepo,
});
const generateBulk = new GenerateFeesForClassUseCase({
    feeRepository: feeRepo,
    studentRepository: studentRepo,
    termRepository: termRepo,
    classRepository: classRepo,
    enrollmentRepository: enrollmentRepo,
    debtorRepository: debtorRepo,
});
const getFee = new GetFeeUseCase({ feeRepository: feeRepo });
const getFees = new GetFeesUseCase({ feeRepository: feeRepo });
const updateFee = new UpdateFeeUseCase({
    feeRepository: feeRepo,
    studentRepository: studentRepo,
    debtorRepository: debtorRepo,
});
const deleteFee = new DeleteFeeUseCase({
    feeRepository: feeRepo,
    debtorRepository: debtorRepo,
});
const recordPayment = new RecordFeePaymentUseCase({
    feeRepository: feeRepo,
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
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long|DRAFT|CANCELLED|PAID|payments/i.test(msg)) return 400;
  return 500;
}

// GET /api/fees
router.get('/', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { status, studentId, termId, classId, search } = req.query;
        const { page, limit, offset } = parsePagination(req.query);

        const result = await getFees.execute({
            businessId,
            status: status || null,
            studentId: studentId || null,
            termId: termId || null,
            classId: classId || null,
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
        console.error('❌ [GET /api/fees]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch fees' });
    }
});

// GET /api/fees/:id
router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getFee.execute({
            feeId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/fees/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// POST /api/fees — OWNER / ADMIN / MANAGER
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            studentId, termId, classId,
            amount, description, issueDate, dueDate, status, notes, metadata,
        } = req.body;

        const result = await generateFee.execute({
            businessId, userId,
            studentId, termId,
            classId: classId || null,
            amount: amount !== undefined && amount !== null ? Number(amount) : null,
            description,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'DRAFT',
            notes, metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/fees]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// POST /api/fees/bulk — OWNER / ADMIN / MANAGER
router.post('/bulk', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { classId, termId, issueDate, dueDate, status } = req.body;

        const result = await generateBulk.execute({
            businessId, userId, classId, termId,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'DRAFT',
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/fees/bulk]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// PUT /api/fees/:id — OWNER / ADMIN / MANAGER
router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;
        const { id } = req.params;

        const {
            description, amount, issueDate, dueDate, status, notes, metadata,
        } = req.body;

        const result = await updateFee.execute({
            feeId: parseInt(id, 10),
            businessId, userId,
            description, amount,
            issueDate: issueDate !== undefined ? (issueDate ? new Date(issueDate) : null) : undefined,
            dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
            status, notes, metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [PUT /api/fees/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// DELETE /api/fees/:id — OWNER / ADMIN / MANAGER
router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteFee.execute({
            feeId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [DELETE /api/fees/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// POST /api/fees/:id/payments — OWNER / ADMIN / MANAGER / CASHIER
router.post('/:id/payments', requireRole(...PAYMENT_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;
        const { id } = req.params;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { amount, paymentDate, paymentMethod, notes } = req.body;

        const result = await recordPayment.execute({
            feeId: parseInt(id, 10),
            businessId, userId, amount,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentMethod: paymentMethod || 'CASH',
            notes: notes || '',
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/fees/:id/payments]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;