// src/application/useCases/suppliers/GetSuppliersUseCase.js

class GetSuppliersUseCase {
    constructor({ supplierRepository }) {
        this.supplierRepository = supplierRepository;
    }

    async execute({
        businessId,
        limit = 50,
        offset = 0,
        search = null,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        let suppliers;

        if (search) {
            suppliers = await this.supplierRepository.search(
                businessId,
                search,
                { limit, offset }
            );
        } else {
            suppliers = await this.supplierRepository.findByBusinessId(
                businessId,
                { limit, offset }
            );
        }

        if (!suppliers) {
            suppliers = [];
        }

        const total = await this.supplierRepository.countByBusinessId(
            businessId,
            search ? { search } : {}
        );

        return {
            success: true,
            suppliers: suppliers.map(s => s.toJSON ? s.toJSON() : s),
            total: total || 0,
            limit,
            offset,
            hasMore: offset + suppliers.length < (total || 0),
        };
    }
}

module.exports = GetSuppliersUseCase;