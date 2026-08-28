// src/application/useCases/customers/UpdateCustomerUseCase.js

class UpdateCustomerUseCase {
    constructor({ customerRepository }) {
        this.customerRepository = customerRepository;
    }

    async execute({
        id,
        businessId,
        name,
        phone,
        email,
        address,
        type,
        taxId,
        notes,
        metadata,
    }) {
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

        // If name is being changed, check for duplicates
        if (name && name.trim() !== existingCustomer.name) {
            const trimmedName = name.trim();
            const existingCustomers = await this.customerRepository.findByBusinessId(businessId, {
                search: trimmedName,
                limit: 10,
            });

            const duplicate = existingCustomers && existingCustomers.length > 0
                ? existingCustomers.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== id)
                : null;

            if (duplicate) {
                throw new Error(`Customer "${trimmedName}" already exists in this business`);
            }
        }

        const updateData = {
            name: name ? name.trim() : existingCustomer.name,
            phone: phone !== undefined ? phone : existingCustomer.phone,
            email: email !== undefined ? email : existingCustomer.email,
            address: address !== undefined ? address : existingCustomer.address,
            type: type || existingCustomer.type,
            taxId: taxId !== undefined ? taxId : existingCustomer.taxId,
            notes: notes !== undefined ? notes : existingCustomer.notes,
            metadata: metadata || existingCustomer.metadata,
        };

        const updated = await this.customerRepository.update(id, updateData);

        return {
            success: true,
            customer: updated.toJSON ? updated.toJSON() : updated,
            message: 'Customer updated successfully',
        };
    }
}

module.exports = UpdateCustomerUseCase;