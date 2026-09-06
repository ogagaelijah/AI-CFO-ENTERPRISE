// src/interfaces/http/routes/debtorRoutes.js

const express = require('express');
const router = express.Router();
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const TransactionRepository = require('../../../infrastructure/database/sqlite/repositories/TransactionRepository');
const GetDebtorsUseCase = require('../../../application/useCases/debtors/GetDebtorsUseCase');
const RecordDebtorPaymentUseCase = require('../../../application/useCases/debtors/RecordDebtorPaymentUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');

// Initialize repositories
const debtorRepo = new DebtorRepository();
const paymentRepo = new PaymentRepository();
const transactionRepo = new TransactionRepository();

// Initialize Use Cases
const getDebtorsUseCase = new GetDebtorsUseCase({ debtorRepository: debtorRepo });
const recordDebtorPaymentUseCase = new RecordDebtorPaymentUseCase({
    debtorRepository: debtorRepo,
    paymentRepository: paymentRepo,
    transactionRepository: transactionRepo,
});

// All routes require authentication
router.use(authMiddleware);

// =============================================
// GET /api/debtors - Get all debtors
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, customerType, limit = 50, offset = 0 } = req.query;

        const debtors = await debtorRepo.findByFilters({
            businessId: userId,
            status,
            customerType,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        const summary = await debtorRepo.getSummary(userId);
        const totalOutstanding = await debtorRepo.getTotalOutstanding(userId);
        const overdue = await debtorRepo.findOverdue(userId);

        res.json({
            success: true,
            data: {
                debtors: debtors || [],
                summary: {
                    ...summary,
                    totalOutstanding,
                    overdueCount: overdue.length,
                },
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: summary?.total_debtors || 0,
                }
            }
        });
    } catch (error) {
        console.error('❌ Error fetching debtors:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch debtors'
        });
    }
});

// =============================================
// GET /api/debtors/active
// =============================================
router.get('/active', async (req, res) => {
    try {
        const userId = req.user.id;
        const debtors = await debtorRepo.findActive(userId);
        const totalOutstanding = await debtorRepo.getTotalOutstanding(userId);

        res.json({
            success: true,
            data: {
                debtors: debtors || [],
                totalOutstanding,
                count: debtors.length
            }
        });
    } catch (error) {
        console.error('❌ Error fetching active debtors:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch active debtors'
        });
    }
});

// =============================================
// GET /api/debtors/overdue
// =============================================
router.get('/overdue', async (req, res) => {
    try {
        const userId = req.user.id;
        const debtors = await debtorRepo.findOverdue(userId);
        const totalOverdue = debtors.reduce((sum, d) => sum + (d.balance_remaining || 0), 0);

        res.json({
            success: true,
            data: {
                debtors: debtors || [],
                totalOverdue,
                count: debtors.length
            }
        });
    } catch (error) {
        console.error('❌ Error fetching overdue debtors:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch overdue debtors'
        });
    }
});

// =============================================
// GET /api/debtors/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const debtorId = parseInt(id);

        if (isNaN(debtorId)) {
            return res.status(400).json({ success: false, message: 'Invalid debtor ID' });
        }

        const debtor = await debtorRepo.findById(debtorId);
        if (!debtor) {
            return res.status(404).json({ success: false, message: 'Debtor not found' });
        }

        if (debtor.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: debtor });
    } catch (error) {
        console.error('❌ Error fetching debtor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch debtor' });
    }
});

// =============================================
// POST /api/debtors - Create debtor
// =============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { customerName, totalOwed, dueDate, customerType = 'CUSTOMER', notes = '' } = req.body;

        if (!customerName) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }
        if (!totalOwed || totalOwed <= 0) {
            return res.status(400).json({ success: false, message: 'Amount owed must be greater than 0' });
        }

        const debtor = await debtorRepo.create({
            user_id: userId,
            customer_name: customerName,
            total_owed: totalOwed,
            balance_remaining: totalOwed,
            status: 'ACTIVE',
            due_date: dueDate || null,
            customer_type: customerType,
            notes: notes || null,
        });

        res.status(201).json({
            success: true,
            message: 'Debtor created successfully',
            data: debtor
        });
    } catch (error) {
        console.error('❌ Error creating debtor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create debtor' });
    }
});

// =============================================
// POST /api/debtors/:id/payment - Record payment (NOW USES USE CASE)
// =============================================
router.post('/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { amount, notes = '', paymentMethod = 'CASH' } = req.body;

        const debtorId = parseInt(id);
        if (isNaN(debtorId)) {
            return res.status(400).json({ success: false, message: 'Invalid debtor ID' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
        }

        const result = await recordDebtorPaymentUseCase.execute({
            userId,
            businessId: userId,          // currently userId === businessId in your system
            debtorId,
            amount,
            paymentDate: new Date(),
            notes,
            paymentMethod,
        });

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    debtor: result.debtor,
                    payment: result.payment,
                    remainingBalance: result.remainingBalance,
                }
            });
        } else {
            res.status(400).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('❌ Error recording debtor payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record payment'
        });
    }
});

// =============================================
// DELETE /api/debtors/:id
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const debtorId = parseInt(id);

        if (isNaN(debtorId)) {
            return res.status(400).json({ success: false, message: 'Invalid debtor ID' });
        }

        const existing = await debtorRepo.findById(debtorId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Debtor not found' });
        }
        if (existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (existing.balance_remaining > 0 && existing.status !== 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete debtor with outstanding balance. Please record payment first.'
            });
        }

        await debtorRepo.delete(debtorId);
        res.json({ success: true, message: 'Debtor deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting debtor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete debtor' });
    }
});

// =============================================
// GET /api/debtors/summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const summary = await debtorRepo.getSummary(userId);
        const totalOutstanding = await debtorRepo.getTotalOutstanding(userId);
        const overdue = await debtorRepo.findOverdue(userId);

        res.json({
            success: true,
            data: {
                ...summary,
                totalOutstanding,
                overdueCount: overdue.length,
            }
        });
    } catch (error) {
        console.error('❌ Error fetching debtor summary:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch debtor summary' });
    }
});

module.exports = router;