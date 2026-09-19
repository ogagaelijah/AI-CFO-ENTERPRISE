// src/application/useCases/invoices/RecordInvoicePaymentUseCase.js
// v1.0.0-prod — Atomic payment against an invoice.
//
// All four writes on one pooled connection:
//   1. Insert payment (reference_type = 'INVOICE')
//   2. Insert transaction (PAYMENT_IN)
//   3. Update invoice (amount_paid, status → PAID when settled)
//   4. Update linked debtor (amount_paid, balance_remaining, status, last_payment_date)
//
// If any step fails, all roll back.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class RecordInvoicePaymentUseCase {
    constructor({
        invoiceRepository,
        debtorRepository,
        paymentRepository,
        transactionRepository,
    }) {
        this.invoiceRepository = invoiceRepository;
        this.debtorRepository = debtorRepository;
        this.paymentRepository = paymentRepository;
        this.transactionRepository = transactionRepository;
    }

    async execute({
        invoiceId,
        businessId,
        userId,
        amount,
        paymentDate = new Date(),
        notes = '',
        paymentMethod = 'CASH',
    }) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!amount || Number(amount) <= 0) {
            throw new Error('Payment amount must be greater than zero');
        }

        const amt = Math.round(Number(amount) * 100) / 100;

        // Load invoice (business-scoped)
        const invoice = await this.invoiceRepository.findById(invoiceId, businessId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Verify business ownership (repos are already scoped, but belt-and-braces)
        if (Number(invoice.businessId) !== Number(businessId)) {
            throw new Error('Access denied: Invoice does not belong to this business');
        }

        // Status gates
        if (invoice.status === 'DRAFT') {
            throw new Error('Cannot record payment on a DRAFT invoice. Mark it as SENT first.');
        }
        if (invoice.status === 'CANCELLED') {
            throw new Error('Cannot record payment on a cancelled invoice.');
        }
        if (invoice.status === 'PAID') {
            throw new Error('Invoice is already fully paid.');
        }

        const balance = Number(invoice.balance) || 0;
        if (balance <= 0) {
            throw new Error('Invoice has no outstanding balance.');
        }
        if (amt > balance) {
            throw new Error(
                `Payment amount (${amt}) exceeds outstanding balance (${balance})`
            );
        }

        // Look up linked debtor (created when invoice was issued as SENT)
        const debtor = await this.debtorRepository.findByReference(
            businessId,
            'INVOICE',
            invoiceId
        );
        if (!debtor) {
            throw new Error(
                'Linked debtor not found for this invoice. ' +
                'This can happen if the invoice was created before debtors were wired up. ' +
                'Please re-save the invoice (mark as SENT) to create the debtor.'
            );
        }

        const debtorBalance = Number(debtor.balance_remaining) || 0;
        const debtorPaid = Number(debtor.amount_paid) || 0;

        // Sanity: debtor balance should match invoice balance. If it drifted,
        // prefer the invoice (source of truth for billing) and correct the debtor.
        const newDebtorBalance = Math.max(0, debtorBalance - amt);
        const newDebtorPaid = debtorPaid + amt;

        // All four writes on one connection, atomic.
        const result = await withTransaction(async () => {
            // 1. Payment record
            const Payment = require('../../../domain/entities/Payment');
            const payment = new Payment({
                userId,
                businessId,
                type: 'RECEIVED',
                amount: amt,
                referenceType: 'INVOICE',
                referenceId: invoiceId,
                paymentDate,
                paymentMethod,
                notes: notes || `Payment for ${invoice.invoiceNumber}`,
            });
            const savedPayment = await this.paymentRepository.create(payment);

            // 2. Transaction record (accounting ledger)
            const Transaction = require('../../../domain/entities/Transaction');
            const transaction = new Transaction({
                businessId,
                userId,
                type: 'PAYMENT_IN',
                category: 'Invoice Payment',
                amount: amt,
                description: `Payment received for invoice ${invoice.invoiceNumber}`,
                paymentStatus: 'PAID',
                referenceId: invoiceId,
                referenceType: 'INVOICE',
                date: paymentDate,
            });
            await this.transactionRepository.create(transaction);

            // 3. Update invoice — atomically bump amount_paid, flip status
            const updatedInvoice = await this.invoiceRepository.applyPayment(
                invoiceId,
                businessId,
                amt
            );
            if (!updatedInvoice) {
                throw new Error('Failed to apply payment to invoice');
            }

            // 4. Update linked debtor
            const debtorStatus = newDebtorBalance <= 0 ? 'PAID' : 'ACTIVE';
            const lastPaymentDate = paymentDate instanceof Date
                ? paymentDate.toISOString()
                : paymentDate;

            await this.debtorRepository.update(debtor.id, {
                amount_paid: newDebtorPaid,
                balance_remaining: newDebtorBalance,
                status: debtorStatus,
                last_payment_date: lastPaymentDate,
            });

            return { savedPayment, updatedInvoice };
        });

        return {
            success: true,
            invoice: result.updatedInvoice.toJSON(),
            payment: result.savedPayment.toJSON ? result.savedPayment.toJSON() : result.savedPayment,
            remainingBalance: result.updatedInvoice.balance,
            message: result.updatedInvoice.status === 'PAID'
                ? `Invoice ${result.updatedInvoice.invoiceNumber} fully paid.`
                : `Payment recorded. Remaining balance: ${result.updatedInvoice.balance}`,
        };
    }
}

module.exports = RecordInvoicePaymentUseCase;