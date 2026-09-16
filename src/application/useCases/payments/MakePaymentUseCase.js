// src/application/useCases/payments/MakePaymentUseCase.js
// v2.0.0-prod — Writes wrapped in withTransaction.
//               Ownership check reads raw business_id.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

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

        // Raw rows (snake_case). Coerce both sides so JWT strings match ints.
        const creditorBusinessId = Number(creditor.business_id ?? creditor.businessId);
        if (!Number.isInteger(creditorBusinessId) || creditorBusinessId !== Number(businessId)) {
            throw new Error('Access denied: Creditor does not belong to this business');
        }

        const balanceRemaining = Number(
            creditor.balance_remaining ?? creditor.balanceRemaining ?? 0
        );
        if (balanceRemaining <= 0) {
            throw new Error('Creditor is already fully paid');
        }
        if (amount > balanceRemaining) {
            throw new Error(`Payment amount (${amount}) exceeds remaining balance (${balanceRemaining})`);
        }

        // Everything in one transaction: payment + transaction + creditor update
        // + optional purchase/expense status update.
        const result = await withTransaction(async () => {
            // 1. Payment
            const Payment = require('../../../domain/entities/Payment');
            const payment = new Payment({
                userId,
                businessId,
                type: 'OUT',
                amount,
                referenceType: 'CREDITOR',
                referenceId: creditorId,
                paymentDate,
                paymentMethod,
                notes,
            });
            const savedPayment = await this.paymentRepository.create(payment);

            // 2. Transaction record
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

            // 3. Creditor update — computed from raw values, not entity methods
            const newBalance = balanceRemaining - amount;
            const newPaid = Number(creditor.amount_paid ?? creditor.amountPaid ?? 0) + amount;

            const updatedCreditor = await this.creditorRepository.update(creditorId, {
                balance_remaining: newBalance,
                amount_paid: newPaid,
                status: newBalance <= 0 ? 'PAID' : 'ACTIVE',
                last_payment_date: paymentDate instanceof Date
                    ? paymentDate.toISOString()
                    : paymentDate,
            });

            // 4. Optional downstream status update (purchase or expense)
            const refType = creditor.reference_type ?? creditor.referenceType;
            const refId = creditor.reference_id ?? creditor.referenceId;
            const originalAmount = Number(
                creditor.original_amount ?? creditor.total_owed ?? creditor.originalAmount ?? 0
            );

            if (refType === 'PURCHASE' && refId && this.purchaseRepository) {
                const purchase = await this.purchaseRepository.findById(refId);
                const purchaseBiz = Number(purchase?.business_id ?? purchase?.businessId);
                if (purchase && purchaseBiz === Number(businessId)) {
                    const patch = { payment_status: newPaid >= originalAmount ? 'PAID' : 'PARTIAL' };
                    if (newPaid >= originalAmount) {
                        patch.balance_remaining = 0;
                    } else {
                        patch.balance_remaining = originalAmount - newPaid;
                    }
                    await this.purchaseRepository.update(refId, patch);
                }
            } else if (refType === 'EXPENSE' && refId && this.expenseRepository) {
                const expense = await this.expenseRepository.findById(refId);
                const expenseBiz = Number(expense?.business_id ?? expense?.businessId);
                if (expense && expenseBiz === Number(businessId)) {
                    const patch = { payment_status: newPaid >= originalAmount ? 'PAID' : 'PARTIAL' };
                    if (newPaid >= originalAmount) {
                        patch.balance_remaining = 0;
                    } else {
                        patch.balance_remaining = originalAmount - newPaid;
                    }
                    await this.expenseRepository.update(refId, patch);
                }
            }

            return {
                savedPayment,
                updatedCreditor,
                newBalance,
                fullyPaid: newBalance <= 0,
            };
        });

        return {
            success: true,
            payment: result.savedPayment.toJSON ? result.savedPayment.toJSON() : result.savedPayment,
            creditor: result.updatedCreditor,
            remainingBalance: result.newBalance,
            message: result.fullyPaid
                ? 'Creditor fully paid'
                : `Payment made. Remaining balance: ${result.newBalance}`,
        };
    }
}

module.exports = MakePaymentUseCase;