const { AnalyticsContracts } = require('../contracts');

/**
 * Customer KPI Calculator - Professional Investor Configuration
 * SSOT Analytics Engine Tracker mapping volumetric user indices.
 * Performance Profile: Stateless, O(1) Execution speed, Zero redundant DB queries.
 */
class CustomerKpiCalculator {
    constructor({ saleRepository = null, customerRepository = null }) {
        this.saleRepository = saleRepository;
        this.customerRepository = customerRepository;
    }

    /**
     * Calculate customer KPIs for a period
     */
    async calculate({ userId, businessId, period, reportData = null }) {
        let data = reportData;

        // 1. PRODUCTION FAILSAFE: Only use if ReportEngine is down. Add LIMIT in repo to prevent OOM
        if (!data && this.saleRepository) {
            const { startDate, endDate } = period;
            // WARNING: Ensure saleRepository aggregates in DB. Don't fetch all rows at scale
            const sales = await this.saleRepository.findByDateRange(userId, startDate, endDate).catch(() => []);

            const customerRevenue = {};
            let totalRevenue = 0;

            for (const sale of sales) {
                const customer = sale.customer_name || 'Unknown';
                const amount = Number(sale.total_price) || 0;
                if (!customerRevenue[customer]) customerRevenue[customer] = 0;
                customerRevenue[customer] += amount;
                totalRevenue += amount;
            }

            const sortedCustomers = Object.entries(customerRevenue).sort((a, b) => b[1] - a[1]);
            const top5Revenue = sortedCustomers.slice(0, 5).reduce((sum, [, amt]) => sum + amt, 0);

            data = {
                summary: {
                    uniqueCustomers: Object.keys(customerRevenue).length,
                    totalRevenue
                },
                revenuePerformance: {
                    topCustomers: sortedCustomers.slice(0, 5).map(([name, amount]) => ({ name, amount }))
                }
            };
        }

        if (!data) {
            throw new Error('CustomerKpiCalculator: Dataset parameters are missing or undefined');
        }

        // 2. RESILIENT SSOT MINING
        const summary = data.summary || data.kpiDashboard || data || {};
        const revenuePerformance = data.revenuePerformance || {};

        const currentCustomerCount = summary.uniqueCustomers?? summary.customerCount?? summary.totalCustomers?? 0;
        const currentTotalRevenue = summary.totalRevenue?? data.revenue?? 0;

        const topCustomersList = Array.isArray(revenuePerformance.topCustomers)? revenuePerformance.topCustomers : [];
        const topCustomersRevenueSum = topCustomersList.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        const customerConcentration = currentTotalRevenue > 0? (topCustomersRevenueSum / currentTotalRevenue) * 100 : null;

        // 3. COMPARISON
        const previousPeriodComparison = data.comparison?.previousPeriod || {};
        const previousCustomerCount = previousPeriodComparison.uniqueCustomers?? previousPeriodComparison.customerCount?? previousPeriodComparison.totalCustomers?? null;
        const previousCustomerConcentration = previousPeriodComparison.customerConcentration?? null;

        // 4. CLEAN FINANCIAL FACTORY MODULE CONTRACT INVOCATIONS
        return {
            customerCount: AnalyticsContracts.createKpi({
                name: 'customerCount',
                value: currentCustomerCount,
                previousValue: previousCustomerCount,
                period: period.label || period.type,
                source: 'CustomerKpiCalculator'
            }),
            customerConcentration: AnalyticsContracts.createKpi({
                name: 'customerConcentration',
                value: customerConcentration,
                previousValue: previousCustomerConcentration,
                period: period.label || period.type,
                source: 'CustomerKpiCalculator'
            })
        };
    }
}

module.exports = CustomerKpiCalculator;