// src/application/useCases/customers/DeleteCustomerUseCase.js

class DeleteCustomerUseCase {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({ id, businessId }) {
        if (!id) {
            throw new Error('Customer ID is required');
        }

        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Check if customer exists
        const existingCustomer = await this.customerRepository.findById(id);
        if (!existingCustomer) {
            throw new Error('Customer not found');
        }

        // Verify customer belongs to this business
        if (existingCustomer.businessId !== businessId) {
            throw new Error('Access denied');
        }

        const deleted = await this.customerRepository.delete(id);

        if (!deleted) {
            throw new Error('Failed to delete customer');
        }

        return {
            success: true,
            message: 'Customer deleted successfully',
        };
    }
}

module.exports = DeleteCustomerUseCase;