// src/interfaces/http/routes/debtorRoutes.js
// v1.3.1-prod — Error classification: user errors return 400/404/409, not 500.
// v1.3.0-prod — Write routes require OWNER/ADMIN/MANAGER. Payment adds CASHIER.
// v1.2.0-prod — Accepts ?search= query param.
// v1.1.0-prod — Pagination on GET /.

const express = require('express');
const router = express.Router();
const DebtorRepository = require('../../../infrastructure/database/sqlite/repositories/DebtorRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const TransactionRepository = require('../../../infrastructure/database/sqlite/repositories/TransactionRepository');
const RecordDebtorPaymentUseCase = require('../../../application/useCases/debtors/RecordDebtorPaymentUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const debtorRepo = new DebtorRepository();
const paymentRepo = new PaymentRepository();
const transactionRepo = new TransactionRepository();

const recordDebtorPaymentUseCase = new RecordDebtorPaymentUseCase({
    debtorRepository: debtorRepo,
    paymentRepository: paymentRepo,
    transactionRepository: transactionRepo,
});

router.use(authMiddleware);

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];
const PAYMENT_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

// =============================================
// GET /api/debtors?page=1&limit=50&search=YGY
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { status, customerType, search } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const { page, limit, offset } = parsePagination(req.query);
        const searchTerm = (search || '').trim() || null;

        const [debtors, total, summary, totalOutstanding, overdue] = await Promise.all([
            debtorRepo.findByFilters({
                businessId, userId, status, customerType,
                search: searchTerm, limit, offset,
            }),
            debtorRepo.countByBusinessId(businessId, { status, customerType, search: searchTerm }),
            debtorRepo.getSummary(businessId),
            debtorRepo.getTotalOutstanding(businessId),
            debtorRepo.findOverdue(businessId),
        ]);

        res.json({
            success: true,
            data: {
                debtors: debtors || [],
                summary: {
                    ...summary,
                    totalOutstanding,
                    overdueCount: overdue.length,
                },
                pagination: buildPaginationMeta({ page, limit, total }),
            },
        });
    } catch (error) {
        console.error('❌ Error fetching debtors:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch debtors' });
    }
});

// =============================================
// GET /api/debtors/active
// =============================================
router.get('/active', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }
        const debtors = await debtorRepo.findActive(businessId);
        const totalOutstanding = await debtorRepo.getTotalOutstanding(businessId);

        res.json({
            success: true,
            data: { debtors: debtors || [], totalOutstanding, count: debtors.length }
        });
    } catch (error) {
        console.error('❌ Error fetching active debtors:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch active debtors' });
    }
});

// =============================================
// GET /api/debtors/overdue
// =============================================
router.get('/overdue', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }
        const debtors = await debtorRepo.findOverdue(businessId);
        const totalOverdue = debtors.reduce((sum, d) => sum + (d.balance_remaining || 0), 0);

        res.json({
            success: true,
            data: { debtors: debtors || [], totalOverdue, count: debtors.length }
        });
    } catch (error) {
        console.error('❌ Error fetching overdue debtors:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch overdue debtors' });
    }
});

// =============================================
// GET /api/debtors/summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }
        const summary = await debtorRepo.getSummary(businessId);
        const totalOutstanding = await debtorRepo.getTotalOutstanding(businessId);
        const overdue = await debtorRepo.findOverdue(businessId);

        res.json({
            success: true,
            data: { ...summary, totalOutstanding, overdueCount: overdue.length }
        });
    } catch (error) {
        console.error('❌ Error fetching debtor summary:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch debtor summary' });
    }
});

// =============================================
// GET /api/debtors/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const debtorId = parseInt(id);

        if (isNaN(debtorId)) {
            return res.status(400).json({ success: false, message: 'Invalid debtor ID' });
        }

        const debtor = await debtorRepo.findById(debtorId);
        if (!debtor) {
            return res.status(404).json({ success: false, message: 'Debtor not found' });
        }
        if (debtor.business_id !== businessId && debtor.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: debtor });
    } catch (error) {
        console.error('❌ Error fetching debtor:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch debtor' });
    }
});

// =============================================
// POST /api/debtors — OWNER / ADMIN / MANAGER
// =============================================
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const { customerName, totalOwed, dueDate, customerType = 'CUSTOMER', notes = '' } = req.body;

        if (!customerName) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }
        if (!totalOwed || totalOwed <= 0) {
            return res.status(400).json({ success: false, message: 'Amount owed must be greater than 0' });
        }

        const debtor = await debtorRepo.create({
            user_id: userId,
            business_id: businessId,
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
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to create debtor' });
    }
});

// =============================================
// POST /api/debtors/:id/payment — OWNER / ADMIN / MANAGER / CASHIER
// =============================================
router.post('/:id/payment', requireRole(...PAYMENT_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { amount, notes = '', paymentMethod = 'CASH' } = req.body;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const debtorId = parseInt(id);
        if (isNaN(debtorId)) {
            return res.status(400).json({ success: false, message: 'Invalid debtor ID' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
        }

        const result = await recordDebtorPaymentUseCase.execute({
            userId, businessId, debtorId, amount,
            paymentDate: new Date(), notes, paymentMethod,
        });

        res.json({
            success: true,
            message: result.message,
            data: {
                debtor: result.debtor,
                payment: result.payment,
                remainingBalance: result.remainingBalance,
            }
        });
    } catch (error) {
        console.error('❌ Error recording debtor payment:', error);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to record payment' });
    }
});

// =============================================
// DELETE /api/debtors/:id — OWNER / ADMIN / MANAGER
// =============================================
router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const debtorId = parseInt(id);

        if (isNaN(debtorId)) {
            return res.status(400).json({ success: false, message: 'Invalid debtor ID' });
        }

        const existing = await debtorRepo.findById(debtorId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Debtor not found' });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
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
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to delete debtor' });
    }
});

module.exports = router;