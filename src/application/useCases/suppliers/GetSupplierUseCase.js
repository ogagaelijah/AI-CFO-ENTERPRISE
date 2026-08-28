// src/application/useCases/suppliers/GetSupplierUseCase.js

class GetSupplierUseCase {
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

        const supplier = await this.supplierRepository.findById(id);
        
        if (!supplier) {
            throw new Error('Supplier not found');
        }

        if (supplier.businessId !== businessId) {
            throw new Error('Access denied');
        }

        return {
            success: true,
            supplier: supplier.toJSON ? supplier.toJSON() : supplier,
        };
    }
}

module.exports = GetSupplierUseCase;