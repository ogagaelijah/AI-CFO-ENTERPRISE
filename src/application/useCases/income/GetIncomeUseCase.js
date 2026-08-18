// src/application/useCases/income/GetIncomeUseCase.js

class GetIncomeUseCase {
    constructor({ incomeRepository }) {
        this.incomeRepository = incomeRepository;
    }

    async execute({ incomeId, businessId }) {
        if (!incomeId) {
            throw new Error('Income ID is required');
        }

        const income = await this.incomeRepository.findById(incomeId);
        if (!income) {
            throw new Error('Income not found');
        }

        // Verify business ownership
        if (income.businessId !== businessId) {
            throw new Error('Access denied: Income does not belong to this business');
        }

        return {
            success: true,
            income: income.toJSON(),
        };
    }
}

module.exports = GetIncomeUseCase;