// src/application/ports/repositories/IInventoryTransactionRepository.js

class IInventoryTransactionRepository {
    /**
     * Create a new inventory transaction
     * @param {Object} transactionData - Inventory transaction entity data
     * @returns {Promise<Object>} Created transaction
     */
    async create(transactionData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find inventory transaction by ID
     * @param {string|number} id - Transaction ID
     * @returns {Promise<Object|null>} Transaction or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find inventory transactions by inventory item ID
     * @param {string|number} inventoryItemId - Inventory item ID
     * @param {Object} options - { limit, offset, type, startDate, endDate }
     * @returns {Promise<Array>} Array of transactions
     */
    async findByInventoryItemId(inventoryItemId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find inventory transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, startDate, endDate }
     * @returns {Promise<Array>} Array of transactions
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find inventory transactions by reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - SALE, PURCHASE, ADJUSTMENT, PRODUCTION
     * @param {string|number} referenceId - Reference ID
     * @returns {Promise<Array>} Array of transactions
     */
    async findByReference(businessId, referenceType, referenceId) {
        throw new Error('Method not implemented');
    }

    /**
     * Find inventory transactions by date range
     * @param {string|number} businessId - Business ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - { type, limit, offset }
     * @returns {Promise<Array>} Array of transactions
     */
    async findByDateRange(businessId, startDate, endDate, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Update an inventory transaction
     * @param {string|number} id - Transaction ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated transaction
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete an inventory transaction
     * @param {string|number} id - Transaction ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Get inventory transaction summary
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { startDate, endDate }
     * @returns {Promise<Object>} Summary with total in/out/adjustment
     */
    async getSummary(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Count inventory transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, startDate, endDate }
     * @returns {Promise<number>} Count of transactions
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = IInventoryTransactionRepository;