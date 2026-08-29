// src/interfaces/http/routes/incomeRoutes.js

const express = require('express');
const router = express.Router();
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const RecordIncomeUseCase = require('../../../application/useCases/income/RecordIncomeUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');

const incomeRepo = new IncomeRepository();
const recordIncomeUseCase = new RecordIncomeUseCase(incomeRepo);

router.use(authMiddleware);

// =============================================
// GET /api/income - Get all income records
// =============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, source, limit, offset } = req.query;

        let incomes;
        if (startDate && endDate) {
            incomes = await incomeRepo.findByDateRange(userId, startDate, endDate);
        } else if (source) {
            incomes = await incomeRepo.findBySource(userId, source);
        } else if (limit || offset) {
            incomes = await incomeRepo.findByFilters({
                businessId: userId,
                source,
                startDate,
                endDate,
                limit: parseInt(limit) || 50,
                offset: parseInt(offset) || 0,
            });
        } else {
            incomes = await incomeRepo.findByUserId(userId);
        }

        const summary = await incomeRepo.getIncomeSummary(userId);

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
// GET /api/income/today - Get today's income
// =============================================
router.get('/today', async (req, res) => {
    try {
        const userId = req.user.id;

        const incomes = await incomeRepo.getTodayIncome(userId);

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
// GET /api/income/summary - Get income summary
// =============================================
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.query;

        let summary;
        if (year && month) {
            summary = await incomeRepo.getMonthlySummary(userId, parseInt(year), parseInt(month));
        } else {
            summary = await incomeRepo.getIncomeSummary(userId);
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
// POST /api/income - Record new income
// =============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { source, amount, description, date } = req.body;

        console.log('💰 Recording income:', { userId, source, amount });

        if (!source) {
            return res.status(400).json({
                success: false,
                message: 'Source is required'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const result = await recordIncomeUseCase.execute({
            userId,
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
// GET /api/income/:id - Get single income record
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const income = await incomeRepo.findById(parseInt(id));

        if (!income) {
            return res.status(404).json({
                success: false,
                message: 'Income record not found'
            });
        }

        if (income.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: income
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
// PUT /api/income/:id - Update income record
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { source, amount, description, date } = req.body;

        const existing = await incomeRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Income record not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updateData = {};
        if (source !== undefined) updateData.source = source;
        if (amount !== undefined) updateData.amount = amount;
        if (description !== undefined) updateData.description = description;
        if (date !== undefined) updateData.date = date;

        const updated = await incomeRepo.update(parseInt(id), updateData);

        res.json({
            success: true,
            message: 'Income updated successfully',
            data: updated
        });

    } catch (error) {
        console.error('❌ Error updating income:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update income'
        });
    }
});

// =============================================
// DELETE /api/income/:id - Delete income record
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await incomeRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Income record not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await incomeRepo.delete(parseInt(id));

        res.json({
            success: true,
            message: 'Income record deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting income:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete income'
        });
    }
});

module.exports = router;