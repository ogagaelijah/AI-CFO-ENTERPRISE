// src/application/ports/repositories/IPaymentRepository.js

class IPaymentRepository {
    /**
     * Create a new payment
     * @param {Object} paymentData - Payment entity data
     * @returns {Promise<Object>} Created payment
     */
    async create(paymentData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find payment by ID
     * @param {string|number} id - Payment ID
     * @returns {Promise<Object|null>} Payment or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find payments by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, referenceType, referenceId, startDate, endDate }
     * @returns {Promise<Array>} Array of payments
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find payments by reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - DEBTOR, CREDITOR, SALE, PURCHASE, INCOME, EXPENSE
     * @param {string|number} referenceId - Reference ID
     * @returns {Promise<Array>} Array of payments
     */
    async findByReference(businessId, referenceType, referenceId) {
        throw new Error('Method not implemented');
    }

    /**
     * Find payments by date range
     * @param {string|number} businessId - Business ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Object} options - { type, limit, offset }
     * @returns {Promise<Array>} Array of payments
     */
    async findByDateRange(businessId, startDate, endDate, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find payments by filters
     * @param {Object} filters - { businessId, type, referenceType, referenceId, startDate, endDate, limit, offset }
     * @returns {Promise<Array>} Array of payments
     */
    async findByFilters(filters) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a payment
     * @param {string|number} id - Payment ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated payment
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a payment
     * @param {string|number} id - Payment ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Count payments by filters
     * @param {Object} filters - { businessId, type, referenceType, referenceId, startDate, endDate }
     * @returns {Promise<number>} Count of payments
     */
    async countByFilters(filters) {
        throw new Error('Method not implemented');
    }
}

module.exports = IPaymentRepository;