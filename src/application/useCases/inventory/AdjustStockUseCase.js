// src/application/useCases/inventory/AdjustStockUseCase.js

class AdjustStockUseCase {
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
        newQuantity,
        reason = 'Manual adjustment',
        notes = '',
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!inventoryItemId) {
            throw new Error('Inventory item ID is required');
        }

        if (newQuantity === undefined || newQuantity === null) {
            throw new Error('New quantity is required');
        }

        if (newQuantity < 0) {
            throw new Error('Quantity cannot be negative');
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

        // Record previous quantity
        const previousQuantity = item.quantity;
        const quantityChange = newQuantity - previousQuantity;

        // Update quantity
        item.setQuantity(newQuantity);
        await this.inventoryRepository.update(item.id, item);

        // Record inventory transaction
        const InventoryTransaction = require('../../../domain/entities/InventoryTransaction');
        const transaction = new InventoryTransaction({
            inventoryItemId: item.id,
            businessId,
            type: 'ADJUSTMENT',
            quantity: quantityChange,
            previousQuantity,
            newQuantity: item.quantity,
            referenceType: 'ADJUSTMENT',
            referenceId: null,
            reason,
            notes,
        });

        await this.inventoryTransactionRepository.create(transaction);

        return {
            success: true,
            item: item.toJSON(),
            previousQuantity,
            newQuantity: item.quantity,
            quantityChange,
            isLowStock: item.isLowStock(),
            isOutOfStock: item.isOutOfStock(),
            message: `Adjusted from ${previousQuantity} to ${newQuantity} units`,
        };
    }
}

module.exports = AdjustStockUseCase;