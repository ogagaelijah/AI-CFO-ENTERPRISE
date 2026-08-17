// src/application/useCases/inventory/AddStockUseCase.js

class AddStockUseCase {
    constructor(inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    async execute({ userId, itemName, quantity, costPrice, sellingPrice }) {
        // Check if item exists
        const existing = await this.inventoryRepository.findByName(userId, itemName);

        if (existing) {
            // Update existing item
            const newQuantity = existing.quantity + quantity;
            return await this.inventoryRepository.update(existing.id, {
                quantity: newQuantity,
                cost_price: costPrice || existing.cost_price,
                selling_price: sellingPrice || existing.selling_price,
            });
        } else {
            // Create new item
            return await this.inventoryRepository.create({
                user_id: userId,
                item_name: itemName,
                quantity: quantity,
                cost_price: costPrice || 0,
                selling_price: sellingPrice || 0,
            });
        }
    }
}

module.exports = AddStockUseCase;