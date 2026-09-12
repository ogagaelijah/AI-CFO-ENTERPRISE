// src/interfaces/http/routes/incomeRoutes.js

const express = require('express');
const router = express.Router();
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');
const RecordIncomeUseCase = require('../../../application/useCases/income/RecordIncomeUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const incomeRepo = new IncomeRepository();
const paymentRepo = new PaymentRepository();
const recordIncomeUseCase = new RecordIncomeUseCase(incomeRepo, paymentRepo);

router.use(authMiddleware);

// =============================================
// GET /api/income
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { startDate, endDate, source, limit, offset } = req.query;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        let incomes;
        if (startDate && endDate) {
            incomes = await incomeRepo.findByDateRange(businessId, startDate, endDate);
        } else if (source) {
            incomes = await incomeRepo.findBySource(businessId, source);
        } else {
            incomes = await incomeRepo.findByFilters({
                businessId,
                source,
                startDate,
                endDate,
                limit: parseInt(limit) || 50,
                offset: parseInt(offset) || 0,
            });
        }

        const summary = await incomeRepo.getIncomeSummary(businessId);

        res.json({
            success: true,
            data: {
                incomes: incomes || [],
                summary: summary || {
                    total_entries: 0,
                    total_amount: 0,
                    average_amount: 0,
                    sources_used: 0,
                }
            }
        });
    } catch (error) {
        console.error('❌ Error fetching income:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch income'
        });
    }
});

// =============================================
// GET /api/income/today
// =============================================
router.get('/today', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const incomes = await incomeRepo.getTodayIncome(businessId);

        res.json({
            success: true,
            data: {
                incomes: incomes || [],
                count: incomes.length,
                total: incomes.reduce((sum, i) => sum + i.amount, 0)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching today income:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch today income'
        });
    }
});

// =============================================
// GET /api/income/summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }

        const { year, month } = req.query;

        let summary;
        if (year && month) {
            summary = await incomeRepo.getMonthlySummary(businessId, parseInt(year), parseInt(month));
        } else {
            summary = await incomeRepo.getIncomeSummary(businessId);
        }

        res.json({
            success: true,
            data: summary || {
                total_entries: 0,
                total_amount: 0,
                average_amount: 0,
                sources_used: 0,
            }
        });
    } catch (error) {
        console.error('❌ Error fetching income summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch income summary'
        });
    }
});

// =============================================
// POST /api/income
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { source, amount, description, date } = req.body;

        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business context required' });
        }
        if (!source) {
            return res.status(400).json({ success: false, message: 'Source is required' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        }

        const result = await recordIncomeUseCase.execute({
            userId,
            businessId,
            source,
            amount,
            description: description || '',
            date: date || new Date(),
        });

        res.status(201).json({
            success: true,
            message: 'Income recorded successfully',
            data: result
        });
    } catch (error) {
        console.error('❌ Error recording income:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record income'
        });
    }
});

// =============================================
// GET /api/income/:id
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;

        const income = await incomeRepo.findById(parseInt(id));
        if (!income) {
            return res.status(404).json({ success: false, message: 'Income record not found' });
        }
        if (income.business_id !== businessId && income.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: income });
    } catch (error) {
        console.error('❌ Error fetching income:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch income' });
    }
});

// =============================================
// PUT /api/income/:id
// =============================================
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;
        const { source, amount, description, date } = req.body;

        const existing = await incomeRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Income record not found' });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const updateData = {};
        if (source !== undefined) updateData.source = source;
        if (amount !== undefined) updateData.amount = amount;
        if (description !== undefined) updateData.description = description;
        if (date !== undefined) updateData.date = date;

        const updated = await incomeRepo.update(parseInt(id), updateData);

        res.json({ success: true, message: 'Income updated successfully', data: updated });
    } catch (error) {
        console.error('❌ Error updating income:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update income' });
    }
});

// =============================================
// DELETE /api/income/:id
// =============================================
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const businessId = req.user.businessId;

        const existing = await incomeRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Income record not found' });
        }
        if (existing.business_id !== businessId && existing.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await incomeRepo.delete(parseInt(id));

        res.json({ success: true, message: 'Income record deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting income:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete income' });
    }
});

module.exports = router;