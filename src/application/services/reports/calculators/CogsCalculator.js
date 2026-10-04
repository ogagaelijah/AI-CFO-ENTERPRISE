// src/application/services/reports/calculators/CogsCalculator.js
// v2.0.0-prod — Fixed repository call signature.
//
// v2.0.0 changes:
//   - Previous version called saleRepository.findByDateRange(userId, startDate, endDate).
//     The repository signature is findByDateRange(businessId, startDate, endDate).
//     The userId landed in the businessId slot, so WHERE business_id = <userId>
//     returned zero rows and COGS was always ₦0.
//   - Now passes businessId correctly.
//   - This matches the RevenueCalculator v2.1.0 fix pattern.

/**
 * CogsCalculator - Single source of truth for COGS calculations
 */
class CogsCalculator {
    constructor({ saleRepository }) {
        this.saleRepository = saleRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    _safeArray(result) {
        return Array.isArray(result) ? result : [];
    }

    async calculate({ userId, businessId, startDate, endDate, groupBy = null }) {
        if (!businessId) {
            throw new Error('CogsCalculator: businessId is required');
        }
        if (!startDate || !endDate) {
            throw new Error('CogsCalculator: startDate and endDate are required');
        }

        let sales = [];
        try {
            const result = await this.saleRepository.findByDateRange(
                businessId,
                startDate,
                endDate
            );
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
        const averageCogsPerUnit = totalQuantity > 0 ? totalCogs / totalQuantity : 0;

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
            averageCogs: data.units > 0 ? Number((data.cogs / data.units).toFixed(2)) : 0,
        })).sort((a, b) => b.cogs - a.cogs);
    }
}

module.exports = CogsCalculator;