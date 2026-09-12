// src/application/useCases/expenses/RecordExpenseUseCase.js
// v2.1.0-prod — Fixed missing business_id

class RecordExpenseUseCase {
    constructor(expenseRepository, paymentRepository = null) {
        this.expenseRepository = expenseRepository;
        this.paymentRepository = paymentRepository;
    }

    async execute({
        userId,
        businessId = null,
        category,
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

        // Normalize category
        category = category ? category.toUpperCase().trim() : 'OTHER';

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const expenseDate = date instanceof Date ? date : new Date(date);

        const expenseData = {
            user_id: userId,
            business_id: businessId,          // 🔑 CRITICAL FIX
            category: category,
            amount: amount,
            description: description || null,
            date: expenseDate.toISOString().split('T')[0],
        };

        // 1. Create the expense
        const savedExpense = await this.expenseRepository.create(expenseData);

        // 2. Create corresponding Payment record
        if (this.paymentRepository) {
            try {
                await this.paymentRepository.create({
                    businessId: businessId,
                    userId: userId,
                    type: 'MADE',
                    amount: amount,
                    paymentDate: expenseDate,
                    referenceType: 'EXPENSE',
                    referenceId: savedExpense.id,
                    paymentMethod: 'CASH',
                    notes: description || `Expense: ${category}`,
                });
                console.log(`✅ Payment record created for expense ${savedExpense.id}: ₦${amount}`);
            } catch (error) {
                console.error('⚠️ Failed to create payment for expense:', error.message);
            }
        }

        return savedExpense;
    }
}

module.exports = RecordExpenseUseCase;