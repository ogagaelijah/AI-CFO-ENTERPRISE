// src/application/useCases/inventory/DeleteInventoryItemUseCase.js

/**
 * Delete Inventory Item Use Case
 *
 * Deletes an inventory item from the system.
 *
 * IMPORTANT: This deletes the item record. It does NOT affect existing sales or purchases.
 * WARNING: This action cannot be undone.
 */
class DeleteInventoryItemUseCase {
    constructor({ inventoryRepository }) {
        this.inventoryRepository = inventoryRepository;
    }

    async execute({
        userId,
        id,
        force = false,
    }) {
        // Validate
        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!id) {
            throw new Error('Inventory item ID is required');
        }

        // Check if item exists
        const existingItem = await this.inventoryRepository.findById(id);
        if (!existingItem) {
            throw new Error(`Inventory item with ID ${id} not found`);
        }

        // Verify ownership
        if (existingItem.user_id !== userId) {
            throw new Error('Access denied');
        }

        // Check if there is stock
        const currentQuantity = existingItem.quantity || 0;
        if (currentQuantity > 0 && !force) {
            throw new Error(
                `Cannot delete item "${existingItem.item_name}" because it has ${currentQuantity} units in stock. ` +
                'Either adjust stock to zero first, or use force: true to delete anyway.'
            );
        }

        // Delete the item
        const deleted = await this.inventoryRepository.delete(id);

        if (!deleted) {
            throw new Error('Failed to delete inventory item');
        }

        return {
            success: true,
            message: `Inventory item "${existingItem.item_name}" deleted successfully`,
            itemName: existingItem.item_name,
            itemId: id,
        };
    }
}

module.exports = DeleteInventoryItemUseCase;