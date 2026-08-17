// src/application/ports/repositories/IDebtorRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * Debtor Repository Interface
 * Defines the contract for Debtor data operations
 */
class IDebtorRepository extends IBaseRepository {
    async findByBusinessId(businessId) { throw new Error('Method not implemented'); }
    async findByCustomerName(businessId, customerName) { throw new Error('Method not implemented'); }
    async findByStatus(businessId, status) { throw new Error('Method not implemented'); }
    async findActive(businessId) { throw new Error('Method not implemented'); }
    async findOverdue(businessId) { throw new Error('Method not implemented'); }
    async recordPayment(debtorId, amount) { throw new Error('Method not implemented'); }
    async getSummary(businessId) { throw new Error('Method not implemented'); }
}

module.exports = IDebtorRepository;