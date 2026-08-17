// src/application/useCases/expenses/RecordExpenseUseCase.js

class RecordExpenseUseCase {
    constructor(expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    async execute({ userId, category, amount, description }) {
        return await this.expenseRepository.create({
            user_id: userId,
            category: category,
            amount: amount,
            description: description || null,
        });
    }
}

module.exports = RecordExpenseUseCase;