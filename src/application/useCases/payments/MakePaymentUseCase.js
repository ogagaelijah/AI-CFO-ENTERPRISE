// src/application/useCases/payments/MakePaymentUseCase.js

class MakePaymentUseCase {
    constructor({
        paymentRepository,
        creditorRepository,
        transactionRepository,
        purchaseRepository,
        expenseRepository,
    }) {
        this.paymentRepository = paymentRepository;
        this.creditorRepository = creditorRepository;
        this.transactionRepository = transactionRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
    }

    async execute({
        businessId,
        creditorId,
        amount,
        paymentDate = new Date(),
        notes = '',
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!creditorId) {
            throw new Error('Creditor ID is required');
        }

        if (!amount || amount <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        // Get creditor
        const creditor = await this.creditorRepository.findById(creditorId);
        if (!creditor) {
            throw new Error('Creditor not found');
        }

        // Verify business ownership
        if (creditor.businessId !== businessId) {
            throw new Error('Access denied: Creditor does not belong to this business');
        }

        // Check if creditor is already paid
        if (creditor.isFullyPaid()) {
            throw new Error('Creditor is already fully paid');
        }

        // Check if payment exceeds balance
        if (amount > creditor.balanceRemaining) {
            throw new Error(`Payment amount (${amount}) exceeds remaining balance (${creditor.balanceRemaining})`);
        }

        // Record payment
        const Payment = require('../../../domain/entities/Payment');
        const payment = new Payment({
            businessId,
            type: 'OUT',
            amount,
            referenceType: 'CREDITOR',
            referenceId: creditorId,
            date: paymentDate,
            notes,
        });

        const savedPayment = await this.paymentRepository.create(payment);

        // Create transaction for payment
        const Transaction = require('../../../domain/entities/Transaction');
        const transaction = new Transaction({
            businessId,
            type: 'PAYMENT_OUT',
            category: 'Creditor Payment',
            amount,
            description: `Payment made to creditor #${creditorId}`,
            paymentStatus: 'PAID',
            referenceId: creditorId,
            referenceType: 'CREDITOR',
            date: paymentDate,
        });

        await this.transactionRepository.create(transaction);

        // Update creditor balance
        creditor.makePayment(amount);
        await this.creditorRepository.update(creditor.id, creditor);

        // If creditor is linked to a purchase, update purchase payment status
        if (creditor.referenceType === 'PURCHASE' && creditor.referenceId) {
            const purchase = await this.purchaseRepository.findById(creditor.referenceId);
            if (purchase && purchase.businessId === businessId) {
                const totalPaid = creditor.amountPaid;
                const totalAmount = creditor.originalAmount;

                if (totalPaid >= totalAmount) {
                    purchase.markAsPaid();
                } else if (totalPaid > 0) {
                    purchase.markAsPartial(totalPaid);
                }
                await this.purchaseRepository.update(purchase.id, purchase);
            }
        }

        // If creditor is linked to expense, update expense payment status
        if (creditor.referenceType === 'EXPENSE' && creditor.referenceId) {
            const expense = await this.expenseRepository.findById(creditor.referenceId);
            if (expense && expense.businessId === businessId) {
                const totalPaid = creditor.amountPaid;
                const totalAmount = creditor.originalAmount;

                if (totalPaid >= totalAmount) {
                    expense.markAsPaid();
                } else if (totalPaid > 0) {
                    expense.markAsPartial(totalPaid);
                }
                await this.expenseRepository.update(expense.id, expense);
            }
        }

        return {
            success: true,
            payment: savedPayment.toJSON(),
            creditor: creditor.toJSON(),
            remainingBalance: creditor.balanceRemaining,
            message: creditor.isFullyPaid()
                ? 'Creditor fully paid'
                : `Payment made. Remaining balance: ${creditor.balanceRemaining}`,
        };
    }
}

module.exports = MakePaymentUseCase;