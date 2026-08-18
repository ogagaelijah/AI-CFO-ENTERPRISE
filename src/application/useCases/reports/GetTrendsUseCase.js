// src/application/useCases/reports/GetTrendsUseCase.js

class GetTrendsUseCase {
    constructor({
        saleRepository,
        incomeRepository,
        purchaseRepository,
        expenseRepository,
        debtorRepository,
        creditorRepository,
    }) {
        this.saleRepository = saleRepository;
        this.incomeRepository = incomeRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
    }

    async execute({
        businessId,
        period = 'month', // 'week', 'month', 'quarter', 'year'
        lookback = 12, // Number of periods to look back
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const now = new Date();
        const periods = [];
        const periodLabels = [];

        // Generate period ranges
        for (let i = lookback - 1; i >= 0; i--) {
            let startDate, endDate, label;

            switch (period) {
                case 'week': {
                    const date = new Date(now);
                    date.setDate(now.getDate() - (i * 7));
                    const day = date.getDay();
                    startDate = new Date(date);
                    startDate.setDate(date.getDate() - day);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                    endDate.setHours(23, 59, 59, 999);
                    label = `Week ${i + 1}`;
                    break;
                }
                case 'month': {
                    const date = new Date(now);
                    date.setMonth(now.getMonth() - i);
                    startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                    endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                    endDate.setHours(23, 59, 59, 999);
                    label = startDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                    break;
                }
                case 'quarter': {
                    const date = new Date(now);
                    date.setMonth(now.getMonth() - (i * 3));
                    const quarter = Math.floor(date.getMonth() / 3);
                    startDate = new Date(date.getFullYear(), quarter * 3, 1);
                    endDate = new Date(date.getFullYear(), quarter * 3 + 3, 0);
                    endDate.setHours(23, 59, 59, 999);
                    label = `Q${quarter + 1} ${date.getFullYear()}`;
                    break;
                }
                case 'year': {
                    const year = now.getFullYear() - i;
                    startDate = new Date(year, 0, 1);
                    endDate = new Date(year, 11, 31);
                    endDate.setHours(23, 59, 59, 999);
                    label = `${year}`;
                    break;
                }
                default: {
                    const date = new Date(now);
                    date.setMonth(now.getMonth() - i);
                    startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                    endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                    endDate.setHours(23, 59, 59, 999);
                    label = startDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                }
            }

            periods.push({ startDate, endDate, label });
            periodLabels.push(label);
        }

        // Fetch data for each period
        const revenueData = [];
        const costData = [];
        const profitData = [];
        const salesCount = [];
        const customerCount = [];

        for (const period of periods) {
            // Get sales
            const sales = await this.saleRepository.findByDateRange(
                businessId,
                period.startDate,
                period.endDate
            );

            // Get income
            const incomes = await this.incomeRepository.findByDateRange(
                businessId,
                period.startDate,
                period.endDate
            );

            // Get purchases
            const purchases = await this.purchaseRepository.findByDateRange(
                businessId,
                period.startDate,
                period.endDate
            );

            // Get expenses
            const expenses = await this.expenseRepository.findByDateRange(
                businessId,
                period.startDate,
                period.endDate
            );

            // Calculate totals
            const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
            const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
            const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

            const revenue = totalSales + totalIncome;
            const costs = totalPurchases + totalExpenses;
            const profit = revenue - costs;

            revenueData.push(revenue);
            costData.push(costs);
            profitData.push(profit);
            salesCount.push(sales.length);

            // Count unique customers
            const customerIds = new Set();
            for (const sale of sales) {
                if (sale.customerId) {
                    customerIds.add(sale.customerId);
                }
            }
            customerCount.push(customerIds.size);
        }

        // Calculate trends (percentage changes)
        const revenueTrends = [];
        const profitTrends = [];
        const salesTrends = [];

        for (let i = 1; i < revenueData.length; i++) {
            const prevRevenue = revenueData[i - 1];
            const currRevenue = revenueData[i];
            const prevProfit = profitData[i - 1];
            const currProfit = profitData[i];
            const prevSales = salesCount[i - 1];
            const currSales = salesCount[i];

            revenueTrends.push({
                period: periodLabels[i],
                change: prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0,
                direction: currRevenue >= prevRevenue ? 'up' : 'down',
            });

            profitTrends.push({
                period: periodLabels[i],
                change: prevProfit !== 0 ? ((currProfit - prevProfit) / Math.abs(prevProfit)) * 100 : 0,
                direction: currProfit >= prevProfit ? 'up' : 'down',
            });

            salesTrends.push({
                period: periodLabels[i],
                change: prevSales > 0 ? ((currSales - prevSales) / prevSales) * 100 : 0,
                direction: currSales >= prevSales ? 'up' : 'down',
            });
        }

        // Calculate moving averages (3-period)
        const movingAverageRevenue = [];
        for (let i = 0; i < revenueData.length; i++) {
            if (i < 2) {
                movingAverageRevenue.push(null);
            } else {
                const avg = (revenueData[i - 2] + revenueData[i - 1] + revenueData[i]) / 3;
                movingAverageRevenue.push(avg);
            }
        }

        // Calculate growth rate (CAGR)
        const firstRevenue = revenueData[0] || 0;
        const lastRevenue = revenueData[revenueData.length - 1] || 0;
        const totalPeriods = revenueData.length - 1;
        const cagr = firstRevenue > 0 && totalPeriods > 0
            ? (Math.pow(lastRevenue / firstRevenue, 1 / totalPeriods) - 1) * 100
            : 0;

        // Get top trends
        const maxRevenue = Math.max(...revenueData, 0);
        const maxProfit = Math.max(...profitData, 0);
        const minProfit = Math.min(...profitData, 0);

        // Get debtors trend
        const debtors = await this.debtorRepository.findByBusinessId(businessId);
        const currentOutstanding = debtors
            .filter(d => d.status !== 'PAID')
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        const overdueDebtors = debtors
            .filter(d => d.isOverdue())
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        // Get creditors trend
        const creditors = await this.creditorRepository.findByBusinessId(businessId);
        const currentCreditorsOutstanding = creditors
            .filter(c => c.status !== 'PAID')
            .reduce((sum, c) => sum + c.balanceRemaining, 0);

        return {
            success: true,
            period,
            lookback,
            periods: periodLabels,
            data: {
                revenue: revenueData,
                costs: costData,
                profit: profitData,
                salesCount: salesCount,
                customerCount: customerCount,
                movingAverageRevenue: movingAverageRevenue,
            },
            trends: {
                revenue: revenueTrends,
                profit: profitTrends,
                sales: salesTrends,
            },
            summary: {
                totalRevenue: revenueData.reduce((a, b) => a + b, 0),
                averageRevenue: revenueData.reduce((a, b) => a + b, 0) / revenueData.length,
                totalProfit: profitData.reduce((a, b) => a + b, 0),
                averageProfit: profitData.reduce((a, b) => a + b, 0) / profitData.length,
                maxRevenue,
                maxProfit,
                minProfit,
                cagr: cagr.toFixed(1) + '%',
                currentOutstanding,
                overdueDebtors,
                currentCreditorsOutstanding,
            },
            insights: {
                bestPeriod: periodLabels[revenueData.indexOf(maxRevenue)] || '',
                worstPeriod: periodLabels[profitData.indexOf(minProfit)] || '',
                isGrowing: cagr > 0,
                growthRate: cagr.toFixed(1) + '%',
                averageProfitMargin: revenueData.reduce((a, b) => a + b, 0) > 0
                    ? ((profitData.reduce((a, b) => a + b, 0) / revenueData.reduce((a, b) => a + b, 0)) * 100).toFixed(1) + '%'
                    : '0%',
            },
        };
    }
}

module.exports = GetTrendsUseCase;