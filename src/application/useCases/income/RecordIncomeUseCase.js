// src/application/useCases/income/RecordIncomeUseCase.js

class RecordIncomeUseCase {
    constructor(incomeRepository) {
        this.incomeRepository = incomeRepository;
    }

    async execute({ userId, source, amount, category, description }) {
        return await this.incomeRepository.create({
            user_id: userId,
            source: source,
            amount: amount,
            category: category || 'Other',
            description: description || null,
        });
    }
}

module.exports = RecordIncomeUseCase;