// src/application/ports/repositories/IInventoryRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * Inventory Repository Interface
 * Defines the contract for Inventory data operations
 */
class IInventoryRepository extends IBaseRepository {
    async findByBusinessId(businessId) { throw new Error('Method not implemented'); }
    async findByName(businessId, itemName) { throw new Error('Method not implemented'); }
    async findLowStock(businessId) { throw new Error('Method not implemented'); }
    async addStock(inventoryId, quantity) { throw new Error('Method not implemented'); }
    async reduceStock(inventoryId, quantity) { throw new Error('Method not implemented'); }
    async getSummary(businessId) { throw new Error('Method not implemented'); }
}

module.exports = IInventoryRepository;