// src/application/useCases/payments/ReceivePaymentUseCase.js

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
        businessId,
        debtorId,
        amount,
        paymentDate = new Date(),
        notes = '',
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!debtorId) {
            throw new Error('Debtor ID is required');
        }

        if (!amount || amount <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        // Get debtor
        const debtor = await this.debtorRepository.findById(debtorId);
        if (!debtor) {
            throw new Error('Debtor not found');
        }

        // Verify business ownership
        if (debtor.businessId !== businessId) {
            throw new Error('Access denied: Debtor does not belong to this business');
        }

        // Check if debtor is already paid
        if (debtor.isFullyPaid()) {
            throw new Error('Debtor is already fully paid');
        }

        // Check if payment exceeds balance
        if (amount > debtor.balanceRemaining) {
            throw new Error(`Payment amount (${amount}) exceeds remaining balance (${debtor.balanceRemaining})`);
        }

        // Record payment
        const Payment = require('../../../domain/entities/Payment');
        const payment = new Payment({
            businessId,
            type: 'IN',
            amount,
            referenceType: 'DEBTOR',
            referenceId: debtorId,
            date: paymentDate,
            notes,
        });

        const savedPayment = await this.paymentRepository.create(payment);

        // Create transaction for payment
        const Transaction = require('../../../domain/entities/Transaction');
        const transaction = new Transaction({
            businessId,
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

        // Update debtor balance
        debtor.receivePayment(amount);
        await this.debtorRepository.update(debtor.id, debtor);

        // If debtor is linked to a sale, update sale payment status
        if (debtor.referenceType === 'SALE' && debtor.referenceId) {
            const sale = await this.saleRepository.findById(debtor.referenceId);
            if (sale && sale.businessId === businessId) {
                const totalPaid = debtor.amountPaid;
                const totalAmount = debtor.originalAmount;

                if (totalPaid >= totalAmount) {
                    sale.markAsPaid();
                } else if (totalPaid > 0) {
                    sale.markAsPartial(totalPaid);
                }
                await this.saleRepository.update(sale.id, sale);
            }
        }

        // If debtor is linked to income, update income payment status
        if (debtor.referenceType === 'INCOME' && debtor.referenceId) {
            const income = await this.incomeRepository.findById(debtor.referenceId);
            if (income && income.businessId === businessId) {
                const totalPaid = debtor.amountPaid;
                const totalAmount = debtor.originalAmount;

                if (totalPaid >= totalAmount) {
                    income.markAsPaid();
                } else if (totalPaid > 0) {
                    income.markAsPartial(totalPaid);
                }
                await this.incomeRepository.update(income.id, income);
            }
        }

        return {
            success: true,
            payment: savedPayment.toJSON(),
            debtor: debtor.toJSON(),
            remainingBalance: debtor.balanceRemaining,
            message: debtor.isFullyPaid()
                ? 'Debtor fully paid'
                : `Payment received. Remaining balance: ${debtor.balanceRemaining}`,
        };
    }
}

module.exports = ReceivePaymentUseCase;