// src/application/ports/repositories/IBusinessRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * Business Repository Interface
 * Defines the contract for Business data operations
 */
class IBusinessRepository extends IBaseRepository {
    async findByUserId(userId) { throw new Error('Method not implemented'); }
    async findPrimaryByUserId(userId) { throw new Error('Method not implemented'); }
    async nameExistsForUser(userId, name) { throw new Error('Method not implemented'); }
}

module.exports = IBusinessRepository;