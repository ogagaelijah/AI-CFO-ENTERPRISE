// src/interfaces/http/routes/expenseRoutes.js
const express = require('express');
const router = express.Router();
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const RecordExpenseUseCase = require('../../../application/useCases/expenses/RecordExpenseUseCase');
const { authMiddleware } = require('../middleware/authMiddleware');

const expenseRepo = new ExpenseRepository();
const recordExpenseUseCase = new RecordExpenseUseCase(expenseRepo);

router.use(authMiddleware);

// GET /api/expenses - Get all expenses
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, category } = req.query;

        let expenses;
        if (startDate && endDate) {
            expenses = await expenseRepo.findByDateRange(userId, startDate, endDate);
        } else if (category) {
            expenses = await expenseRepo.findByCategory(userId, category);
        } else {
            expenses = await expenseRepo.findByUserId(userId);
        }

        const summary = await expenseRepo.getExpenseSummary(userId);

        res.json({
            success: true,
            data: {
                expenses: expenses || [],
                summary: summary || {
                    total_entries: 0,
                    total_amount: 0,
                    average_amount: 0,
                    categories_used: 0,
                    total_paid: 0,
                    total_outstanding: 0,
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching expenses:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch expenses'
        });
    }
});

// GET /api/expenses/today - Get today's expenses
router.get('/today', async (req, res) => {
    try {
        const userId = req.user.id;

        const expenses = await expenseRepo.getTodayExpenses(userId);

        res.json({
            success: true,
            data: {
                expenses: expenses || [],
                count: expenses.length,
                total: expenses.reduce((sum, e) => sum + e.amount, 0)
            }
        });

    } catch (error) {
        console.error('❌ Error fetching today expenses:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch today expenses'
        });
    }
});

// GET /api/expenses/summary - Get expense summary
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.query;

        let summary;
        if (year && month) {
            summary = await expenseRepo.getMonthlySummary(userId, parseInt(year), parseInt(month));
        } else {
            summary = await expenseRepo.getExpenseSummary(userId);
        }

        res.json({
            success: true,
            data: summary || {
                total_entries: 0,
                total_amount: 0,
                average_amount: 0,
                categories_used: 0,
                total_paid: 0,
                total_outstanding: 0,
            }
        });

    } catch (error) {
        console.error('❌ Error fetching expense summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch expense summary'
        });
    }
});

// POST /api/expenses - Record new expense
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, amount, description, paymentStatus, date, dueDate } = req.body;

        console.log('📉 Recording expense:', { userId, category, amount });

        if (!category || category.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Category must be at least 2 characters'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const result = await recordExpenseUseCase.execute({
            userId,
            category,
            amount,
            description: description || '',
            paymentStatus: paymentStatus || 'PAID',
            date: date || new Date(),
            dueDate: dueDate || null,
        });

        res.status(201).json({
            success: true,
            message: 'Expense recorded successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ Error recording expense:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record expense'
        });
    }
});

// GET /api/expenses/:id - Get single expense
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const expense = await expenseRepo.findById(parseInt(id));

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense record not found'
            });
        }

        if (expense.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: expense
        });

    } catch (error) {
        console.error('❌ Error fetching expense:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch expense'
        });
    }
});

// PUT /api/expenses/:id - Update expense
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { category, amount, description, paymentStatus, date, dueDate } = req.body;

        const existing = await expenseRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Expense record not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updateData = {};
        if (category !== undefined) updateData.category = category;
        if (amount !== undefined) updateData.amount = amount;
        if (description !== undefined) updateData.description = description;
        if (paymentStatus !== undefined) updateData.payment_status = paymentStatus;
        if (date !== undefined) updateData.date = date;
        if (dueDate !== undefined) updateData.due_date = dueDate;

        const updated = await expenseRepo.update(parseInt(id), updateData);

        res.json({
            success: true,
            message: 'Expense updated successfully',
            data: updated
        });

    } catch (error) {
        console.error('❌ Error updating expense:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update expense'
        });
    }
});

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await expenseRepo.findById(parseInt(id));
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Expense record not found'
            });
        }

        if (existing.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await expenseRepo.delete(parseInt(id));

        res.json({
            success: true,
            message: 'Expense record deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting expense:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete expense'
        });
    }
});

module.exports = router;