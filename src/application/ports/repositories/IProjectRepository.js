// src/application/ports/repositories/IProjectRepository.js

class IProjectRepository {
    /**
     * Create a new project
     * @param {Object} projectData - Project entity data
     * @returns {Promise<Object>} Created project
     */
    async create(projectData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find project by ID
     * @param {string|number} id - Project ID
     * @returns {Promise<Object|null>} Project or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find projects by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, status, search }
     * @returns {Promise<Array>} Array of projects
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find projects by status
     * @param {string|number} businessId - Business ID
     * @param {string} status - ACTIVE, COMPLETED, ON_HOLD, CANCELLED
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of projects
     */
    async findByStatus(businessId, status, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find projects by customer
     * @param {string|number} businessId - Business ID
     * @param {string|number} customerId - Customer ID
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of projects
     */
    async findByCustomer(businessId, customerId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Search projects
     * @param {string|number} businessId - Business ID
     * @param {string} searchTerm - Search term
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of projects
     */
    async search(businessId, searchTerm, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a project
     * @param {string|number} id - Project ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated project
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a project
     * @param {string|number} id - Project ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Count projects by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { status, search }
     * @returns {Promise<number>} Count of projects
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get project financial summary
     * @param {string|number} projectId - Project ID
     * @returns {Promise<Object>} Summary with revenue, costs, profit
     */
    async getFinancialSummary(projectId) {
        throw new Error('Method not implemented');
    }
}

module.exports = IProjectRepository;