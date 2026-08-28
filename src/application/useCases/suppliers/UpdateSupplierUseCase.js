// src/application/useCases/suppliers/UpdateSupplierUseCase.js

class UpdateSupplierUseCase {
    constructor({ supplierRepository }) {
        this.supplierRepository = supplierRepository;
    }

    async execute({
        id,
        businessId,
        name,
        phone,
        email,
        address,
        taxId,
        notes,
        metadata,
    }) {
        if (!id) {
            throw new Error('Supplier ID is required');
        }

        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Check if supplier exists
        const existingSupplier = await this.supplierRepository.findById(id);
        if (!existingSupplier) {
            throw new Error('Supplier not found');
        }

        // Verify supplier belongs to this business
        if (existingSupplier.businessId !== businessId) {
            throw new Error('Access denied');
        }

        // If name is being changed, check for duplicates
        if (name && name.trim() !== existingSupplier.name) {
            const duplicate = await this.supplierRepository.findByName(
                businessId,
                name.trim()
            );
            if (duplicate && duplicate.id !== id) {
                throw new Error(`Supplier "${name}" already exists`);
            }
        }

        const updateData = {
            name: name || existingSupplier.name,
            phone: phone !== undefined ? phone : existingSupplier.phone,
            email: email !== undefined ? email : existingSupplier.email,
            address: address !== undefined ? address : existingSupplier.address,
            taxId: taxId !== undefined ? taxId : existingSupplier.taxId,
            notes: notes !== undefined ? notes : existingSupplier.notes,
            metadata: metadata || existingSupplier.metadata,
        };

        const updated = await this.supplierRepository.update(id, updateData);

        return {
            success: true,
            supplier: updated.toJSON ? updated.toJSON() : updated,
            message: 'Supplier updated successfully',
        };
    }
}

module.exports = UpdateSupplierUseCase;