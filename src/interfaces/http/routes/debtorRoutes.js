// src/interfaces/http/routes/debtorRoutes.js
const express = require('express');
const router = express.Router();
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const GetDebtorsUseCase = require('../../../application/useCases/debtors/GetDebtorsUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');

// Initialize repository
const debtorRepo = new DebtorRepository();

// Initialize Use Case
const getDebtorsUseCase = new GetDebtorsUseCase({ debtorRepository: debtorRepo });

// All routes require authentication
router.use(authMiddleware);

// =============================================
// GET /api/debtors - Get all debtors
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, customerType, limit = 50, offset = 0 } = req.query;

        // Get debtors with filters
        const debtors = await debtorRepo.findByFilters({
            businessId: userId,
            status,
            customerType,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        // Get summary
        const summary = await debtorRepo.getSummary(userId);

        // Get total outstanding
        const totalOutstanding = await debtorRepo.getTotalOutstanding(userId);

        // Get overdue count
        const overdue = await debtorRepo.findOverdue(userId);
        const overdueCount = overdue.length;

        res.json({
            success: true,
            data: {
                debtors: debtors || [],
                summary: {
                    ...summary,
                    totalOutstanding,
                    overdueCount,
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
// GET /api/debtors/active - Get active debtors
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
// GET /api/debtors/overdue - Get overdue debtors
// =============================================
router.get('/overdue', async (req, res) => {
    try {
        const userId = req.user.id;

        const debtors = await debtorRepo.findOverdue(userId);
        const totalOverdue = debtors.reduce((sum, d) => sum + d.balance_remaining, 0);

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
// GET /api/debtors/:id - Get single debtor
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const debtorId = parseInt(id);
        if (isNaN(debtorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid debtor ID'
            });
        }

        const debtor = await debtorRepo.findById(debtorId);

        if (!debtor) {
            return res.status(404).json({
                success: false,
                message: 'Debtor not found'
            });
        }

        if (debtor.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: debtor
        });

    } catch (error) {
        console.error('❌ Error fetching debtor:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch debtor'
        });
    }
});

// =============================================
// POST /api/debtors - Create a new debtor
// =============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { customerName, totalOwed, dueDate, customerType = 'CUSTOMER', notes = '' } = req.body;

        if (!customerName) {
            return res.status(400).json({
                success: false,
                message: 'Customer name is required'
            });
        }

        if (!totalOwed || totalOwed <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount owed must be greater than 0'
            });
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
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create debtor'
        });
    }
});

// =============================================
// POST /api/debtors/:id/payment - Record payment
// =============================================
router.post('/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { amount, notes = '' } = req.body;

        const debtorId = parseInt(id);
        if (isNaN(debtorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid debtor ID'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than 0'
            });
        }

        // Verify debtor exists and belongs to user
        const existing = await debtorRepo.findById(debtorId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Debtor not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (amount > existing.balance_remaining) {
            return res.status(400).json({
                success: false,
                message: `Payment amount (₦${amount.toLocaleString()}) exceeds balance (₦${existing.balance_remaining.toLocaleString()})`
            });
        }

        const updated = await debtorRepo.recordPayment(debtorId, amount);

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: updated
        });

    } catch (error) {
        console.error('❌ Error recording payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record payment'
        });
    }
});

// =============================================
// DELETE /api/debtors/:id - Delete a debtor
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const debtorId = parseInt(id);
        if (isNaN(debtorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid debtor ID'
            });
        }

        // Verify debtor exists and belongs to user
        const existing = await debtorRepo.findById(debtorId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Debtor not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Only allow deletion if debtor is fully paid
        if (existing.balance_remaining > 0 && existing.status !== 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete debtor with outstanding balance. Please record payment first.'
            });
        }

        await debtorRepo.delete(debtorId);

        res.json({
            success: true,
            message: 'Debtor deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting debtor:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete debtor'
        });
    }
});

// =============================================
// GET /api/debtors/summary - Get debtor summary
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
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch debtor summary'
        });
    }
});

module.exports = router;