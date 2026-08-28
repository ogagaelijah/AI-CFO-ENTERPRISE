// src/application/useCases/customers/GetCustomersUseCase.js

class GetCustomersUseCase {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({
        businessId,
        limit = 50,
        offset = 0,
        search = null,
        type = null,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        let customers;

        if (search) {
            customers = await this.customerRepository.search(
                businessId,
                search,
                { limit, offset }
            );
        } else if (type) {
            customers = await this.customerRepository.findByType(
                businessId,
                type,
                { limit, offset }
            );
        } else {
            customers = await this.customerRepository.findByBusinessId(
                businessId,
                { limit, offset }
            );
        }

        // Ensure customers is always an array
        if (!customers) {
            customers = [];
        }

        const total = await this.customerRepository.countByBusinessId(
            businessId,
            search ? { search } : type ? { type } : {}
        );

        return {
            success: true,
            customers: customers.map(c => c.toJSON ? c.toJSON() : c),
            total: total || 0,
            limit,
            offset,
            hasMore: offset + customers.length < (total || 0),
        };
    }
}

module.exports = GetCustomersUseCase;