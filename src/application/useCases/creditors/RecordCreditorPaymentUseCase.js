// src/application/useCases/creditors/RecordCreditorPaymentUseCase.js
// v2.1.0-prod — Writes wrapped in withTransaction.
//               Ownership check reads raw business_id (repos return plain rows).

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

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

        // Repos return raw rows (snake_case). Compare business_id to the
        // caller's businessId, coerced to the same type so JWT string
        // claims don't trip strict equality.
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

        const alreadyPaid = Number(creditor.amount_paid ?? creditor.amountPaid ?? 0);
        const supplierLabel = creditor.supplier_name || creditor.supplierName || 'supplier';
        const lastPaymentDate = paymentDate instanceof Date
            ? paymentDate.toISOString()
            : paymentDate;

        // All three writes on one pooled connection, atomically.
        const { updated, savedPayment, newBalance } = await withTransaction(async () => {
            // 1. Update creditor
            const u = await this.creditorRepository.update(creditorId, {
                balance_remaining: balanceRemaining - amount,
                amount_paid: alreadyPaid + amount,
                status: balanceRemaining - amount <= 0 ? 'PAID' : 'ACTIVE',
                last_payment_date: lastPaymentDate,
            });

            // 2. Payment record
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
                notes: notes || `Payment made to ${supplierLabel}`,
            });
            const sp = await this.paymentRepository.create(payment);

            // 3. Transaction record — required inside the transaction.
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

            return {
                updated: u,
                savedPayment: sp,
                newBalance: balanceRemaining - amount,
            };
        });

        return {
            success: true,
            creditor: {
                id: updated.id,
                supplier_name: updated.supplier_name || updated.supplierName,
                balance_remaining: updated.balance_remaining ?? updated.balanceRemaining,
                amount_paid: updated.amount_paid ?? updated.amountPaid,
                status: updated.status,
                last_payment_date: updated.last_payment_date,
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