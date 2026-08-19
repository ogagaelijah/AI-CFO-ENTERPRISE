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
        notes = '',
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!name || name.trim().length === 0) {
            throw new Error('Supplier name is required');
        }

        const trimmedName = name.trim();

        // ✅ Check for duplicate supplier (case-insensitive)
        const existingSuppliers = await this.supplierRepository.findByBusinessId(businessId, {
            search: trimmedName,
            limit: 10,
        });

        const existing = existingSuppliers && existingSuppliers.length > 0
            ? existingSuppliers.find(s => s.name.toLowerCase() === trimmedName.toLowerCase())
            : null;

        if (existing) {
            throw new Error(`Supplier "${trimmedName}" already exists in this business`);
        }

        // ✅ Create supplier using the repository's create method
        // The repository will handle creating the Supplier entity internally
        const supplierData = {
            businessId: businessId,
            name: trimmedName,
            phone: phone || null,
            email: email || null,
            address: address || null,
            notes: notes,
            metadata: metadata,
        };

        const savedSupplier = await this.supplierRepository.create(supplierData);

        return {
            success: true,
            supplier: savedSupplier.toJSON ? savedSupplier.toJSON() : savedSupplier,
            message: 'Supplier created successfully',
        };
    }
}

module.exports = CreateSupplierUseCase;