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
        date = new Date(),
    }) {
        // Validate
        const validCategories = ['SALARY', 'RENT', 'TRANSPORT', 'UTILITIES', 'MARKETING', 'INSURANCE', 'OTHER'];
        if (!category || !validCategories.includes(category)) {
            throw new Error(`Category must be one of: ${validCategories.join(', ')}`);
        }

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const expenseData = {
            user_id: userId,
            category: category,
            amount: amount,
            description: description || null,
            date: date instanceof Date ? date.toISOString().split('T')[0] : date,
        };

        return await this.expenseRepository.create(expenseData);
    }
}

module.exports = RecordExpenseUseCase;