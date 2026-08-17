// src/application/ports/repositories/IBaseRepository.js

/**
 * Base Repository Interface
 * Defines the contract that all repositories must implement
 */
class IBaseRepository {
    async findById(id) { throw new Error('Method not implemented'); }
    async findAll() { throw new Error('Method not implemented'); }
    async save(entity) { throw new Error('Method not implemented'); }
    async update(id, data) { throw new Error('Method not implemented'); }
    async delete(id) { throw new Error('Method not implemented'); }
}

module.exports = IBaseRepository;