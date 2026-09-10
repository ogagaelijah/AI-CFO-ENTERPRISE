// src/interfaces/http/routes/creditorRoutes.js

const express = require('express');
const router = express.Router();
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const TransactionRepository = require('../../../infrastructure/database/sqlite/repositories/TransactionRepository');
const RecordCreditorPaymentUseCase = require('../../../application/useCases/creditors/RecordCreditorPaymentUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

// Initialize repositories
const creditorRepo = new CreditorRepository();
const paymentRepo = new PaymentRepository();
const transactionRepo = new TransactionRepository();

// Initialize Use Case
const recordCreditorPaymentUseCase = new RecordCreditorPaymentUseCase({
    creditorRepository: creditorRepo,
    paymentRepository: paymentRepo,
    transactionRepository: transactionRepo,
});

// All routes require authentication
router.use(authMiddleware);

// =============================================
// GET /api/creditors
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 50, offset = 0 } = req.query;

        let creditors;
        if (status) {
            creditors = await creditorRepo.findByFilters({
                businessId: userId,
                status,
                limit: parseInt(limit),
                offset: parseInt(offset),
            });
        } else {
            creditors = await creditorRepo.findByUserId(userId);
        }

        const summary = await creditorRepo.getSummary(userId);
        const totalOutstanding = await creditorRepo.getTotalOutstanding(userId);

        res.json({
            success: true,
            data: {
                creditors: creditors || [],
                summary: summary || {
                    total_creditors: 0,
                    total_owed: 0,
                    total_paid: 0,
                    total_outstanding: 0,
                    active_count: 0,
                    paid_count: 0,
                    overdue_count: 0,
                },
                totalOutstanding: totalOutstanding || 0,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: summary?.total_creditors || 0,
                }
            }
        });
    } catch (error) {
        console.error('❌ Error fetching creditors:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch creditors' });
    }
});

// =============================================
// GET /api/creditors/active
// =============================================
router.get('/active', async (req, res) => {
    try {
        const userId = req.user.id;
        const creditors = await creditorRepo.findActive(userId);
        const totalOutstanding = await creditorRepo.getTotalOutstanding(userId);

        res.json({
            success: true,
            data: {
                creditors: creditors || [],
                totalOutstanding,
                count: creditors.length
            }
        });
    } catch (error) {
        console.error('❌ Error fetching active creditors:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch active creditors' });
    }
});

// =============================================
// GET /api/creditors/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const creditorId = parseInt(id);

        if (isNaN(creditorId)) {
            return res.status(400).json({ success: false, message: 'Invalid creditor ID' });
        }

        const creditor = await creditorRepo.findById(creditorId);
        if (!creditor) {
            return res.status(404).json({ success: false, message: 'Creditor not found' });
        }
        if (creditor.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: creditor });
    } catch (error) {
        console.error('❌ Error fetching creditor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch creditor' });
    }
});

// =============================================
// POST /api/creditors - Create creditor
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const { supplierName, totalOwed, dueDate, notes = '' } = req.body;

        if (!supplierName) {
            return res.status(400).json({ success: false, message: 'Supplier name is required' });
        }
        if (!totalOwed || totalOwed <= 0) {
            return res.status(400).json({ success: false, message: 'Amount owed must be greater than 0' });
        }

        const creditor = await creditorRepo.create({
            user_id: userId,
            supplier_name: supplierName,
            total_owed: totalOwed,
            balance_remaining: totalOwed,
            status: 'ACTIVE',
            due_date: dueDate || null,
            notes: notes || null,
        });

        res.status(201).json({
            success: true,
            message: 'Creditor created successfully',
            data: creditor
        });
    } catch (error) {
        console.error('❌ Error creating creditor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create creditor' });
    }
});

// =============================================
// POST /api/creditors/:id/payment - Record payment (NOW USES USE CASE)
// =============================================
router.post('/:id/payment', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { amount, notes = '', paymentMethod = 'CASH' } = req.body;

        const creditorId = parseInt(id);
        if (isNaN(creditorId)) {
            return res.status(400).json({ success: false, message: 'Invalid creditor ID' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
        }

        const result = await recordCreditorPaymentUseCase.execute({
            userId,
            businessId: userId,          // currently userId === businessId in your system
            creditorId,
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
                    creditor: result.creditor,
                    payment: result.payment,
                    remainingBalance: result.remainingBalance,
                }
            });
        } else {
            res.status(400).json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('❌ Error recording creditor payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record payment'
        });
    }
});

// =============================================
// DELETE /api/creditors/:id
// =============================================
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const creditorId = parseInt(id);

        if (isNaN(creditorId)) {
            return res.status(400).json({ success: false, message: 'Invalid creditor ID' });
        }

        const existing = await creditorRepo.findById(creditorId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Creditor not found' });
        }
        if (existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await creditorRepo.delete(creditorId);
        res.json({ success: true, message: 'Creditor deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting creditor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete creditor' });
    }
});

// =============================================
// GET /api/creditors/summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const summary = await creditorRepo.getSummary(userId);
        const totalOutstanding = await creditorRepo.getTotalOutstanding(userId);

        res.json({
            success: true,
            data: {
                ...summary,
                totalOutstanding,
            }
        });
    } catch (error) {
        console.error('❌ Error fetching creditor summary:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch creditor summary' });
    }
});

module.exports = router;