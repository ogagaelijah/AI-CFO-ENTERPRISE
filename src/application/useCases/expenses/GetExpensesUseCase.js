// src/application/useCases/expenses/GetExpensesUseCase.js

class GetExpensesUseCase {
    constructor({ expenseRepository }) {
        this.expenseRepository = expenseRepository;
    }

    async execute({ businessId, limit = 50, offset = 0, expenseType = null }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const expenses = await this.expenseRepository.findByBusinessId(
            businessId,
            limit,
            offset,
            expenseType
        );

        const total = await this.expenseRepository.countByBusinessId(
            businessId,
            expenseType
        );

        return {
            success: true,
            expenses: expenses.map(e => e.toJSON()),
            total,
            limit,
            offset,
            hasMore: offset + expenses.length < total,
        };
    }
}

module.exports = GetExpensesUseCase;