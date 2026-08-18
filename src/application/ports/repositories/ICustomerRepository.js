// src/application/ports/repositories/ICustomerRepository.js

class ICustomerRepository {
    /**
     * Create a new customer
     * @param {Object} customerData - Customer entity data
     * @returns {Promise<Object>} Created customer
     */
    async create(customerData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find customer by ID
     * @param {string|number} id - Customer ID
     * @returns {Promise<Object|null>} Customer or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find customers by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, search }
     * @returns {Promise<Array>} Array of customers
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find customer by name
     * @param {string|number} businessId - Business ID
     * @param {string} name - Customer name
     * @returns {Promise<Object|null>} Customer or null
     */
    async findByName(businessId, name) {
        throw new Error('Method not implemented');
    }

    /**
     * Find customers by type
     * @param {string|number} businessId - Business ID
     * @param {string} type - CUSTOMER, PATIENT, CLIENT, TENANT, STUDENT
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of customers
     */
    async findByType(businessId, type, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Search customers
     * @param {string|number} businessId - Business ID
     * @param {string} searchTerm - Search term
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of customers
     */
    async search(businessId, searchTerm, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a customer
     * @param {string|number} id - Customer ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated customer
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a customer
     * @param {string|number} id - Customer ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Count customers by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, search }
     * @returns {Promise<number>} Count of customers
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get customer history summary
     * @param {string|number} customerId - Customer ID
     * @param {Object} options - { startDate, endDate }
     * @returns {Promise<Object>} Summary with total sales, payments, etc.
     */
    async getHistory(customerId, options = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = ICustomerRepository;