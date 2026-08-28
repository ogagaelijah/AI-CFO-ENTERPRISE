// src/application/useCases/expenses/RecordExpenseUseCase.js

class RecordExpenseUseCase {
    constructor(expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    async execute({
        userId,
        category,
        amount,
        description = '',
        paymentStatus = 'PAID',
        date = new Date(),
        dueDate = null,
    }) {
        // Validate
        if (!category || category.length < 2) {
            throw new Error('Category must be at least 2 characters');
        }
        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const expenseData = {
            user_id: userId,
            category: category,
            amount: amount,
            description: description || null,
            payment_status: paymentStatus,
            date: date instanceof Date ? date.toISOString().split('T')[0] : date,
            due_date: dueDate,
        };

        return await this.expenseRepository.create(expenseData);
    }
}

module.exports = RecordExpenseUseCase;