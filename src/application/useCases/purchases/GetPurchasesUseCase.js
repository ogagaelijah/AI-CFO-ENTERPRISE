// src/application/useCases/purchases/GetPurchasesUseCase.js

class GetPurchasesUseCase {
    constructor({ purchaseRepository }) {
        this.purchaseRepository = purchaseRepository;
    }

    async execute({ businessId, limit = 50, offset = 0, status = null }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const purchases = await this.purchaseRepository.findByBusinessId(
            businessId,
            limit,
            offset,
            status
        );

        const total = await this.purchaseRepository.countByBusinessId(
            businessId,
            status
        );

        return {
            success: true,
            purchases: purchases.map(p => p.toJSON()),
            total,
            limit,
            offset,
            hasMore: offset + purchases.length < total,
        };
    }
}

module.exports = GetPurchasesUseCase;