// src/application/useCases/suppliers/CreateSupplierUseCase.js

class CreateSupplierUseCase {
    constructor({ supplierRepository }) {
        this.supplierRepository = supplierRepository;
    }

    async execute({
        businessId,
        name,
        phone = null,
        email = null,
        address = null,
        taxId = null,
        notes = '',
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!name || name.trim().length === 0) {
            throw new Error('Supplier name is required');
        }

        // Check for duplicate supplier (same name and business)
        const existingSupplier = await this.supplierRepository.findByName(
            businessId,
            name.trim()
        );

        if (existingSupplier) {
            throw new Error(`Supplier "${name}" already exists in this business`);
        }

        // Create supplier
        const Supplier = require('../../../domain/entities/Supplier');
        const supplier = new Supplier({
            businessId,
            name: name.trim(),
            phone,
            email,
            address,
            taxId,
            notes,
            metadata,
        });

        const savedSupplier = await this.supplierRepository.create(supplier);

        return {
            success: true,
            supplier: savedSupplier.toJSON(),
            message: 'Supplier created successfully',
        };
    }
}

module.exports = CreateSupplierUseCase;