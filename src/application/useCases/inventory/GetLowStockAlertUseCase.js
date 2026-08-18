// src/application/useCases/inventory/GetLowStockAlertUseCase.js

class GetLowStockAlertUseCase {
    constructor({ inventoryRepository }) {
        this.inventoryRepository = inventoryRepository;
    }

    async execute({
        businessId,
        threshold = null, // If null, uses item's reorderLevel
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Get all inventory items
        const items = await this.inventoryRepository.findByBusinessId(businessId);

        // Filter low stock items
        const lowStockItems = items.filter(item => {
            if (threshold !== null) {
                return item.quantity <= threshold;
            }
            return item.isLowStock();
        });

        // Sort by quantity (lowest first)
        lowStockItems.sort((a, b) => a.quantity - b.quantity);

        // Categorize
        const outOfStock = lowStockItems.filter(item => item.isOutOfStock());
        const critical = lowStockItems.filter(item => !item.isOutOfStock() && item.quantity <= 2);
        const warning = lowStockItems.filter(item => !item.isOutOfStock() && item.quantity > 2);

        return {
            success: true,
            totalLowStock: lowStockItems.length,
            outOfStock: outOfStock.map(item => ({
                ...item.toJSON(),
                status: 'OUT_OF_STOCK',
            })),
            critical: critical.map(item => ({
                ...item.toJSON(),
                status: 'CRITICAL',
            })),
            warning: warning.map(item => ({
                ...item.toJSON(),
                status: 'WARNING',
            })),
            allLowStock: lowStockItems.map(item => ({
                ...item.toJSON(),
                status: item.isOutOfStock()
                    ? 'OUT_OF_STOCK'
                    : item.quantity <= 2
                    ? 'CRITICAL'
                    : 'WARNING',
            })),
        };
    }
}

module.exports = GetLowStockAlertUseCase;