// src/application/useCases/expenses/RecordExpenseUseCase.js
// v2.2.0-prod — Writes wrapped in withTransaction.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class RecordExpenseUseCase {
    constructor(expenseRepository, paymentRepository = null) {
        this.expenseRepository = expenseRepository;
        this.paymentRepository = paymentRepository;
    }

    async execute({
        userId,
        businessId = null,
        category,
        amount,
        description = '',
        date = new Date(),
    }) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const normalizedCategory = category ? category.toUpperCase().trim() : 'OTHER';

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const expenseDate = date instanceof Date ? date : new Date(date);
        const dateOnly = expenseDate.toISOString().split('T')[0];

        const expenseData = {
            user_id: userId,
            business_id: businessId,
            category: normalizedCategory,
            amount,
            description: description || null,
            date: dateOnly,
        };

        const savedExpense = await withTransaction(async () => {
            const expense = await this.expenseRepository.create(expenseData);

            if (this.paymentRepository) {
                await this.paymentRepository.create({
                    businessId,
                    userId,
                    type: 'MADE',
                    amount,
                    paymentDate: expenseDate,
                    referenceType: 'EXPENSE',
                    referenceId: expense.id,
                    paymentMethod: 'CASH',
                    notes: description || `Expense: ${normalizedCategory}`,
                });
            }

            return expense;
        });

        return savedExpense;
    }
}

module.exports = RecordExpenseUseCase;