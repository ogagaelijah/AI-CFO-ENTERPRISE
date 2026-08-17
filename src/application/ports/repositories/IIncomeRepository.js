// src/application/ports/repositories/IIncomeRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * Income Repository Interface
 * Defines the contract for Income data operations
 */
class IIncomeRepository extends IBaseRepository {
    async findByBusinessId(businessId) { throw new Error('Method not implemented'); }
    async findByDateRange(businessId, startDate, endDate) { throw new Error('Method not implemented'); }
    async findByCategory(businessId, category) { throw new Error('Method not implemented'); }
    async getTodayIncome(businessId) { throw new Error('Method not implemented'); }
    async getIncomeSummary(businessId) { throw new Error('Method not implemented'); }
}

module.exports = IIncomeRepository;