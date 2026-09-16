// src/application/useCases/invoices/GetInvoicesUseCase.js

class GetInvoicesUseCase {
    constructor({ invoiceRepository }) {
        this.invoiceRepository = invoiceRepository;
    }

    async execute({
        businessId,
        status = null,
        customerId = null,
        projectId = null,
        fromDate = null,
        toDate = null,
        search = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const invoices = await this.invoiceRepository.findByBusinessId(businessId, {
            status,
            customerId,
            projectId,
            fromDate,
            toDate,
            search,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.invoiceRepository.countByBusinessId(businessId, {
            status,
            customerId,
            projectId,
        });

        const summary = await this.invoiceRepository.getSummary(businessId);

        return {
            success: true,
            invoices: invoices.map((i) => i.toJSON()),
            summary,
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + invoices.length < total,
            },
        };
    }
}

module.exports = GetInvoicesUseCase;