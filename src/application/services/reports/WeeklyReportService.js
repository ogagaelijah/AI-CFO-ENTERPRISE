// src/application/services/reports/WeeklyReportService.js

/**
 * Weekly Report Service
 * Trend analysis report
 * Shows week-over-week changes
 */
class WeeklyReportService {
    constructor({
        saleRepository,
        purchaseRepository,
        expenseRepository,
        incomeRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
    }) {
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
    }

    async generate({ userId, businessId, date }) {
        const targetDate = date ? new Date(date) : new Date();
        
        // Current week (Monday - Sunday)
        const dayOfWeek = targetDate.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        // Previous week
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(weekStart.getDate() - 7);
        const prevWeekEnd = new Date(prevWeekStart);
        prevWeekEnd.setDate(prevWeekStart.getDate() + 6);

        const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];
        const prevWeekEndStr = prevWeekEnd.toISOString().split('T')[0];

        // ✅ FIX: Use sale_date for sales
        const sales = await this.saleRepository.findByDateRange(
            userId,
            weekStartStr,
            weekEndStr
        );

        const income = await this.incomeRepository.findByDateRange(
            userId,
            weekStartStr,
            weekEndStr
        );

        const expenses = await this.expenseRepository.findByDateRange(
            userId,
            weekStartStr,
            weekEndStr
        );

        const purchases = await this.purchaseRepository.findByDateRange(
            userId,
            weekStartStr,
            weekEndStr
        );

        // Previous week
        const prevSales = await this.saleRepository.findByDateRange(
            userId,
            prevWeekStartStr,
            prevWeekEndStr
        );

        const prevIncome = await this.incomeRepository.findByDateRange(
            userId,
            prevWeekStartStr,
            prevWeekEndStr
        );

        const prevExpenses = await this.expenseRepository.findByDateRange(
            userId,
            prevWeekStartStr,
            prevWeekEndStr
        );

        // Calculate current week
        const revenue = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const cogs = sales.reduce((sum, s) => sum + (s.cogs || 0), 0);
        const otherRevenue = income.reduce((sum, i) => sum + (i.amount || 0), 0);
        const totalRevenue = revenue + otherRevenue;
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);

        const grossProfit = totalRevenue - cogs;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netProfit = grossProfit - totalExpenses;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // Calculate previous week
        const prevRevenue = prevSales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const prevCogs = prevSales.reduce((sum, s) => sum + (s.cogs || 0), 0);
        const prevOtherRevenue = prevIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
        const prevTotalRevenue = prevRevenue + prevOtherRevenue;
        const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const prevGrossProfit = prevTotalRevenue - prevCogs;
        const prevNetProfit = prevGrossProfit - prevTotalExpenses;

        // Week-over-week
        const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
        const profitChange = prevNetProfit > 0 ? ((netProfit - prevNetProfit) / prevNetProfit) * 100 : 0;
        const marginChange = grossMargin - (prevTotalRevenue > 0 ? ((prevGrossProfit / prevTotalRevenue) * 100) : 0);

        // Top Products
        const productSales = {};
        sales.forEach(s => {
            const key = s.item_name || 'Unknown';
            if (!productSales[key]) productSales[key] = 0;
            productSales[key] += s.total_price || 0;
        });
        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));

        // Top Customers
        const customerSales = {};
        sales.forEach(s => {
            const key = s.customer_name || 'Unknown';
            if (!customerSales[key]) customerSales[key] = 0;
            customerSales[key] += s.total_price || 0;
        });
        const topCustomers = Object.entries(customerSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));

        // Expense Drivers
        const expenseDrivers = {};
        expenses.forEach(e => {
            const key = e.category || 'Other';
            if (!expenseDrivers[key]) expenseDrivers[key] = 0;
            expenseDrivers[key] += e.amount || 0;
        });
        const topExpenses = Object.entries(expenseDrivers)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, amount]) => ({ category, amount }));

        // Inventory
        const inventorySummary = await this.inventoryRepository.getSummary(userId);

        // Debtors
        const debtorSummary = await this.debtorRepository.getSummary(userId);

        // Creditors
        const creditorSummary = await this.creditorRepository.getSummary(userId);

        return {
            period: {
                start: weekStartStr,
                end: weekEndStr,
            },
            revenue: totalRevenue,
            cogs,
            grossProfit,
            grossMargin,
            expenses: totalExpenses,
            netProfit,
            netMargin,
            purchases: totalPurchases,
            otherRevenue,
            weekOverWeek: {
                revenueChange,
                profitChange,
                marginChange,
                previousWeek: {
                    revenue: prevTotalRevenue,
                    grossProfit: prevGrossProfit,
                    netProfit: prevNetProfit,
                },
            },
            topProducts,
            topCustomers,
            topExpenses,
            inventory: {
                totalItems: inventorySummary.total_items,
                totalValue: inventorySummary.total_cost_value,
                potentialProfit: inventorySummary.total_profit,
                lowStockCount: inventorySummary.low_stock_count,
            },
            receivables: {
                totalOutstanding: debtorSummary.total_outstanding || 0,
                activeCount: debtorSummary.active_count || 0,
                overdueCount: debtorSummary.overdue_count || 0,
            },
            payables: {
                totalOutstanding: creditorSummary.total_outstanding || 0,
                activeCount: creditorSummary.active_count || 0,
                overdueCount: creditorSummary.overdue_count || 0,
            },
            keyRisks: [],
            keyInsights: [],
        };
    }
}

module.exports = WeeklyReportService;