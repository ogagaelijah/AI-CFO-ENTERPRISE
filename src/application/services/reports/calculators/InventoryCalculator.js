// src/application/services/reports/calculators/InventoryCalculator.js

/**
 * InventoryCalculator - Single source of truth for inventory calculations
 *
 * Calculates:
 * - Total inventory value (at cost)
 * - Total selling value
 * - Potential profit
 * - Low stock count + list of low-stock items
 * - Inventory by product
 * - Product margins
 */
class InventoryCalculator {
    constructor({ inventoryRepository }) {
        this.inventoryRepository = inventoryRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result) ? result : [];
    }

    /**
     * Calculate inventory metrics
     *
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {boolean} [params.includeDetails] - Include full product details
     * @param {number} [params.lowStockThreshold] - Threshold for low stock (default: 5)
     * @returns {Object} Inventory metrics
     */
    async calculate({ userId, businessId, includeDetails = false, lowStockThreshold = 5 }) {
        let items = [];
        try {
            const result = await this.inventoryRepository.findByUserId(userId);
            items = this._safeArray(result);
        } catch (error) {
            console.warn('⚠️ InventoryCalculator: Could not fetch inventory:', error.message);
            items = [];
        }

        const totalItems = items.length;
        const totalQuantity = items.reduce((sum, item) => sum + this._safeNumber(item.quantity), 0);
        const totalCostValue = items.reduce((sum, item) => {
            const qty = this._safeNumber(item.quantity);
            const cost = this._safeNumber(item.cost_price);
            return sum + (qty * cost);
        }, 0);
        const totalSellingValue = items.reduce((sum, item) => {
            const qty = this._safeNumber(item.quantity);
            const price = this._safeNumber(item.selling_price);
            return sum + (qty * price);
        }, 0);
        const totalPotentialProfit = totalSellingValue - totalCostValue;

        // LOW_STOCK: quantity > 0 AND quantity <= reorder_level
        const lowStockItems = items
            .filter(item => {
                const qty = this._safeNumber(item.quantity);
                const reorder = this._safeNumber(item.reorder_level) || lowStockThreshold;
                return qty > 0 && qty <= reorder;
            })
            .map(item => ({
                name: item.item_name || 'Unknown',
                quantity: this._safeNumber(item.quantity),
                reorderLevel: this._safeNumber(item.reorder_level) || lowStockThreshold,
            }));

        const lowStockCount = lowStockItems.length;

        // OUT_OF_STOCK: quantity === 0
        const outOfStockItems = items.filter(item => this._safeNumber(item.quantity) === 0);
        const outOfStockCount = outOfStockItems.length;

        let details = null;
        if (includeDetails) {
            details = items.map(item => {
                const qty = this._safeNumber(item.quantity);
                const cost = this._safeNumber(item.cost_price);
                const price = this._safeNumber(item.selling_price);
                const reorder = this._safeNumber(item.reorder_level) || lowStockThreshold;
                const value = qty * cost;
                const potentialRevenue = qty * price;
                const profit = potentialRevenue - value;
                const margin = potentialRevenue > 0 ? (profit / potentialRevenue) * 100 : 0;

                let status = 'IN_STOCK';
                if (qty === 0) status = 'OUT_OF_STOCK';
                else if (qty <= reorder) status = 'LOW_STOCK';

                return {
                    name: item.item_name,
                    quantity: Number(qty.toFixed(2)),
                    costPrice: Number(cost.toFixed(2)),
                    sellingPrice: Number(price.toFixed(2)),
                    avgCost: Number(cost.toFixed(2)),
                    lastPurchaseCost: Number(this._safeNumber(item.last_purchase_cost) || cost).toFixed(2),
                    reorderLevel: Number(reorder.toFixed(2)),
                    value: Number(value.toFixed(2)),
                    potentialRevenue: Number(potentialRevenue.toFixed(2)),
                    profit: Number(profit.toFixed(2)),
                    margin: Number(margin.toFixed(2)),
                    status,
                };
            }).sort((a, b) => a.name.localeCompare(b.name));
        }

        return {
            totalItems,
            totalQuantity: Number(totalQuantity.toFixed(2)),
            totalCostValue: Number(totalCostValue.toFixed(2)),
            totalSellingValue: Number(totalSellingValue.toFixed(2)),
            totalPotentialProfit: Number(totalPotentialProfit.toFixed(2)),
            lowStockCount,
            lowStockItems,                 // ← now always returned
            outOfStockCount,
            averageCostPerItem: totalQuantity > 0 ? Number((totalCostValue / totalQuantity).toFixed(2)) : 0,
            averageSellingPrice: totalQuantity > 0 ? Number((totalSellingValue / totalQuantity).toFixed(2)) : 0,
            overallMargin: totalSellingValue > 0 ? Number(((totalPotentialProfit / totalSellingValue) * 100).toFixed(2)) : 0,
            details,
        };
    }
}

module.exports = InventoryCalculator;