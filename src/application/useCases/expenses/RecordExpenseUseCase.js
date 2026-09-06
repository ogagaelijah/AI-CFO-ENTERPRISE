// src/application/useCases/expenses/RecordExpenseUseCase.js

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
        // Validate
        const validCategories = ['SALARY', 'RENT', 'TRANSPORT', 'UTILITIES', 'MARKETING', 'INSURANCE', 'OTHER'];
        if (!category || !validCategories.includes(category.toUpperCase())) {
            // Allow custom categories but normalize common ones
            category = category ? category.toUpperCase() : 'OTHER';
        }

        if (!amount || amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        const expenseDate = date instanceof Date ? date : new Date(date);

        const expenseData = {
            user_id: userId,
            category: category,
            amount: amount,
            description: description || null,
            date: expenseDate.toISOString().split('T')[0],
            payment_status: 'PAID',
        };

        // 1. Create the expense
        const savedExpense = await this.expenseRepository.create(expenseData);

        // 2. Create corresponding Payment record (permanent fix)
        if (this.paymentRepository) {
            try {
                await this.paymentRepository.create({
                    businessId: businessId || userId,
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