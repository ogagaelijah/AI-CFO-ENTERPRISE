// src/application/useCases/debtors/RecordDebtorPaymentUseCase.js

class RecordDebtorPaymentUseCase {
    constructor({
        debtorRepository,
        paymentRepository,
        transactionRepository,
    }) {
        this.debtorRepository = debtorRepository;
        this.paymentRepository = paymentRepository;
        this.transactionRepository = transactionRepository;
    }

    async execute({
        userId,
        businessId,
        debtorId,
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
        if (!debtorId) {
            throw new Error('Debtor ID is required');
        }
        if (!amount || amount <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        const debtor = await this.debtorRepository.findById(debtorId);
        if (!debtor) {
            throw new Error('Debtor not found');
        }

        const debtorBusinessId = debtor.businessId ?? debtor.user_id ?? debtor.business_id;
        if (debtorBusinessId !== businessId) {
            throw new Error('Access denied: Debtor does not belong to this business');
        }

        if (typeof debtor.isFullyPaid === 'function' && debtor.isFullyPaid()) {
            throw new Error('Debtor is already fully paid');
        }

        const balanceRemaining = debtor.balanceRemaining ?? debtor.balance_remaining ?? 0;
        if (amount > balanceRemaining) {
            throw new Error(`Payment amount (${amount}) exceeds remaining balance (${balanceRemaining})`);
        }

        // 1. Record payment (this is the critical part)
        const Payment = require('../../../domain/entities/Payment');
        const payment = new Payment({
            userId,
            businessId,
            type: 'RECEIVED',
            amount,
            referenceType: 'DEBTOR',
            referenceId: debtorId,
            paymentDate,
            paymentMethod,
            notes,
        });

        const savedPayment = await this.paymentRepository.create(payment);

        // 2. Try to create transaction (non-blocking)
        try {
            if (this.transactionRepository) {
                const Transaction = require('../../../domain/entities/Transaction');
                const transaction = new Transaction({
                    businessId,
                    userId,
                    type: 'PAYMENT_IN',
                    category: 'Debtor Payment',
                    amount,
                    description: `Payment received from debtor #${debtorId}`,
                    paymentStatus: 'PAID',
                    referenceId: debtorId,
                    referenceType: 'DEBTOR',
                    date: paymentDate,
                });
                await this.transactionRepository.create(transaction);
            }
        } catch (txError) {
            console.warn('⚠️ Could not create transaction record (table may be missing):', txError.message);
            // Do NOT throw – payment was already recorded successfully
        }

        // 3. Update debtor
        if (typeof debtor.receivePayment === 'function') {
            debtor.receivePayment(amount);
            await this.debtorRepository.update(debtor.id, debtor);
        } else {
            const newBalance = balanceRemaining - amount;
            await this.debtorRepository.update(debtorId, {
                balance_remaining: newBalance,
                amount_paid: (debtor.amount_paid || 0) + amount,
                status: newBalance <= 0 ? 'PAID' : 'ACTIVE',
            });
        }

        const remaining = typeof debtor.balanceRemaining !== 'undefined'
            ? debtor.balanceRemaining
            : (balanceRemaining - amount);

        return {
            success: true,
            debtor: typeof debtor.toJSON === 'function' ? debtor.toJSON() : debtor,
            payment: savedPayment.toJSON ? savedPayment.toJSON() : savedPayment,
            remainingBalance: remaining,
            message: remaining <= 0
                ? 'Debtor fully paid'
                : `Payment recorded. Remaining balance: ${remaining}`,
        };
    }
}

module.exports = RecordDebtorPaymentUseCase;