// src/application/useCases/income/RecordIncomeUseCase.js

class RecordIncomeUseCase {
    constructor(incomeRepository) {
        this.incomeRepository = incomeRepository;
    }

    async execute({
        userId,
        source,
        amount,
        description = '',
        date = new Date(),
    }) {
        // Validate
        const validSources = ['COMMISSION', 'INTEREST', 'RENT', 'GRANT', 'GIFT', 'DIVIDEND', 'OTHER'];
        if (!source || !validSources.includes(source)) {
            throw new Error(`Source must be one of: ${validSources.join(', ')}`);
        }

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const incomeData = {
            user_id: userId,
            source: source,
            amount: amount,
            description: description || null,
            date: date instanceof Date ? date.toISOString().split('T')[0] : date,
        };

        return await this.incomeRepository.create(incomeData);
    }
}

module.exports = RecordIncomeUseCase;