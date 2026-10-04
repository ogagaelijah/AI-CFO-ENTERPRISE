// src/application/services/reports/calculators/RevenueCalculator.js
// v2.1.0-prod — Fixed repository method call.
//
// v2.1.0 changes:
//   - Previous version checked for a non-existent method
//     `findByBusinessIdAndDateRange` and fell through to a fallback that
//     passed (userId, startDate, endDate, businessId) into a repository
//     method whose real signature is (businessId, startDate, endDate).
//     That mismatch caused sales queries to filter by business_id = userId,
//     which returned zero rows. Reports showed Product Sales = ₦0.
//   - Now uses SaleRepository.findByDateRange(businessId, startDate, endDate)
//     directly. This is the correct method.

/**
 * RevenueCalculator - Single source of truth for revenue calculations
 *
 * Returns separate buckets so callers can decide how to combine them:
 * - salesRevenue  : sum of sales.total_price (operating top-line)
 * - otherRevenue  : sum of income.amount (non-operating)
 * - totalRevenue  : salesRevenue + otherRevenue (combined top-line)
 */
class RevenueCalculator {
    constructor({ saleRepository, incomeRepository = null }) {
        this.saleRepository = saleRepository;
        this.incomeRepository = incomeRepository;
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    async calculate({ userId, businessId, startDate, endDate, groupBy = null }) {
        if (!businessId) {
            throw new Error('RevenueCalculator: businessId is required');
        }
        if (!startDate || !endDate) {
            throw new Error('RevenueCalculator: startDate and endDate are required');
        }

        let sales = [];
        try {
            sales = await this.saleRepository.findByDateRange(
                businessId,
                startDate,
                endDate
            );
            sales = Array.isArray(sales) ? sales : [];
        } catch (error) {
            console.warn('⚠️ RevenueCalculator: Could not fetch sales:', error.message);
            sales = [];
        }

        let incomes = [];
        if (this.incomeRepository) {
            const incomesRaw = await this.incomeRepository.findByDateRange(
                businessId,
                startDate,
                endDate
            );
            incomes = Array.isArray(incomesRaw) ? incomesRaw : [];
        }

        const validSales = sales.filter((s) => this._safeNumber(s.total_price) > 0);

        const salesRevenue = validSales.reduce(
            (sum, s) => sum + this._safeNumber(s.total_price),
            0
        );

        const otherRevenue = incomes.reduce(
            (sum, i) => sum + this._safeNumber(i.amount),
            0
        );

        const totalRevenue = salesRevenue + otherRevenue;

        const salesCount = sales.length;
        const validSalesCount = validSales.length;
        const totalUnits = sales.reduce(
            (sum, s) => sum + this._safeNumber(s.quantity),
            0
        );
        const averageSaleValue = validSalesCount > 0 ? salesRevenue / validSalesCount : 0;

        let breakdown = null;
        if (groupBy === 'product') {
            breakdown = this._groupByProduct(sales);
        } else if (groupBy === 'customer') {
            breakdown = this._groupByCustomer(sales);
        }

        return {
            salesRevenue,
            otherRevenue,
            totalRevenue,
            salesCount,
            validSalesCount,
            totalUnits,
            averageSaleValue,
            breakdown,
            sales,
            incomes,
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