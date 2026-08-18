// src/application/useCases/reports/GetForecastUseCase.js

class GetForecastUseCase {
    constructor({
        saleRepository,
        incomeRepository,
        purchaseRepository,
        expenseRepository,
    }) {
        this.saleRepository = saleRepository;
        this.incomeRepository = incomeRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
    }

    async execute({
        businessId,
        months = 3,
        lookbackMonths = 6,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Get historical data
        const now = new Date();
        const lookbackStart = new Date(now);
        lookbackStart.setMonth(now.getMonth() - lookbackMonths);
        lookbackStart.setHours(0, 0, 0, 0);

        const sales = await this.saleRepository.findByDateRange(
            businessId,
            lookbackStart,
            now
        );

        const incomes = await this.incomeRepository.findByDateRange(
            businessId,
            lookbackStart,
            now
        );

        const purchases = await this.purchaseRepository.findByDateRange(
            businessId,
            lookbackStart,
            now
        );

        const expenses = await this.expenseRepository.findByDateRange(
            businessId,
            lookbackStart,
            now
        );

        // Group by month
        const monthlyRevenue = {};
        const monthlyCosts = {};

        for (const sale of sales) {
            const key = sale.saleDate.getFullYear() + '-' + (sale.saleDate.getMonth() + 1);
            if (!monthlyRevenue[key]) monthlyRevenue[key] = 0;
            monthlyRevenue[key] += sale.totalAmount;
        }

        for (const income of incomes) {
            const key = income.date.getFullYear() + '-' + (income.date.getMonth() + 1);
            if (!monthlyRevenue[key]) monthlyRevenue[key] = 0;
            monthlyRevenue[key] += income.amount;
        }

        for (const purchase of purchases) {
            const key = purchase.purchaseDate.getFullYear() + '-' + (purchase.purchaseDate.getMonth() + 1);
            if (!monthlyCosts[key]) monthlyCosts[key] = 0;
            monthlyCosts[key] += purchase.totalAmount;
        }

        for (const expense of expenses) {
            const key = expense.date.getFullYear() + '-' + (expense.date.getMonth() + 1);
            if (!monthlyCosts[key]) monthlyCosts[key] = 0;
            monthlyCosts[key] += expense.amount;
        }

        // Calculate averages
        const keys = Object.keys(monthlyRevenue);
        const avgRevenue = keys.length > 0
            ? Object.values(monthlyRevenue).reduce((a, b) => a + b, 0) / keys.length
            : 0;

        const costKeys = Object.keys(monthlyCosts);
        const avgCosts = costKeys.length > 0
            ? Object.values(monthlyCosts).reduce((a, b) => a + b, 0) / costKeys.length
            : 0;

        // Calculate trend (simple linear regression)
        const sortedKeys = keys.sort();
        let revenueTrend = 0;
        if (sortedKeys.length > 1) {
            const n = sortedKeys.length;
            const indices = sortedKeys.map((_, i) => i);
            const values = sortedKeys.map(k => monthlyRevenue[k]);
            const sumX = indices.reduce((a, b) => a + b, 0);
            const sumY = values.reduce((a, b) => a + b, 0);
            const sumXY = indices.reduce((a, b, i) => a + b * values[i], 0);
            const sumX2 = indices.reduce((a, b) => a + b * b, 0);
            revenueTrend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        }

        // Generate forecast
        const forecast = [];
        let currentRevenue = avgRevenue;
        let currentCosts = avgCosts;

        for (let i = 1; i <= months; i++) {
            const forecastDate = new Date(now);
            forecastDate.setMonth(now.getMonth() + i);

            // Apply trend
            currentRevenue += revenueTrend * 0.5; // Smooth trend
            currentCosts += revenueTrend * 0.3; // Costs follow revenue with lower volatility

            // Ensure non-negative
            currentRevenue = Math.max(0, currentRevenue);
            currentCosts = Math.max(0, currentCosts);

            const forecastProfit = currentRevenue - currentCosts;
            const forecastMargin = currentRevenue > 0
                ? (forecastProfit / currentRevenue) * 100
                : 0;

            // Confidence interval (wider for longer forecasts)
            const confidence = 1 - (i / (months + 1)) * 0.3; // 100% to 70%

            forecast.push({
                month: forecastDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                date: forecastDate,
                projectedRevenue: Math.round(currentRevenue),
                projectedCosts: Math.round(currentCosts),
                projectedProfit: Math.round(forecastProfit),
                projectedMargin: forecastMargin.toFixed(1) + '%',
                confidence: (confidence * 100).toFixed(0) + '%',
                lowerBound: Math.round(currentRevenue * (1 - (1 - confidence) * 0.5)),
                upperBound: Math.round(currentRevenue * (1 + (1 - confidence) * 0.5)),
            });
        }

        // Calculate seasonality
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const seasonality = {};

        for (const key of keys) {
            const [year, month] = key.split('-');
            const monthName = monthNames[parseInt(month) - 1];
            if (!seasonality[monthName]) {
                seasonality[monthName] = { total: 0, count: 0 };
            }
            seasonality[monthName].total += monthlyRevenue[key];
            seasonality[monthName].count += 1;
        }

        const seasonalityData = Object.entries(seasonality).map(([month, data]) => ({
            month,
            averageRevenue: data.total / data.count,
        }));

        return {
            success: true,
            summary: {
                lookbackMonths,
                forecastMonths: months,
                averageMonthlyRevenue: Math.round(avgRevenue),
                averageMonthlyCosts: Math.round(avgCosts),
                averageMonthlyProfit: Math.round(avgRevenue - avgCosts),
                revenueTrend: revenueTrend.toFixed(2),
                totalProjectedRevenue: forecast.reduce((sum, f) => sum + f.projectedRevenue, 0),
                totalProjectedProfit: forecast.reduce((sum, f) => sum + f.projectedProfit, 0),
            },
            forecast,
            seasonality: seasonalityData,
            historicalData: {
                monthlyRevenue,
                monthlyCosts,
            },
        };
    }
}

module.exports = GetForecastUseCase;