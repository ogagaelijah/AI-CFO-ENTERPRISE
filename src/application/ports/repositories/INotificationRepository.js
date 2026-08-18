// src/application/ports/repositories/INotificationRepository.js

class INotificationRepository {
    /**
     * Create a new notification/reminder
     * @param {Object} notificationData - Notification entity data
     * @returns {Promise<Object>} Created notification
     */
    async create(notificationData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find notification by ID
     * @param {string|number} id - Notification ID
     * @returns {Promise<Object|null>} Notification or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find notifications by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, status, startDate, endDate }
     * @returns {Promise<Array>} Array of notifications
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find notifications by reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - DEBTOR, CREDITOR, INVENTORY, etc.
     * @param {string|number} referenceId - Reference ID
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of notifications
     */
    async findByReference(businessId, referenceType, referenceId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find unread notifications
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of unread notifications
     */
    async findUnread(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find last reminder sent for a reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - DEBTOR, CREDITOR, INVENTORY
     * @param {string|number} referenceId - Reference ID
     * @returns {Promise<Object|null>} Last reminder or null
     */
    async findLastReminder(businessId, referenceType, referenceId) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a notification
     * @param {string|number} id - Notification ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated notification
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Mark notification as read
     * @param {string|number} id - Notification ID
     * @returns {Promise<Object>} Updated notification
     */
    async markAsRead(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a notification
     * @param {string|number} id - Notification ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete old notifications (cleanup)
     * @param {string|number} businessId - Business ID
     * @param {number} daysToKeep - Days to keep
     * @returns {Promise<number>} Number of deleted notifications
     */
    async deleteOldNotifications(businessId, daysToKeep) {
        throw new Error('Method not implemented');
    }

    /**
     * Count notifications by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, status, read }
     * @returns {Promise<number>} Count of notifications
     */
    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = INotificationRepository;