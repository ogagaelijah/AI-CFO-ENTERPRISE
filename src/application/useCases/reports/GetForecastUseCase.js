// src/application/useCases/reports/GetForecastUseCase.js

class GetForecastUseCase {
    constructor({
        saleRepository,
        incomeRepository,
        purchaseRepository,
        expenseRepository,
    }) {
        this.saleRepo = saleRepository;
        this.incomeRepo = incomeRepository;
        this.purchaseRepo = purchaseRepository;
        this.expenseRepo = expenseRepository;
    }

    async execute({ businessId, userId, months, lookbackMonths = 12 }) {
        try {
            // Get historical data
            const now = new Date();
            const startDate = new Date(now);
            startDate.setMonth(now.getMonth() - lookbackMonths);
            startDate.setHours(0, 0, 0, 0);
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = now.toISOString().split('T')[0];

            const [sales, incomes, expenses, purchases] = await Promise.all([
                this.saleRepo.findByDateRange(userId, startStr, endStr),
                this.incomeRepo.findByDateRange(userId, startStr, endStr),
                this.expenseRepo.findByDateRange(userId, startStr, endStr),
                this.purchaseRepo.findByDateRange(userId, startStr, endStr),
            ]);

            // Calculate monthly revenue and costs
            const monthlyData = {};
            
            sales.forEach(sale => {
                const date = new Date(sale.sale_date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[key]) {
                    monthlyData[key] = { revenue: 0, costs: 0, month: date.getMonth(), year: date.getFullYear() };
                }
                monthlyData[key].revenue += sale.total_price || 0;
            });

            incomes.forEach(income => {
                const date = new Date(income.income_date || income.created_at);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[key]) {
                    monthlyData[key] = { revenue: 0, costs: 0, month: date.getMonth(), year: date.getFullYear() };
                }
                monthlyData[key].revenue += income.amount || 0;
            });

            expenses.forEach(expense => {
                const date = new Date(expense.expense_date || expense.created_at);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[key]) {
                    monthlyData[key] = { revenue: 0, costs: 0, month: date.getMonth(), year: date.getFullYear() };
                }
                monthlyData[key].costs += expense.amount || 0;
            });

            purchases.forEach(purchase => {
                const date = new Date(purchase.purchase_date || purchase.created_at);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyData[key]) {
                    monthlyData[key] = { revenue: 0, costs: 0, month: date.getMonth(), year: date.getFullYear() };
                }
                monthlyData[key].costs += purchase.total_price || 0;
            });

            const sortedMonths = Object.keys(monthlyData).sort();
            if (sortedMonths.length < 3) {
                return {
                    success: false,
                    error: 'Not enough data for forecasting. Need at least 3 months of data.',
                    forecast: [],
                    seasonality: [],
                    summary: {
                        lookbackMonths,
                        averageMonthlyRevenue: 0,
                        averageMonthlyCosts: 0,
                        averageMonthlyProfit: 0,
                        revenueTrend: 'insufficient data',
                        totalProjectedRevenue: 0,
                        totalProjectedProfit: 0,
                    },
                };
            }

            // Calculate averages and trends
            const revenues = sortedMonths.map(key => monthlyData[key].revenue);
            const costs = sortedMonths.map(key => monthlyData[key].costs);
            const profits = sortedMonths.map(key => monthlyData[key].revenue - monthlyData[key].costs);

            const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
            const avgCosts = costs.reduce((a, b) => a + b, 0) / costs.length;
            const avgProfit = avgRevenue - avgCosts;

            // Calculate trend direction
            let revenueTrend = 'stable';
            if (revenues.length >= 2) {
                const firstHalf = revenues.slice(0, Math.floor(revenues.length / 2));
                const secondHalf = revenues.slice(Math.floor(revenues.length / 2));
                const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                if (secondAvg > firstAvg * 1.1) revenueTrend = 'increasing';
                else if (secondAvg < firstAvg * 0.9) revenueTrend = 'decreasing';
            }

            // Generate forecast
            const forecast = [];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Apply seasonality adjustment
            const seasonalityData = {};
            sortedMonths.forEach(key => {
                const month = monthlyData[key].month;
                if (!seasonalityData[month]) {
                    seasonalityData[month] = { total: 0, count: 0 };
                }
                seasonalityData[month].total += monthlyData[key].revenue;
                seasonalityData[month].count += 1;
            });

            const seasonality = Object.keys(seasonalityData).map(month => ({
                month: monthNames[parseInt(month)],
                averageRevenue: seasonalityData[month].total / seasonalityData[month].count,
            })).sort((a, b) => {
                const order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return order.indexOf(a.month) - order.indexOf(b.month);
            });

            // Generate monthly projections
            for (let i = 1; i <= months; i++) {
                const forecastDate = new Date(now);
                forecastDate.setMonth(now.getMonth() + i);
                const monthName = monthNames[forecastDate.getMonth()];
                
                // Find seasonality factor
                const seasonalFactor = seasonalityData[forecastDate.getMonth()] 
                    ? (seasonalityData[forecastDate.getMonth()].total / seasonalityData[forecastDate.getMonth()].count) / avgRevenue 
                    : 1;

                // Apply trend + seasonality
                let projectedRevenue = avgRevenue * seasonalFactor;
                if (revenueTrend === 'increasing') {
                    projectedRevenue *= (1 + (i * 0.05));
                } else if (revenueTrend === 'decreasing') {
                    projectedRevenue *= (1 - (i * 0.03));
                }

                const projectedCosts = avgCosts * seasonalFactor;
                const projectedProfit = projectedRevenue - projectedCosts;

                // Determine confidence level
                let confidence = 'medium';
                if (i <= 3) confidence = 'high';
                else if (i <= 6) confidence = 'medium';
                else confidence = 'low';

                forecast.push({
                    month: `${monthName} ${forecastDate.getFullYear()}`,
                    projectedRevenue: Math.round(projectedRevenue),
                    projectedCosts: Math.round(projectedCosts),
                    projectedProfit: Math.round(projectedProfit),
                    confidence,
                });
            }

            const totalProjectedRevenue = forecast.reduce((sum, f) => sum + f.projectedRevenue, 0);
            const totalProjectedProfit = forecast.reduce((sum, f) => sum + f.projectedProfit, 0);

            return {
                success: true,
                forecast,
                seasonality,
                summary: {
                    lookbackMonths: sortedMonths.length,
                    averageMonthlyRevenue: Math.round(avgRevenue),
                    averageMonthlyCosts: Math.round(avgCosts),
                    averageMonthlyProfit: Math.round(avgProfit),
                    revenueTrend,
                    totalProjectedRevenue: Math.round(totalProjectedRevenue),
                    totalProjectedProfit: Math.round(totalProjectedProfit),
                },
            };

        } catch (error) {
            console.error('GetForecastUseCase error:', error);
            return {
                success: false,
                error: error.message,
                forecast: [],
                seasonality: [],
                summary: {
                    lookbackMonths: 0,
                    averageMonthlyRevenue: 0,
                    averageMonthlyCosts: 0,
                    averageMonthlyProfit: 0,
                    revenueTrend: 'error',
                    totalProjectedRevenue: 0,
                    totalProjectedProfit: 0,
                },
            };
        }
    }
}

module.exports = GetForecastUseCase;