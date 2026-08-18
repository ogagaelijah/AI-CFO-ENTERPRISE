// src/application/ports/repositories/IReportRepository.js

class IReportRepository {
    /**
     * Create a new report
     * @param {Object} reportData - Report entity data
     * @returns {Promise<Object>} Created report
     */
    async create(reportData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find report by ID
     * @param {string|number} id - Report ID
     * @returns {Promise<Object|null>} Report or null
     */
    async findById(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Find reports by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, startDate, endDate }
     * @returns {Promise<Array>} Array of reports
     */
    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find reports by type
     * @param {string|number} businessId - Business ID
     * @param {string} type - DAILY, WEEKLY, MONTHLY, YEARLY, EXECUTIVE
     * @param {Object} options - { limit, offset, startDate, endDate }
     * @returns {Promise<Array>} Array of reports
     */
    async findByType(businessId, type, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find latest report by type
     * @param {string|number} businessId - Business ID
     * @param {string} type - DAILY, WEEKLY, MONTHLY, YEARLY, EXECUTIVE
     * @returns {Promise<Object|null>} Latest report or null
     */
    async findLatestByType(businessId, type) {
        throw new Error('Method not implemented');
    }

    /**
     * Update a report
     * @param {string|number} id - Report ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated report
     */
    async update(id, data) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a report
     * @param {string|number} id - Report ID
     * @returns {Promise<boolean>} True if deleted
     */
    async delete(id) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete old reports (cleanup)
     * @param {string|number} businessId - Business ID
     * @param {number} daysToKeep - Days to keep
     * @returns {Promise<number>} Number of deleted reports
     */
    async deleteOldReports(businessId, daysToKeep) {
        throw new Error('Method not implemented');
    }
}

module.exports = IReportRepository;