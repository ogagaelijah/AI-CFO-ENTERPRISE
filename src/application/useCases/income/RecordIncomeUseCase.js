// src/application/useCases/income/RecordIncomeUseCase.js

class RecordIncomeUseCase {
    constructor(incomeRepository) {
        this.incomeRepository = incomeRepository;
    }

    async execute({
        userId,
        source,
        amount,
        category,
        description = '',
        paymentStatus = 'PAID',
        date = new Date(),
        dueDate = null,
    }) {
        // Validate
        if (!source || source.length < 2) {
            throw new Error('Source must be at least 2 characters');
        }
        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const incomeData = {
            user_id: userId,
            source: source,
            amount: amount,
            category: category || 'Other',
            description: description || null,
            payment_status: paymentStatus,
            date: date instanceof Date ? date.toISOString().split('T')[0] : date,
            due_date: dueDate,
        };

        return await this.incomeRepository.create(incomeData);
    }
}

module.exports = RecordIncomeUseCase;