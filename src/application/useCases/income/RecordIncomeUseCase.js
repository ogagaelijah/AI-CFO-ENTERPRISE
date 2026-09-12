// src/application/useCases/income/RecordIncomeUseCase.js
// v2.1.0-prod — Fixed missing business_id

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

        // Normalize source
        source = source.toUpperCase().trim();

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const incomeDate = date instanceof Date ? date : new Date(date);

        const incomeData = {
            user_id: userId,
            business_id: businessId,          // 🔑 CRITICAL FIX
            source: source,
            amount: amount,
            description: description || null,
            date: incomeDate.toISOString().split('T')[0],
        };

        // 1. Create the income
        const savedIncome = await this.incomeRepository.create(incomeData);

        // 2. Create corresponding Payment record
        if (this.paymentRepository) {
            try {
                await this.paymentRepository.create({
                    businessId: businessId,
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