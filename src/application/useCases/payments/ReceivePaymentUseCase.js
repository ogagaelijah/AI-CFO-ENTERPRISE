// src/application/useCases/payments/ReceivePaymentUseCase.js
// v2.0.0-prod — Writes wrapped in withTransaction.
//               Ownership check reads raw business_id.
//               All updates use raw columns, not entity methods.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class ReceivePaymentUseCase {
    constructor({
        paymentRepository,
        debtorRepository,
        transactionRepository,
        saleRepository,
        incomeRepository,
    }) {
        this.paymentRepository = paymentRepository;
        this.debtorRepository = debtorRepository;
        this.transactionRepository = transactionRepository;
        this.saleRepository = saleRepository;
        this.incomeRepository = incomeRepository;
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

        // Raw rows (snake_case). Coerce both sides so JWT strings match ints.
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

        const alreadyPaid = Number(debtor.amount_paid ?? debtor.amountPaid ?? 0);
        const newBalance = balanceRemaining - amount;
        const newPaid = alreadyPaid + amount;
        const lastPaymentDate = paymentDate instanceof Date
            ? paymentDate.toISOString()
            : paymentDate;

        const refType = debtor.reference_type ?? debtor.referenceType;
        const refId = debtor.reference_id ?? debtor.referenceId;
        const originalAmount = Number(
            debtor.total_owed ?? debtor.originalAmount ?? 0
        );

        // All writes on one pooled connection, atomic.
        const result = await withTransaction(async () => {
            // 1. Payment
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

            // 2. Transaction record
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

            // 3. Debtor update — raw columns
            await this.debtorRepository.update(debtorId, {
                balance_remaining: newBalance,
                amount_paid: newPaid,
                status: newBalance <= 0 ? 'PAID' : 'ACTIVE',
                last_payment_date: lastPaymentDate,
            });

            // 4. Downstream: sale or income status update (single-shot per debtor)
            if (refType === 'SALE' && refId && this.saleRepository) {
                const sale = await this.saleRepository.findById(refId);
                const saleBiz = Number(sale?.business_id ?? sale?.businessId);
                if (sale && saleBiz === Number(businessId)) {
                    const patch = {
                        payment_status: newPaid >= originalAmount ? 'PAID' : 'PARTIAL',
                    };
                    if (newPaid >= originalAmount) {
                        patch.balance_remaining = 0;
                    } else {
                        patch.balance_remaining = originalAmount - newPaid;
                    }
                    await this.saleRepository.update(refId, patch);
                }
            } else if (refType === 'INCOME' && refId && this.incomeRepository) {
                const income = await this.incomeRepository.findById(refId);
                const incomeBiz = Number(income?.business_id ?? income?.businessId);
                if (income && incomeBiz === Number(businessId)) {
                    const patch = {
                        payment_status: newPaid >= originalAmount ? 'PAID' : 'PARTIAL',
                    };
                    if (newPaid >= originalAmount) {
                        patch.balance_remaining = 0;
                    } else {
                        patch.balance_remaining = originalAmount - newPaid;
                    }
                    await this.incomeRepository.update(refId, patch);
                }
            }

            return { savedPayment, newBalance };
        });

        return {
            success: true,
            payment: result.savedPayment.toJSON ? result.savedPayment.toJSON() : result.savedPayment,
            debtor: await this.debtorRepository.findById(debtorId),
            remainingBalance: result.newBalance,
            message: result.newBalance <= 0
                ? 'Debtor fully paid'
                : `Payment received. Remaining balance: ${result.newBalance}`,
        };
    }
}

module.exports = ReceivePaymentUseCase;