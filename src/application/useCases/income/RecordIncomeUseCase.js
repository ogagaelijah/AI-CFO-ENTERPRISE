// src/application/useCases/income/RecordIncomeUseCase.js

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
        // Validate
        const validSources = ['COMMISSION', 'INTEREST', 'RENT', 'GRANT', 'GIFT', 'DIVIDEND', 'OTHER'];
        if (!source) {
            throw new Error('Source is required');
        }

        // Normalize source
        source = source.toUpperCase();

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const incomeDate = date instanceof Date ? date : new Date(date);

        const incomeData = {
            user_id: userId,
            source: source,
            amount: amount,
            description: description || null,
            date: incomeDate.toISOString().split('T')[0],
            payment_status: 'PAID',
        };

        // 1. Create the income
        const savedIncome = await this.incomeRepository.create(incomeData);

        // 2. Create corresponding Payment record (permanent fix)
        if (this.paymentRepository) {
            try {
                await this.paymentRepository.create({
                    businessId: businessId || userId,
                    userId: userId,
                    type: 'RECEIVED',
                    amount: amount,
                    paymentDate: incomeDate,
                    referenceType: 'INCOME',
                    referenceId: savedIncome.id,
                    paymentMethod: 'CASH',
                    notes: description || `Income: ${source}`,
                });
                console.log(`✅ Payment record created for income ${savedIncome.id}: ₦${amount}`);
            } catch (error) {
                console.error('⚠️ Failed to create payment for income:', error.message);
            }
        }

        return savedIncome;
    }
}

module.exports = RecordIncomeUseCase;