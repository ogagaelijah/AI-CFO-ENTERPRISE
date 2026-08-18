// src/application/useCases/inventory/GetInventoryValueUseCase.js

class GetInventoryValueUseCase {
    constructor({ inventoryRepository }) {
        this.inventoryRepository = inventoryRepository;
    }

    async execute({ businessId }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Get all inventory items
        const items = await this.inventoryRepository.findByBusinessId(businessId);

        // Calculate totals
        let totalCostValue = 0;
        let totalSellingValue = 0;
        let totalProfit = 0;
        let totalUnits = 0;

        for (const item of items) {
            const quantity = item.quantity || 0;
            const costPrice = item.costPrice || 0;
            const sellingPrice = item.sellingPrice || 0;

            totalCostValue += quantity * costPrice;
            totalSellingValue += quantity * sellingPrice;
            totalProfit += quantity * (sellingPrice - costPrice);
            totalUnits += quantity;
        }

        const margin = totalCostValue > 0 ? ((totalProfit / totalCostValue) * 100) : 0;

        return {
            success: true,
            totalItems: items.length,
            totalUnits,
            totalCostValue,
            totalSellingValue,
            totalProfit,
            margin: margin.toFixed(1) + '%',
            items: items.map(item => ({
                ...item.toJSON(),
                totalCost: (item.quantity || 0) * (item.costPrice || 0),
                totalSelling: (item.quantity || 0) * (item.sellingPrice || 0),
                profit: (item.quantity || 0) * ((item.sellingPrice || 0) - (item.costPrice || 0)),
            })),
        };
    }
}

module.exports = GetInventoryValueUseCase;