// src/application/useCases/invoices/GetInvoiceUseCase.js

class GetInvoiceUseCase {
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

        const invoice = await this.invoiceRepository.findById(invoiceId, businessId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        return {
            success: true,
            invoice: invoice.toJSON(),
        };
    }
}

module.exports = GetInvoiceUseCase;