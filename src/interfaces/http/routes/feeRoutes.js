// src/interfaces/http/routes/feeRoutes.js
// v1.1.0-prod — Wires debtorRepository into generate + update so SENT
//               fees create linked debtor rows. Passes userId for
//               debtor ownership attribution.

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
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

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
    debtorRepository: debtorRepo,                 // ← ADDED
});
const generateBulk = new GenerateFeesForClassUseCase({
    feeRepository: feeRepo,
    studentRepository: studentRepo,
    termRepository: termRepo,
    classRepository: classRepo,
    enrollmentRepository: enrollmentRepo,
});
const getFee = new GetFeeUseCase({ feeRepository: feeRepo });
const getFees = new GetFeesUseCase({ feeRepository: feeRepo });
const updateFee = new UpdateFeeUseCase({
    feeRepository: feeRepo,
    studentRepository: studentRepo,               // ← ADDED
    debtorRepository: debtorRepo,                 // ← ADDED
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

// GET /api/fees
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { limit = 50, offset = 0, status, studentId, termId, classId, search } = req.query;

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

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/fees]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch fees' });
    }
});

// GET /api/fees/:id
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getFee.execute({
            feeId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            500;
        console.error('❌ [GET /api/fees/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/fees
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;             // ← ADDED
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            studentId, termId, classId,
            amount, description, issueDate, dueDate, status, notes, metadata,
        } = req.body;

        const result = await generateFee.execute({
            businessId,
            userId,                             // ← ADDED
            studentId,
            termId,
            classId: classId || null,
            amount: amount !== undefined && amount !== null ? Number(amount) : null,
            description,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'DRAFT',
            notes,
            metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        const status =
            /already exists/i.test(error.message) ? 409 :
            /not found/i.test(error.message) ? 404 :
            400;
        console.error('❌ [POST /api/fees]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/fees/bulk
router.post('/bulk', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { classId, termId, issueDate, dueDate, status } = req.body;

        const result = await generateBulk.execute({
            businessId,
            classId,
            termId,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'DRAFT',
        });

        res.status(201).json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            400;
        console.error('❌ [POST /api/fees/bulk]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// PUT /api/fees/:id
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;             // ← ADDED
        const { id } = req.params;

        const {
            description, amount, issueDate, dueDate, status, notes, metadata,
        } = req.body;

        const result = await updateFee.execute({
            feeId: parseInt(id, 10),
            businessId,
            userId,                             // ← ADDED
            description,
            amount,
            issueDate: issueDate !== undefined ? (issueDate ? new Date(issueDate) : null) : undefined,
            dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
            status,
            notes,
            metadata,
        });

        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            400;
        console.error('❌ [PUT /api/fees/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// DELETE /api/fees/:id
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteFee.execute({
            feeId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /payments/i.test(error.message) ? 409 :
            400;
        console.error('❌ [DELETE /api/fees/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/fees/:id/payments
router.post('/:id/payments', invalidateAfterWrite, async (req, res) => {
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
            businessId,
            userId,
            amount,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentMethod: paymentMethod || 'CASH',
            notes: notes || '',
        });

        res.status(201).json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            /DRAFT|CANCELLED|PAID|exceeds/i.test(error.message) ? 400 :
            500;
        console.error('❌ [POST /api/fees/:id/payments]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;