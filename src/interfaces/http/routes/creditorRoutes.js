// src/interfaces/http/routes/creditorRoutes.js

const express = require('express');
const router = express.Router();
const CreditorRepository = require('../../../infrastructure/database/sqlite/repositories/CreditorRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const TransactionRepository = require('../../../infrastructure/database/sqlite/repositories/TransactionRepository');
const RecordCreditorPaymentUseCase = require('../../../application/useCases/creditors/RecordCreditorPaymentUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const creditorRepo = new CreditorRepository();
const paymentRepo = new PaymentRepository();
const transactionRepo = new TransactionRepository();

const recordCreditorPaymentUseCase = new RecordCreditorPaymentUseCase({
    creditorRepository: creditorRepo,
    paymentRepository: paymentRepo,
    transactionRepository: transactionRepo,
});

router.use(authMiddleware);

// =============================================
// GET /api/creditors
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { status, limit = 50, offset = 0 } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        let creditors;
        if (status) {
            creditors = await creditorRepo.findByFilters({
                businessId,
                status,
                limit: parseInt(limit),
                offset: parseInt(offset),
            });
        } else {
            creditors = await creditorRepo.findByBusinessId(businessId);
        }

        const summary = await creditorRepo.getSummary(businessId);
        const totalOutstanding = await creditorRepo.getTotalOutstanding(businessId);

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
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const creditors = await creditorRepo.findActive(businessId);
        const totalOutstanding = await creditorRepo.getTotalOutstanding(businessId);

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
// GET /api/creditors/summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const summary = await creditorRepo.getSummary(businessId);
        const totalOutstanding = await creditorRepo.getTotalOutstanding(businessId);

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

// =============================================
// GET /api/creditors/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const creditorId = parseInt(id);

        if (isNaN(creditorId)) {
            return res.status(400).json({ success: false, message: 'Invalid creditor ID' });
        }

        const creditor = await creditorRepo.findById(creditorId);
        if (!creditor) {
            return res.status(404).json({ success: false, message: 'Creditor not found' });
        }

        // Ownership check
        if (creditor.business_id !== businessId && creditor.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: creditor });
    } catch (error) {
        console.error('❌ Error fetching creditor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch creditor' });
    }
});

// =============================================
// POST /api/creditors
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { supplierName, totalOwed, dueDate, notes = '' } = req.body;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }
        if (!supplierName) {
            return res.status(400).json({ success: false, message: 'Supplier name is required' });
        }
        if (!totalOwed || totalOwed <= 0) {
            return res.status(400).json({ success: false, message: 'Amount owed must be greater than 0' });
        }

        const creditor = await creditorRepo.create({
            userId,
            businessId,
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
// POST /api/creditors/:id/payment
// =============================================
router.post('/:id/payment', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { amount, notes = '', paymentMethod = 'CASH' } = req.body;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const creditorId = parseInt(id);
        if (isNaN(creditorId)) {
            return res.status(400).json({ success: false, message: 'Invalid creditor ID' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
        }

        const result = await recordCreditorPaymentUseCase.execute({
            userId,
            businessId,
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
        const businessId = req.user.businessId;
        const creditorId = parseInt(id);

        if (isNaN(creditorId)) {
            return res.status(400).json({ success: false, message: 'Invalid creditor ID' });
        }

        const existing = await creditorRepo.findById(creditorId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Creditor not found' });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await creditorRepo.delete(creditorId);
        res.json({ success: true, message: 'Creditor deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting creditor:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete creditor' });
    }
});

module.exports = router;