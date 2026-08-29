// src/application/useCases/inventory/UpdateInventoryItemUseCase.js

/**
 * Update Inventory Item Use Case
 *
 * Updates an existing inventory item's details.
 * Fields: item_name, cost_price, selling_price, reorder_level
 */
class UpdateInventoryItemUseCase {
    constructor({ inventoryRepository }) {
        this.inventoryRepository = inventoryRepository;
    }

    async execute({
        userId,
        id,
        name = null,
        costPrice = null,
        sellingPrice = null,
        reorderLevel = null,
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

        // Build update data
        const updateData = {};

        if (name !== null && name.trim() !== '') {
            // Check for duplicate name
            const duplicate = await this.inventoryRepository.findByNameIgnoreCase(userId, name.trim());
            if (duplicate && duplicate.id !== id) {
                throw new Error(`Item "${name}" already exists in inventory`);
            }
            updateData.item_name = name.trim();
        }

        if (costPrice !== null) {
            if (costPrice < 0) {
                throw new Error('Cost price cannot be negative');
            }
            updateData.cost_price = costPrice;
        }

        if (sellingPrice !== null) {
            if (sellingPrice < 0) {
                throw new Error('Selling price cannot be negative');
            }
            updateData.selling_price = sellingPrice;
        }

        if (reorderLevel !== null) {
            if (reorderLevel < 0) {
                throw new Error('Reorder level cannot be negative');
            }
            updateData.reorder_level = reorderLevel;
        }

        if (Object.keys(updateData).length === 0) {
            throw new Error('No fields to update');
        }

        // Update the item
        const updatedItem = await this.inventoryRepository.update(id, updateData);

        return {
            success: true,
            inventoryItem: updatedItem,
            message: 'Inventory item updated successfully',
        };
    }
}

module.exports = UpdateInventoryItemUseCase;