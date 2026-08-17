// src/application/ports/repositories/ISaleRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * Sale Repository Interface
 * Defines the contract for Sale data operations
 */
class ISaleRepository extends IBaseRepository {
    async findByBusinessId(businessId) { throw new Error('Method not implemented'); }
    async findByDateRange(businessId, startDate, endDate) { throw new Error('Method not implemented'); }
    async findByCustomerName(businessId, customerName) { throw new Error('Method not implemented'); }
    async getTodaySales(businessId) { throw new Error('Method not implemented'); }
    async getSalesSummary(businessId) { throw new Error('Method not implemented'); }
    async recordPayment(saleId, amount) { throw new Error('Method not implemented'); }
}

module.exports = ISaleRepository;