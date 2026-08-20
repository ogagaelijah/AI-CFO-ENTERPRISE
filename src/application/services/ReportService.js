// src/application/services/ReportService.js

class ReportService {
    constructor({
        saleRepository,
        incomeRepository,
        expenseRepository,
        purchaseRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        customerRepository,
    }) {
        this.saleRepo = saleRepository;
        this.incomeRepo = incomeRepository;
        this.expenseRepo = expenseRepository;
        this.purchaseRepo = purchaseRepository;
        this.debtorRepo = debtorRepository;
        this.creditorRepo = creditorRepository;
        this.inventoryRepo = inventoryRepository;
        this.customerRepo = customerRepository;
    }

    /**
     * Generate a report for a date range
     * @param {number} userId - User ID
     * @param {Date} startDate - Start of period
     * @param {Date} endDate - End of period
     * @param {Object} options - Additional options
     * @returns {Object} Report data
     */
    async generateReport(userId, startDate, endDate, options = {}) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // Fetch all data in parallel
        const [
            sales,
            incomes,
            expenses,
            purchases,
            debtors,
            creditors,
            inventory,
            customers,
        ] = await Promise.all([
            this.saleRepo.findByDateRange(userId, startStr, endStr),
            this.incomeRepo.findByDateRange(userId, startStr, endStr),
            this.expenseRepo.findByDateRange(userId, startStr, endStr),
            this.purchaseRepo.findByDateRange(userId, startStr, endStr),
            this.debtorRepo.findActiveByUser(userId),
            this.creditorRepo.findActiveByUser(userId),
            this.inventoryRepo.findByUserId(userId),
            this.customerRepo.findByUserId(userId),
        ]);

        // =============================================
        // REVENUE
        // =============================================
        const totalSales = this.sumArray(sales, 'total_price');
        const totalIncome = this.sumArray(incomes, 'amount');
        const totalRevenue = totalSales + totalIncome;

        // =============================================
        // COSTS
        // =============================================
        const totalPurchases = this.sumArray(purchases, 'total_price');
        const totalExpenses = this.sumArray(expenses, 'amount');
        const totalCosts = totalPurchases + totalExpenses;

        // =============================================
        // PROFITABILITY
        // =============================================
        const totalCogs = this.sumArray(sales, 'cogs');
        const grossProfit = totalSales - totalCogs;
        const netProfit = totalRevenue - totalCosts;
        
        const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // =============================================
        // TRANSACTIONS
        // =============================================
        const transactionCounts = {
            sales: sales.length,
            incomes: incomes.length,
            expenses: expenses.length,
            purchases: purchases.length,
        };

        // =============================================
        // TOP PRODUCTS (Daily/Weekly reports)
        // =============================================
        const productSales = {};
        sales.forEach(sale => {
            const name = sale.item_name || 'Unknown';
            if (!productSales[name]) {
                productSales[name] = { quantity: 0, revenue: 0 };
            }
            productSales[name].quantity += sale.quantity || 0;
            productSales[name].revenue += sale.total_price || 0;
        });

        const topProducts = Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // =============================================
        // CUSTOMER METRICS
        // =============================================
        const customerSales = {};
        sales.forEach(sale => {
            const name = sale.customer_name || 'Unknown';
            if (!customerSales[name]) {
                customerSales[name] = { count: 0, total: 0 };
            }
            customerSales[name].count += 1;
            customerSales[name].total += sale.total_price || 0;
        });

        const topCustomers = Object.entries(customerSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);

        const totalCustomers = Object.keys(customerSales).length;

        // =============================================
        // ALERTS
        // =============================================
        const alerts = [];

        // Low stock alerts
        const lowStockItems = inventory.filter(item => item.quantity <= (item.reorder_level || 5));
        if (lowStockItems.length > 0) {
            alerts.push({
                type: 'LOW_STOCK',
                message: `${lowStockItems.length} item(s) below reorder level: ${lowStockItems.map(i => i.item_name).join(', ')}`,
            });
        }

        // Overdue debtors
        const overdueDebtors = debtors.filter(d => d.status === 'OVERDUE' || d.balance_remaining > 0);
        if (overdueDebtors.length > 0) {
            alerts.push({
                type: 'OVERDUE_DEBTORS',
                message: `${overdueDebtors.length} debtor(s) have overdue balances totaling ₦${this.sumArray(overdueDebtors, 'balance_remaining').toLocaleString()}`,
            });
        }

        // =============================================
        // INVENTORY METRICS (Monthly/Yearly only)
        // =============================================
        let inventoryMetrics = null;
        if (options.includeInventory !== false) {
            const totalCostValue = inventory.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);
            const totalSellingValue = inventory.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
            const totalPotentialProfit = totalSellingValue - totalCostValue;
            
            inventoryMetrics = {
                totalValue: totalCostValue,
                potentialProfit: totalPotentialProfit,
                totalItems: inventory.length,
                lowStockCount: lowStockItems.length,
                lowStockItems: lowStockItems.map(i => i.item_name),
            };
        }

        // =============================================
        // DEBTORS & CREDITORS
        // =============================================
        const totalDebtors = debtors.reduce((sum, d) => sum + (d.balance_remaining || 0), 0);
        const totalCreditors = creditors.reduce((sum, c) => sum + (c.balance_remaining || 0), 0);

        // =============================================
        // BUILD REPORT
        // =============================================
        return {
            period: {
                startDate: startStr,
                endDate: endStr,
            },
            revenue: {
                sales: totalSales,
                income: totalIncome,
                total: totalRevenue,
            },
            costs: {
                purchases: totalPurchases,
                expenses: totalExpenses,
                total: totalCosts,
            },
            profitability: {
                grossProfit,
                grossMargin: parseFloat(grossMargin.toFixed(1)),
                netProfit,
                netMargin: parseFloat(netMargin.toFixed(1)),
            },
            transactions: transactionCounts,
            topProducts,
            customers: {
                total: totalCustomers,
                top: topCustomers,
            },
            receivables: {
                debtors: totalDebtors,
                creditors: totalCreditors,
                debtorCount: debtors.length,
                creditorCount: creditors.length,
            },
            inventory: inventoryMetrics,
            alerts,
            // Raw data for detailed views
            raw: {
                sales,
                incomes,
                expenses,
                purchases,
            },
        };
    }

    /**
     * Generate Daily Report
     */
    async generateDailyReport(userId, date = new Date()) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        // Daily reports don't need inventory metrics
        return this.generateReport(userId, startDate, endDate, { includeInventory: false });
    }

    /**
     * Generate Weekly Report
     */
    async generateWeeklyReport(userId, date = new Date()) {
        const startDate = new Date(date);
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        // Weekly reports don't need inventory metrics
        return this.generateReport(userId, startDate, endDate, { includeInventory: false });
    }

    /**
     * Generate Monthly Report
     */
    async generateMonthlyReport(userId, date = new Date()) {
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

        // Monthly reports include inventory metrics
        return this.generateReport(userId, startDate, endDate, { includeInventory: true });
    }

    /**
     * Generate Yearly Report
     */
    async generateYearlyReport(userId, date = new Date()) {
        const startDate = new Date(date.getFullYear(), 0, 1);
        const endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);

        // Yearly reports include inventory metrics
        return this.generateReport(userId, startDate, endDate, { includeInventory: true });
    }

    /**
     * Helper: Sum an array by key
     */
    sumArray(arr, key) {
        return arr.reduce((sum, item) => sum + (item[key] || 0), 0);
    }
}

module.exports = ReportService;