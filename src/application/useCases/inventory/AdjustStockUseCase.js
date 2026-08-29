// src/application/useCases/inventory/AdjustStockUseCase.js

/**
 * Adjust Stock Use Case
 *
 * Manually adjusts inventory stock levels.
 * Used for: stock count corrections, damaged goods, returns, etc.
 *
 * IMPORTANT: This is for MANUAL adjustments only.
 * Automatic stock changes (Purchase → IN, Sale → OUT) are handled by the Transaction Engine.
 */
class AdjustStockUseCase {
    constructor({ inventoryRepository }) {
        this.inventoryRepository = inventoryRepository;
    }

    async execute({
        userId,
        inventoryItemId,
        adjustment, // Positive = add stock, Negative = remove stock
        reason = '',
        notes = '',
    }) {
        // Validate
        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!inventoryItemId) {
            throw new Error('Inventory item ID is required');
        }

        if (adjustment === undefined || adjustment === null) {
            throw new Error('Adjustment amount is required');
        }

        if (adjustment === 0) {
            throw new Error('Adjustment cannot be zero');
        }

        // Check if item exists
        const existingItem = await this.inventoryRepository.findById(inventoryItemId);
        if (!existingItem) {
            throw new Error(`Inventory item with ID ${inventoryItemId} not found`);
        }

        // Verify ownership
        if (existingItem.user_id !== userId) {
            throw new Error('Access denied');
        }

        // Calculate new quantity
        const currentQuantity = existingItem.quantity || 0;
        const newQuantity = currentQuantity + adjustment;

        if (newQuantity < 0) {
            throw new Error(
                `Cannot adjust stock. Current quantity: ${currentQuantity}, ` +
                `Adjustment: ${adjustment} would result in negative stock.`
            );
        }

        // Update inventory
        const updatedItem = await this.inventoryRepository.update(inventoryItemId, {
            quantity: newQuantity,
        });

        return {
            success: true,
            inventoryItem: updatedItem,
            previousQuantity: currentQuantity,
            newQuantity: newQuantity,
            adjustment: adjustment,
            message: `Stock adjusted by ${adjustment} (${adjustment > 0 ? 'added' : 'removed'})`,
        };
    }
}

module.exports = AdjustStockUseCase;