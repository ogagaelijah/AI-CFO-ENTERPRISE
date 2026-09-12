// src/application/services/reports/calculators/RevenueCalculator.js

/**
 * RevenueCalculator - Single source of truth for revenue calculations
 *
 * Calculates:
 * - Total revenue from sales
 * - Sales count
 * - Total units sold
 * - Average sale value
 * - Optional breakdown by product / customer
 */
class RevenueCalculator {
    constructor({ saleRepository }) {
        this.saleRepository = saleRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Calculate revenue for a date range
     *
     * @param {Object} params
     * @param {string|number} params.userId
     * @param {string|number} params.businessId
     * @param {string} params.startDate - YYYY-MM-DD
     * @param {string} params.endDate   - YYYY-MM-DD
     * @param {string} [params.groupBy] - 'product' | 'customer' | null
     */
    async calculate({ userId, businessId, startDate, endDate, groupBy = null }) {
        let sales = [];

        try {
            // Prefer business-scoped query when businessId is available
            if (businessId && typeof this.saleRepository.findByBusinessIdAndDateRange === 'function') {
                sales = await this.saleRepository.findByBusinessIdAndDateRange(
                    businessId,
                    startDate,
                    endDate
                );
            } else {
                // Fallback (backward compatible)
                sales = await this.saleRepository.findByDateRange(
                    userId,
                    startDate,
                    endDate,
                    businessId
                );
            }

            sales = Array.isArray(sales) ? sales : [];
        } catch (error) {
            console.warn('⚠️ RevenueCalculator: Could not fetch sales:', error.message);
            sales = [];
        }

        const validSales = sales.filter((s) => this._safeNumber(s.total_price) > 0);

        const totalRevenue = validSales.reduce(
            (sum, s) => sum + this._safeNumber(s.total_price),
            0
        );

        const salesCount = sales.length;
        const validSalesCount = validSales.length;
        const totalUnits = sales.reduce(
            (sum, s) => sum + this._safeNumber(s.quantity),
            0
        );
        const averageSaleValue = validSalesCount > 0 ? totalRevenue / validSalesCount : 0;

        let breakdown = null;
        if (groupBy === 'product') {
            breakdown = this._groupByProduct(sales);
        } else if (groupBy === 'customer') {
            breakdown = this._groupByCustomer(sales);
        }

        return {
            totalRevenue,
            salesCount,
            validSalesCount,
            totalUnits,
            averageSaleValue,
            breakdown,
            sales, // kept for consumers that need the raw list (e.g. MonthlyReportService)
        };
    }

    _groupByProduct(sales) {
        const productMap = {};
        for (const sale of sales) {
            const key = sale.item_name || 'Unknown';
            const revenue = this._safeNumber(sale.total_price);
            const quantity = this._safeNumber(sale.quantity);

            if (!productMap[key]) {
                productMap[key] = { revenue: 0, units: 0, count: 0 };
            }
            productMap[key].revenue += revenue;
            productMap[key].units += quantity;
            productMap[key].count += 1;
        }

        return Object.entries(productMap)
            .map(([name, data]) => ({
                name,
                ...data,
                averagePrice: data.units > 0 ? data.revenue / data.units : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }

    _groupByCustomer(sales) {
        const customerMap = {};
        for (const sale of sales) {
            const key = sale.customer_name || 'Unknown';
            const revenue = this._safeNumber(sale.total_price);

            if (!customerMap[key]) {
                customerMap[key] = { revenue: 0, count: 0 };
            }
            customerMap[key].revenue += revenue;
            customerMap[key].count += 1;
        }

        return Object.entries(customerMap)
            .map(([name, data]) => ({
                name,
                ...data,
                averageOrder: data.count > 0 ? data.revenue / data.count : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }
}

module.exports = RevenueCalculator;