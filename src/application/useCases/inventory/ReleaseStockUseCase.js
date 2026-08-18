// src/application/useCases/inventory/ReleaseStockUseCase.js

class ReleaseStockUseCase {
    constructor({
        inventoryRepository,
        inventoryTransactionRepository,
    }) {
        this.inventoryRepository = inventoryRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
    }

    async execute({
        businessId,
        inventoryItemId,
        quantity,
        referenceType = 'SALE',
        referenceId = null,
        reason = '',
        notes = '',
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!inventoryItemId) {
            throw new Error('Inventory item ID is required');
        }

        if (!quantity || quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get inventory item
        const item = await this.inventoryRepository.findById(inventoryItemId);
        if (!item) {
            throw new Error('Inventory item not found');
        }

        // Verify business ownership
        if (item.businessId !== businessId) {
            throw new Error('Access denied: Item does not belong to this business');
        }

        // Check if sufficient stock
        if (item.quantity < quantity) {
            throw new Error(`Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`);
        }

        // Record previous quantity
        const previousQuantity = item.quantity;

        // Remove stock
        item.removeStock(quantity);
        await this.inventoryRepository.update(item.id, item);

        // Record inventory transaction
        const InventoryTransaction = require('../../../domain/entities/InventoryTransaction');
        const transaction = new InventoryTransaction({
            inventoryItemId: item.id,
            businessId,
            type: 'OUT',
            quantity: quantity,
            previousQuantity,
            newQuantity: item.quantity,
            referenceType,
            referenceId,
            reason: reason || `Stock released for ${referenceType}`,
            notes,
        });

        await this.inventoryTransactionRepository.create(transaction);

        return {
            success: true,
            item: item.toJSON(),
            previousQuantity,
            newQuantity: item.quantity,
            releasedQuantity: quantity,
            isLowStock: item.isLowStock(),
            isOutOfStock: item.isOutOfStock(),
            message: `Released ${quantity} units. Remaining: ${item.quantity}`,
        };
    }
}

module.exports = ReleaseStockUseCase;