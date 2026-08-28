// src/application/useCases/suppliers/DeleteSupplierUseCase.js

class DeleteSupplierUseCase {
    constructor({ supplierRepository }) {
        this.supplierRepository = supplierRepository;
    }

    async execute({ id, businessId }) {
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

        // TODO: Check if supplier has any purchases before deleting
        // If yes, should we prevent deletion or allow it?

        const deleted = await this.supplierRepository.delete(id);

        if (!deleted) {
            throw new Error('Failed to delete supplier');
        }

        return {
            success: true,
            message: 'Supplier deleted successfully',
        };
    }
}

module.exports = DeleteSupplierUseCase;