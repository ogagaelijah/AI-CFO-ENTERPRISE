// src/application/ports/repositories/IExpenseRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * Expense Repository Interface
 * Defines the contract for Expense data operations
 */
class IExpenseRepository extends IBaseRepository {
    async findByBusinessId(businessId) { throw new Error('Method not implemented'); }
    async findByDateRange(businessId, startDate, endDate) { throw new Error('Method not implemented'); }
    async findByCategory(businessId, category) { throw new Error('Method not implemented'); }
    async getTodayExpenses(businessId) { throw new Error('Method not implemented'); }
    async getExpenseSummary(businessId) { throw new Error('Method not implemented'); }
}

module.exports = IExpenseRepository;