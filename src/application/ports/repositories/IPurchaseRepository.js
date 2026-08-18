// src/application/ports/repositories/IPurchaseRepository.js

class IPurchaseRepository {
    /**
     * Create a new purchase
     * @param {Object} purchaseData - Purchase entity data
     * @returns {Promise<Object>} Created purchase
     */
    async create(purchaseData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find purchase by ID
     * @param {string|number} id - Purchase ID
     * @returns {Promise<Object|null>} Purchase or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find purchases by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, status, startDate, endDate }
     * @returns {Promise<Array>} Array of purchases
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find purchases by date range
     * @param {string|number} businessId - Business ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - { limit, offset, status }
     * @returns {Promise<Array>} Array of purchases
     */
    async findByDateRange(businessId, startDate, endDate, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find purchases by supplier
     * @param {string|number} businessId - Business ID
     * @param {string|number} supplierId - Supplier ID
     * @param {Object} options - { limit, offset, status }
     * @returns {Promise<Array>} Array of purchases
     */
    async findBySupplier(businessId, supplierId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find purchases by project
     * @param {string|number} businessId - Business ID
     * @param {string|number} projectId - Project ID
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of purchases
     */
    async findByProjectId(businessId, projectId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a purchase
     * @param {string|number} id - Purchase ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated purchase
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a purchase
     * @param {string|number} id - Purchase ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Count purchases by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { status, startDate, endDate }
     * @returns {Promise<number>} Count of purchases
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get purchase summary by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { startDate, endDate }
     * @returns {Promise<Object>} Summary with totals by status
     */
    async getSummary(businessId, options = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = IPurchaseRepository;