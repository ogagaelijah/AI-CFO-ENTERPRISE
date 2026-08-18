// src/application/ports/repositories/ITransactionRepository.js

class ITransactionRepository {
    /**
     * Create a new transaction
     * @param {Object} transactionData - Transaction entity data
     * @returns {Promise<Object>} Created transaction
     */
    async create(transactionData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find transaction by ID
     * @param {string|number} id - Transaction ID
     * @returns {Promise<Object|null>} Transaction or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, startDate, endDate }
     * @returns {Promise<Array>} Array of transactions
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find transactions by date range
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
     * Find transactions by reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - SALE, INCOME, PURCHASE, EXPENSE, DEBTOR, CREDITOR
     * @param {string|number} referenceId - Reference ID
     * @returns {Promise<Array>} Array of transactions
     */
    async findByReference(businessId, referenceType, referenceId) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a transaction
     * @param {string|number} id - Transaction ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated transaction
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a transaction
     * @param {string|number} id - Transaction ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Count transactions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, startDate, endDate }
     * @returns {Promise<number>} Count of transactions
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get transaction summary by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { startDate, endDate }
     * @returns {Promise<Object>} Summary with totals by type
     */
    async getSummary(businessId, options = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = ITransactionRepository;