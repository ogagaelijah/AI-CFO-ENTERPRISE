// src/application/useCases/creditors/RecordCreditorPaymentUseCase.js

class RecordCreditorPaymentUseCase {
    constructor({
        creditorRepository,
        paymentRepository,
        transactionRepository,
    }) {
        this.creditorRepository = creditorRepository;
        this.paymentRepository = paymentRepository;
        this.transactionRepository = transactionRepository;
    }

    async execute({
        userId,
        businessId,
        creditorId,
        amount,
        paymentDate = new Date(),
        notes = '',
        paymentMethod = 'CASH',
    }) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!creditorId) {
            throw new Error('Creditor ID is required');
        }
        if (!amount || amount <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        const creditor = await this.creditorRepository.findById(creditorId);
        if (!creditor) {
            throw new Error('Creditor not found');
        }

        const creditorBusinessId = creditor.businessId ?? creditor.user_id ?? creditor.business_id;
        if (creditorBusinessId !== businessId) {
            throw new Error('Access denied: Creditor does not belong to this business');
        }

        const balanceRemaining = creditor.balanceRemaining ?? creditor.balance_remaining ?? 0;
        if (balanceRemaining <= 0) {
            throw new Error('Creditor is already fully paid');
        }
        if (amount > balanceRemaining) {
            throw new Error(`Payment amount (${amount}) exceeds remaining balance (${balanceRemaining})`);
        }

        const newBalance = balanceRemaining - amount;
        const newAmountPaid = (creditor.amount_paid || creditor.amountPaid || 0) + amount;

        // 1. Update creditor
        const updated = await this.creditorRepository.update(creditorId, {
            balance_remaining: newBalance,
            amount_paid: newAmountPaid,
            status: newBalance <= 0 ? 'PAID' : 'ACTIVE',
            last_payment_date: paymentDate instanceof Date
                ? paymentDate.toISOString().split('T')[0]
                : paymentDate,
        });

        // 2. Create payment record (critical)
        const Payment = require('../../../domain/entities/Payment');
        const payment = new Payment({
            userId,
            businessId,
            type: 'MADE',
            amount,
            referenceType: 'CREDITOR',
            referenceId: creditorId,
            paymentDate,
            paymentMethod,
            notes: notes || `Payment made to ${creditor.supplier_name || creditor.supplierName || 'supplier'}`,
        });

        const savedPayment = await this.paymentRepository.create(payment);

        // 3. Try to create transaction (non-blocking)
        try {
            if (this.transactionRepository) {
                const Transaction = require('../../../domain/entities/Transaction');
                const transaction = new Transaction({
                    businessId,
                    userId,
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
            }
        } catch (txError) {
            console.warn('⚠️ Could not create transaction record (table may be missing):', txError.message);
            // Do NOT throw – payment was already recorded successfully
        }

        return {
            success: true,
            creditor: {
                id: updated.id,
                supplier_name: updated.supplier_name || updated.supplierName,
                balance_remaining: updated.balance_remaining ?? updated.balanceRemaining,
                amount_paid: updated.amount_paid ?? updated.amountPaid,
                status: updated.status,
            },
            payment: savedPayment.toJSON ? savedPayment.toJSON() : savedPayment,
            remainingBalance: newBalance,
            message: newBalance <= 0
                ? 'Creditor fully paid'
                : `Payment recorded. Remaining balance: ${newBalance}`,
        };
    }
}

module.exports = RecordCreditorPaymentUseCase;