// src/application/useCases/inventory/AddStockUseCase.js

class AddStockUseCase {
    constructor(inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    async execute({
        userId,
        itemName,
        quantity,
        costPrice,
        sellingPrice,
        reorderLevel = 5,
    }) {
        // Validate input
        if (!itemName || itemName.length < 2) {
            throw new Error('Item name must be at least 2 characters');
        }
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
        }
        if (costPrice < 0) {
            throw new Error('Cost price cannot be negative');
        }
        if (sellingPrice < 0) {
            throw new Error('Selling price cannot be negative');
        }

        // ✅ Check if item already exists
        const existing = await this.inventoryRepository.findByNameIgnoreCase(userId, itemName);

        if (existing) {
            const newQuantity = existing.quantity + quantity;
            const updated = await this.inventoryRepository.update(existing.id, {
                quantity: newQuantity,
                cost_price: costPrice,
                selling_price: sellingPrice,
                reorder_level: reorderLevel || existing.reorder_level,
            });
            return updated;
        }

        const inventoryData = {
            user_id: userId,
            item_name: itemName,
            quantity: quantity,
            cost_price: costPrice,
            selling_price: sellingPrice,
            reorder_level: reorderLevel || 5,
        };

        return await this.inventoryRepository.create(inventoryData);
    }
}

module.exports = AddStockUseCase;