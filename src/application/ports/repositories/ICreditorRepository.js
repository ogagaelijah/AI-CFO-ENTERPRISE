// src/application/ports/repositories/ICreditorRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * Creditor Repository Interface
 * Defines the contract for Creditor data operations
 */
class ICreditorRepository extends IBaseRepository {
    async findByBusinessId(businessId) { throw new Error('Method not implemented'); }
    async findBySupplierName(businessId, supplierName) { throw new Error('Method not implemented'); }
    async findByStatus(businessId, status) { throw new Error('Method not implemented'); }
    async findActive(businessId) { throw new Error('Method not implemented'); }
    async findOverdue(businessId) { throw new Error('Method not implemented'); }
    async recordPayment(creditorId, amount) { throw new Error('Method not implemented'); }
    async getSummary(businessId) { throw new Error('Method not implemented'); }
}

module.exports = ICreditorRepository;