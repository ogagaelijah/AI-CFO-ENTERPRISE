// src/application/services/reports/calculators/CogsCalculator.js

/**
 * CogsCalculator - Single source of truth for COGS calculations
 *
 * Calculates:
 * - Total COGS from sales
 * - COGS by product
 * - Average COGS per unit
 */
class CogsCalculator {
    constructor({ saleRepository }) {
        this.saleRepository = saleRepository;
    }

    /**
     * Safely get a number from a value
     */
    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num)? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result)? result : [];
    }

    /**
     * Calculate COGS for a date range
     *
     * @param {Object} params
     * @param {string|number} params.userId - User ID
     * @param {string|number} params.businessId - Business ID
     * @param {string} params.startDate - Start date (YYYY-MM-DD)
     * @param {string} params.endDate - End date (YYYY-MM-DD)
     * @param {string} [params.groupBy] - 'product' | null
     * @returns {Object} COGS metrics
     */
    async calculate({ userId, businessId, startDate, endDate, groupBy = null }) {
        // ✅ PERMANENT FIX: Ensure sales is always an array
        let sales = [];
        try {
            const result = await this.saleRepository.findByDateRange(userId, startDate, endDate);
            sales = this._safeArray(result);
        } catch (error) {
            console.warn('⚠️ CogsCalculator: Could not fetch sales:', error.message);
            sales = [];
        }

        const totalCogs = sales.reduce((sum, s) => {
            const cogs = this._safeNumber(s.cogs) || this._safeNumber(s.unit_cost) * this._safeNumber(s.quantity) || 0;
            return sum + cogs;
        }, 0);

        const totalQuantity = sales.reduce((sum, s) => sum + this._safeNumber(s.quantity), 0);
        const averageCogsPerUnit = totalQuantity > 0? totalCogs / totalQuantity : 0;

        let breakdown = null;
        if (groupBy === 'product') {
            breakdown = this._groupByProduct(sales);
        }

        return {
            totalCogs: Number(totalCogs.toFixed(2)),
            totalQuantity: Number(totalQuantity.toFixed(2)),
            averageCogsPerUnit: Number(averageCogsPerUnit.toFixed(2)),
            breakdown,
        };
    }

    /**
     * Group COGS by product
     */
    _groupByProduct(sales) {
        const productMap = {};
        for (const sale of sales) {
            const key = sale.item_name || 'Unknown';
            const cogs = this._safeNumber(sale.cogs) || this._safeNumber(sale.unit_cost) * this._safeNumber(sale.quantity) || 0;
            const quantity = this._safeNumber(sale.quantity) || 0;
            if (!productMap[key]) {
                productMap[key] = { cogs: 0, units: 0 };
            }
            productMap[key].cogs += cogs;
            productMap[key].units += quantity;
        }
        return Object.entries(productMap).map(([name, data]) => ({
            name,
            cogs: Number(data.cogs.toFixed(2)),
            units: Number(data.units.toFixed(2)),
            averageCogs: data.units > 0? Number((data.cogs / data.units).toFixed(2)) : 0,
        })).sort((a, b) => b.cogs - a.cogs);
    }
}

module.exports = CogsCalculator;