// src/application/useCases/customers/CreateCustomerUseCase.js

class CreateCustomerUseCase {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({
        businessId,
        name,
        phone = null,
        email = null,
        address = null,
        type = 'CUSTOMER', // CUSTOMER, PATIENT, CLIENT, TENANT, STUDENT
        taxId = null,
        notes = '',
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!name || name.trim().length === 0) {
            throw new Error('Customer name is required');
        }

        // Validate type
        const validTypes = ['CUSTOMER', 'PATIENT', 'CLIENT', 'TENANT', 'STUDENT'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Check for duplicate customer (same name and business)
        const existingCustomer = await this.customerRepository.findByName(
            businessId,
            name.trim()
        );

        if (existingCustomer) {
            throw new Error(`Customer "${name}" already exists in this business`);
        }

        // Create customer
        const Customer = require('../../../domain/entities/Customer');
        const customer = new Customer({
            businessId,
            name: name.trim(),
            phone,
            email,
            address,
            type,
            taxId,
            notes,
            metadata,
        });

        const savedCustomer = await this.customerRepository.create(customer);

        return {
            success: true,
            customer: savedCustomer.toJSON(),
            message: 'Customer created successfully',
        };
    }
}

module.exports = CreateCustomerUseCase;