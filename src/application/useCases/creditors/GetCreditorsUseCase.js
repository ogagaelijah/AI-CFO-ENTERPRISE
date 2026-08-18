// src/application/useCases/creditors/GetCreditorsUseCase.js

class GetCreditorsUseCase {
    constructor({ creditorRepository }) {
        this.creditorRepository = creditorRepository;
    }

    async execute({
        businessId,
        limit = 50,
        offset = 0,
        status = null, // 'ACTIVE', 'PAID', 'OVERDUE'
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const creditors = await this.creditorRepository.findByFilters({
            businessId,
            status,
            limit,
            offset,
        });

        const total = await this.creditorRepository.countByFilters({
            businessId,
            status,
        });

        // Calculate total outstanding
        const totalOutstanding = creditors
            .filter(c => c.status !== 'PAID')
            .reduce((sum, c) => sum + c.balanceRemaining, 0);

        return {
            success: true,
            creditors: creditors.map(c => c.toJSON()),
            total,
            totalOutstanding,
            limit,
            offset,
            hasMore: offset + creditors.length < total,
        };
    }
}

module.exports = GetCreditorsUseCase;