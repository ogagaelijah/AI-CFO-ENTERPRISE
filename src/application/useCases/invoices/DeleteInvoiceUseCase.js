// src/application/useCases/invoices/DeleteInvoiceUseCase.js
// v2.0.0-prod — Also removes any linked debtor row (reference_type = 'INVOICE').

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class DeleteInvoiceUseCase {
    constructor({
        invoiceRepository,
        debtorRepository = null,
    }) {
        this.invoiceRepository = invoiceRepository;
        this.debtorRepository = debtorRepository;
    }

    async execute({ invoiceId, businessId }) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.invoiceRepository.findById(invoiceId, businessId);
        if (!existing) {
            throw new Error('Invoice not found');
        }

        // Verify business ownership (repos are already scoped, but belt-and-braces)
        if (Number(existing.businessId) !== Number(businessId)) {
            throw new Error('Access denied: Invoice does not belong to this business');
        }

        // Cannot delete an invoice that has any payment recorded.
        if (existing.amountPaid > 0) {
            throw new Error(
                'Cannot delete an invoice that has recorded payments. Cancel it instead.'
            );
        }

        // Only DRAFT invoices may be hard-deleted. SENT/PAID/CANCELLED stay.
        if (existing.status !== 'DRAFT') {
            throw new Error(
                `Only DRAFT invoices can be deleted. This invoice is ${existing.status}.`
            );
        }

        // Atomic: delete invoice + (if a linked debtor exists) delete debtor.
        // In practice, a DRAFT invoice never had a debtor created (debtor is
        // created on SENT). But if state drifted, we clean up both rows
        // together so we never leave an orphan.
        const deleted = await withTransaction(async () => {
            if (this.debtorRepository) {
                await this.debtorRepository.deleteByReference(
                    businessId,
                    'INVOICE',
                    invoiceId
                );
            }

            const ok = await this.invoiceRepository.delete(invoiceId, businessId);
            if (!ok) {
                throw new Error('Failed to delete invoice');
            }
            return true;
        });

        if (!deleted) {
            throw new Error('Failed to delete invoice');
        }

        return {
            success: true,
            message: 'Invoice deleted successfully',
        };
    }
}

module.exports = DeleteInvoiceUseCase;