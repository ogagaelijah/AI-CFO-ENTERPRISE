// src/application/useCases/customers/GetCustomerUseCase.js

class GetCustomerUseCase {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({ customerId, businessId }) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const customer = await this.customerRepository.findById(customerId);
        
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Verify customer belongs to this business
        if (customer.businessId !== businessId) {
            throw new Error('Access denied');
        }

        return {
            success: true,
            customer: customer.toJSON ? customer.toJSON() : customer,
        };
    }
}

module.exports = GetCustomerUseCase;