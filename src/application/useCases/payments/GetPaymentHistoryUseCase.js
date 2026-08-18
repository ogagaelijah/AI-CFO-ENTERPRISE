// src/application/useCases/payments/GetPaymentHistoryUseCase.js

class GetPaymentHistoryUseCase {
    constructor({ paymentRepository }) {
        this.paymentRepository = paymentRepository;
    }

    async execute({
        businessId,
        limit = 50,
        offset = 0,
        type = null, // 'IN', 'OUT', or null for both
        referenceType = null, // 'DEBTOR', 'CREDITOR', or null for both
        referenceId = null,
        startDate = null,
        endDate = null,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const payments = await this.paymentRepository.findByFilters({
            businessId,
            type,
            referenceType,
            referenceId,
            startDate,
            endDate,
            limit,
            offset,
        });

        const total = await this.paymentRepository.countByFilters({
            businessId,
            type,
            referenceType,
            referenceId,
            startDate,
            endDate,
        });

        // Calculate totals
        const totalIn = payments
            .filter(p => p.type === 'IN')
            .reduce((sum, p) => sum + p.amount, 0);

        const totalOut = payments
            .filter(p => p.type === 'OUT')
            .reduce((sum, p) => sum + p.amount, 0);

        return {
            success: true,
            payments: payments.map(p => p.toJSON()),
            total,
            totalIn,
            totalOut,
            netFlow: totalIn - totalOut,
            limit,
            offset,
            hasMore: offset + payments.length < total,
        };
    }
}

module.exports = GetPaymentHistoryUseCase;