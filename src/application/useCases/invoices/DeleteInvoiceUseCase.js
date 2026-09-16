// src/application/useCases/invoices/DeleteInvoiceUseCase.js

class DeleteInvoiceUseCase {
    constructor({ invoiceRepository }) {
        this.invoiceRepository = invoiceRepository;
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

        const deleted = await this.invoiceRepository.delete(invoiceId, businessId);
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