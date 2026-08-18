// src/application/ports/repositories/ISubscriptionRepository.js

class ISubscriptionRepository {
    /**
     * Create a new subscription
     * @param {Object} subscriptionData - Subscription entity data
     * @returns {Promise<Object>} Created subscription
     */
    async create(subscriptionData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find subscription by ID
     * @param {string|number} id - Subscription ID
     * @returns {Promise<Object|null>} Subscription or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find active subscription by business ID
     * @param {string|number} businessId - Business ID
     * @returns {Promise<Object|null>} Active subscription or null
     */
    async findActiveByBusinessId(businessId) {
        throw new Error('Method not implemented');
    }

    /**
     * Find subscriptions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, status }
     * @returns {Promise<Array>} Array of subscriptions
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find subscriptions by plan ID
     * @param {string} planId - Plan ID (free, pro, business)
     * @param {Object} options - { limit, offset, status }
     * @returns {Promise<Array>} Array of subscriptions
     */
    async findByPlanId(planId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find expired subscriptions
     * @param {Date} beforeDate - Expiry before this date
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of expired subscriptions
     */
    async findExpired(beforeDate, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a subscription
     * @param {string|number} id - Subscription ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated subscription
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a subscription
     * @param {string|number} id - Subscription ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Count subscriptions by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { status, planId }
     * @returns {Promise<number>} Count of subscriptions
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = ISubscriptionRepository;