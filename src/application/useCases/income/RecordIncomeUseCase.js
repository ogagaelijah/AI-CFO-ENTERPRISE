// src/application/useCases/income/RecordIncomeUseCase.js
// v2.2.0-prod — Writes wrapped in withTransaction.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class RecordIncomeUseCase {
    constructor(incomeRepository, paymentRepository = null) {
        this.incomeRepository = incomeRepository;
        this.paymentRepository = paymentRepository;
    }

    async execute({
        userId,
        businessId = null,
        source,
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
        if (!source) {
            throw new Error('Source is required');
        }

        const normalizedSource = source.toUpperCase().trim();

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const incomeDate = date instanceof Date ? date : new Date(date);
        const dateOnly = incomeDate.toISOString().split('T')[0];

        const incomeData = {
            user_id: userId,
            business_id: businessId,
            source: normalizedSource,
            amount,
            description: description || null,
            date: dateOnly,
        };

        // Both writes atomic. If payment insert fails, income is rolled back too.
        const savedIncome = await withTransaction(async () => {
            const income = await this.incomeRepository.create(incomeData);

            if (this.paymentRepository) {
                await this.paymentRepository.create({
                    businessId,
                    userId,
                    type: 'RECEIVED',
                    amount,
                    paymentDate: incomeDate,
                    referenceType: 'INCOME',
                    referenceId: income.id,
                    paymentMethod: 'CASH',
                    notes: description || `Income: ${normalizedSource}`,
                });
            }

            return income;
        });

        return savedIncome;
    }
}

module.exports = RecordIncomeUseCase;