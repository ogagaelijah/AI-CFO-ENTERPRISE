// src/application/useCases/debtors/RecordDebtorPaymentUseCase.js
// v2.1.0-prod — Writes wrapped in withTransaction.
//               Ownership check reads raw business_id (repos return plain rows, not entities).

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

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

        // Repos return raw rows (snake_case). Compare business_id to the
        // caller's businessId, coerced to the same type so JWT string
        // claims don't trip strict equality.
        const debtorBusinessId = Number(debtor.business_id ?? debtor.businessId);
        if (!Number.isInteger(debtorBusinessId) || debtorBusinessId !== Number(businessId)) {
            throw new Error('Access denied: Debtor does not belong to this business');
        }

        const balanceRemaining = Number(
            debtor.balance_remaining ?? debtor.balanceRemaining ?? 0
        );
        if (balanceRemaining <= 0) {
            throw new Error('Debtor is already fully paid');
        }
        if (amount > balanceRemaining) {
            throw new Error(`Payment amount (${amount}) exceeds remaining balance (${balanceRemaining})`);
        }

        const alreadyPaid = Number(debtor.amount_paid ?? 0);

        const { savedPayment, newBalance } = await withTransaction(async () => {
            // 1. Record payment
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

            const saved = await this.paymentRepository.create(payment);

            // 2. Transaction record — required inside the transaction.
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

            // 3. Update debtor
            const remaining = balanceRemaining - amount;
            const lastPaymentDate = paymentDate instanceof Date
                ? paymentDate.toISOString()
                : paymentDate;

            await this.debtorRepository.update(debtorId, {
                balance_remaining: remaining,
                amount_paid: alreadyPaid + amount,
                status: remaining <= 0 ? 'PAID' : 'ACTIVE',
                last_payment_date: lastPaymentDate,
            });

            return { savedPayment: saved, newBalance: remaining };
        });

        return {
            success: true,
            debtor: await this.debtorRepository.findById(debtorId),
            payment: savedPayment.toJSON ? savedPayment.toJSON() : savedPayment,
            remainingBalance: newBalance,
            message: newBalance <= 0
                ? 'Debtor fully paid'
                : `Payment recorded. Remaining balance: ${newBalance}`,
        };
    }
}

module.exports = RecordDebtorPaymentUseCase;