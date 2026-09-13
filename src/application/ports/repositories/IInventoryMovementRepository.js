// src/application/ports/repositories/IInventoryMovementRepository.js
// Port interface for the inventory_movements ledger.
// Full surface: create + read paths used by report services + lookup by reference.

class IInventoryMovementRepository {
    /**
     * Create a new inventory movement.
     * @param {Object} data
     * @param {number} data.inventoryItemId
     * @param {number} data.businessId
     * @param {number} data.userId
     * @param {string} data.movementType  IN | OUT | ADJUSTMENT_IN | ADJUSTMENT_OUT | DAMAGE | LOSS | RETURN | TRANSFER
     * @param {number} data.quantity
     * @param {number} [data.unitCost]
     * @param {number} [data.totalCost]
     * @param {number} [data.quantityBefore]
     * @param {number} [data.quantityAfter]
     * @param {number} [data.costPriceBefore]
     * @param {number} [data.costPriceAfter]
     * @param {string} [data.referenceType]
     * @param {number} [data.referenceId]
     * @param {string} [data.reason]
     * @param {string} [data.notes]
     * @param {Object} [data.metadata]
     * @param {Date}   [data.createdAt]
     * @returns {Promise<Object>} Created movement
     */
    async create(data) {
        throw new Error('Method not implemented');
    }

    async findById(id) {
        throw new Error('Method not implemented');
    }

    async findByInventoryItemId(inventoryItemId, options = {}) {
        throw new Error('Method not implemented');
    }

    async findByBusinessId(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    async findByReference(businessId, referenceType, referenceId) {
        throw new Error('Method not implemented');
    }

    async findByDateRange(businessId, startDate, endDate, options = {}) {
        throw new Error('Method not implemented');
    }

    async getSummary(businessId, options = {}) {
        throw new Error('Method not implemented');
    }

    async countByBusinessId(businessId, filters = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = IInventoryMovementRepository;