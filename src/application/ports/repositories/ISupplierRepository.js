// src/application/ports/repositories/ISupplierRepository.js

class ISupplierRepository {
    /**
     * Create a new supplier
     * @param {Object} supplierData - Supplier entity data
     * @returns {Promise<Object>} Created supplier
     */
    async create(supplierData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find supplier by ID
     * @param {string|number} id - Supplier ID
     * @returns {Promise<Object|null>} Supplier or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find suppliers by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, search }
     * @returns {Promise<Array>} Array of suppliers
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find supplier by name
     * @param {string|number} businessId - Business ID
     * @param {string} name - Supplier name
     * @returns {Promise<Object|null>} Supplier or null
     */
    async findByName(businessId, name) {
        throw new Error('Method not implemented');
    }

    /**
     * Search suppliers
     * @param {string|number} businessId - Business ID
     * @param {string} searchTerm - Search term
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of suppliers
     */
    async search(businessId, searchTerm, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a supplier
     * @param {string|number} id - Supplier ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated supplier
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a supplier
     * @param {string|number} id - Supplier ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Count suppliers by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { search }
     * @returns {Promise<number>} Count of suppliers
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = ISupplierRepository;