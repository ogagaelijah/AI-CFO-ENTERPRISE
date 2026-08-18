// src/application/useCases/customers/GetCustomerUseCase.js

class GetCustomerUseCase {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({ customerId, businessId }) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Verify business ownership
        if (customer.businessId !== businessId) {
            throw new Error('Access denied: Customer does not belong to this business');
        }

        return {
            success: true,
            customer: customer.toJSON(),
        };
    }
}

module.exports = GetCustomerUseCase;