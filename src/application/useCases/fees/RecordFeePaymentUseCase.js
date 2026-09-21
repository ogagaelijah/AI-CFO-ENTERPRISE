// src/application/useCases/fees/RecordFeePaymentUseCase.js
// v1.1.1-prod — payment_type set to 'RECEIVED' (matches the check constraint
//               and every other money-in payment: SALE, INVOICE, DEBTOR, INCOME).

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class RecordFeePaymentUseCase {
    constructor({
        feeRepository,
        debtorRepository,
        paymentRepository,
        transactionRepository,
    }) {
        if (!feeRepository) throw new Error('feeRepository is required');
        if (!debtorRepository) throw new Error('debtorRepository is required');
        if (!paymentRepository) throw new Error('paymentRepository is required');
        if (!transactionRepository) throw new Error('transactionRepository is required');
        this.feeRepository = feeRepository;
        this.debtorRepository = debtorRepository;
        this.paymentRepository = paymentRepository;
        this.transactionRepository = transactionRepository;
    }

    async execute({
        feeId,
        businessId,
        userId = null,
        amount,
        paymentDate = new Date(),
        paymentMethod = 'CASH',
        notes = '',
    }) {
        if (!feeId) throw new Error('Fee ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Payment amount must be a positive number');
        }

        const fee = await this.feeRepository.findById(feeId, businessId);
        if (!fee) throw new Error('Fee not found');

        if (fee.status === 'DRAFT') {
            throw new Error('Cannot record payment on a DRAFT fee. Send it first.');
        }
        if (fee.status === 'CANCELLED') {
            throw new Error('Cannot record payment on a CANCELLED fee');
        }
        if (fee.status === 'PAID') {
            throw new Error('Fee is already PAID');
        }
        if (amt > fee.balance) {
            throw new Error(
                `Payment exceeds outstanding balance (₦${fee.balance.toLocaleString()})`
            );
        }

        const result = await withTransaction(async () => {
            const newAmountPaid = Number(fee.amountPaid) + amt;
            const newStatus = newAmountPaid >= Number(fee.amount) ? 'PAID' : fee.status;
            const updatedFee = await this.feeRepository.update(feeId, businessId, {
                amountPaid: newAmountPaid,
                status: newStatus,
            });

            if (this.debtorRepository) {
                const debtor = await this.debtorRepository.findByReference(
                    businessId, 'FEE', feeId
                );
                if (debtor) {
                    await this.debtorRepository.recordPayment(debtor.id, amt);
                }
            }

            // payment_type = 'RECEIVED' → matches payments_payment_type_check
            const payment = await this.paymentRepository.create({
                businessId,
                userId,
                type: 'RECEIVED',
                amount: amt,
                referenceType: 'FEE',
                referenceId: feeId,
                paymentDate,
                paymentMethod,
                referenceNumber: null,
                notes: notes || `Payment for ${fee.feeNumber}`,
                metadata: { feeNumber: fee.feeNumber, studentId: fee.studentId },
            });

            await this.transactionRepository.create({
                businessId,
                userId,
                type: 'INCOME',
                category: 'FEE_PAYMENT',
                amount: amt,
                description: `Fee payment — ${fee.feeNumber}`,
                paymentStatus: 'PAID',
                referenceId: feeId,
                referenceType: 'FEE',
                date: paymentDate,
                dueDate: null,
                metadata: { feeNumber: fee.feeNumber, studentId: fee.studentId },
            });

            return { fee: updatedFee, payment };
        });

        return {
            success: true,
            fee: result.fee.toJSON(),
            payment: result.payment?.toJSON ? result.payment.toJSON() : result.payment,
            message: `Payment of ₦${amt.toLocaleString()} recorded for ${fee.feeNumber}`,
        };
    }
}

module.exports = RecordFeePaymentUseCase;