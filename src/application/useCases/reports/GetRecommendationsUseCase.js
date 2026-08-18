// src/application/useCases/reports/GetRecommendationsUseCase.js

class GetRecommendationsUseCase {
    constructor({
        saleRepository,
        incomeRepository,
        purchaseRepository,
        expenseRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
    }) {
        this.saleRepository = saleRepository;
        this.incomeRepository = incomeRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
    }

    async execute({ businessId }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const recommendations = [];

        // =============================================
        // 1. DEBTOR RECOMMENDATIONS
        // =============================================
        const debtors = await this.debtorRepository.findByBusinessId(businessId);
        const overdueDebtors = debtors.filter(d => d.isOverdue());
        const totalOverdue = overdueDebtors.reduce((sum, d) => sum + d.balanceRemaining, 0);
        const totalOutstanding = debtors
            .filter(d => d.status !== 'PAID')
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        if (totalOverdue > 0) {
            const count = overdueDebtors.length;
            recommendations.push({
                category: 'debtors',
                priority: totalOverdue > 100000 ? 'high' : 'medium',
                title: `${count} customer${count > 1 ? 's' : ''} owe you ₦${totalOverdue.toLocaleString()}`,
                description: `These debts are overdue. Consider sending payment reminders or follow-up calls.`,
                action: 'View overdue debtors',
                data: overdueDebtors.map(d => ({
                    id: d.id,
                    amount: d.balanceRemaining,
                    customerId: d.customerId,
                    daysOverdue: d.dueDate
                        ? Math.floor((new Date() - new Date(d.dueDate)) / (1000 * 60 * 60 * 24))
                        : 0,
                })),
            });
        }

        if (totalOutstanding > 0 && totalOverdue === 0) {
            recommendations.push({
                category: 'debtors',
                priority: 'low',
                title: `${debtors.filter(d => d.status !== 'PAID').length} active debtors`,
                description: `Total outstanding: ₦${totalOutstanding.toLocaleString()}. All are within payment terms.`,
                action: 'View active debtors',
            });
        }

        // =============================================
        // 2. INVENTORY RECOMMENDATIONS
        // =============================================
        const inventoryItems = await this.inventoryRepository.findByBusinessId(businessId);
        const lowStockItems = inventoryItems.filter(item => item.isLowStock());
        const outOfStockItems = inventoryItems.filter(item => item.isOutOfStock());

        if (outOfStockItems.length > 0) {
            recommendations.push({
                category: 'inventory',
                priority: 'high',
                title: `${outOfStockItems.length} item${outOfStockItems.length > 1 ? 's' : ''} out of stock`,
                description: `These items need immediate reorder to avoid lost sales.`,
                action: 'View out of stock items',
                data: outOfStockItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    reorderLevel: item.reorderLevel,
                })),
            });
        }

        if (lowStockItems.length > 0 && outOfStockItems.length === 0) {
            recommendations.push({
                category: 'inventory',
                priority: 'medium',
                title: `${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} running low`,
                description: `These items are below reorder level. Plan to restock soon.`,
                action: 'View low stock items',
                data: lowStockItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    reorderLevel: item.reorderLevel,
                })),
            });
        }

        // =============================================
        // 3. FINANCIAL RECOMMENDATIONS
        // =============================================
        const now = new Date();
        const startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);

        const sales = await this.saleRepository.findByDateRange(businessId, startDate, now);
        const expenses = await this.expenseRepository.findByDateRange(businessId, startDate, now);
        const purchases = await this.purchaseRepository.findByDateRange(businessId, startDate, now);

        const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalCosts = totalExpenses + totalPurchases;
        const netProfit = totalSales - totalCosts;

        if (totalCosts > totalSales && totalSales > 0) {
            recommendations.push({
                category: 'financial',
                priority: 'high',
                title: 'Your expenses exceed your revenue',
                description: `In the last month, your costs (₦${totalCosts.toLocaleString()}) exceeded your sales (₦${totalSales.toLocaleString()}) by ₦${(totalCosts - totalSales).toLocaleString()}.`,
                action: 'Review expenses and reduce costs',
            });
        }

        if (netProfit > 0 && totalSales > 0) {
            const margin = (netProfit / totalSales) * 100;
            if (margin < 10) {
                recommendations.push({
                    category: 'financial',
                    priority: 'medium',
                    title: `Your profit margin is ${margin.toFixed(1)}%`,
                    description: `This is below the recommended 20% margin. Consider reviewing your pricing or reducing costs.`,
                    action: 'Analyze profit margins',
                });
            }
        }

        // =============================================
        // 4. CREDITOR RECOMMENDATIONS
        // =============================================
        const creditors = await this.creditorRepository.findByBusinessId(businessId);
        const overdueCreditors = creditors.filter(c => c.isOverdue());
        const totalCreditorOverdue = overdueCreditors.reduce((sum, c) => sum + c.balanceRemaining, 0);

        if (totalCreditorOverdue > 0) {
            recommendations.push({
                category: 'creditors',
                priority: 'high',
                title: `You owe ₦${totalCreditorOverdue.toLocaleString()} to ${overdueCreditors.length} creditor${overdueCreditors.length > 1 ? 's' : ''}`,
                description: `These payments are overdue. Consider making payments to maintain good supplier relationships.`,
                action: 'View overdue creditors',
                data: overdueCreditors.map(c => ({
                    id: c.id,
                    amount: c.balanceRemaining,
                    supplierId: c.supplierId,
                    daysOverdue: c.dueDate
                        ? Math.floor((new Date() - new Date(c.dueDate)) / (1000 * 60 * 60 * 24))
                        : 0,
                })),
            });
        }

        // =============================================
        // 5. SALES RECOMMENDATIONS
        // =============================================
        if (sales.length === 0) {
            recommendations.push({
                category: 'sales',
                priority: 'medium',
                title: 'No sales recorded in the last 30 days',
                description: 'Your business hasn\'t recorded any sales this month. Consider running promotions or reaching out to customers.',
                action: 'Record a sale',
            });
        }

        // Check if there are items with selling price but low sales
        const itemsWithPrice = inventoryItems.filter(item => item.sellingPrice > 0);
        const itemsWithLowSales = itemsWithPrice.filter(item => {
            // Check if item appears in recent sales
            const itemSales = sales.filter(s => {
                for (const saleItem of s.items || []) {
                    if (saleItem.name === item.name) return true;
                }
                return false;
            });
            return itemSales.length === 0 && item.quantity > 0;
        });

        if (itemsWithLowSales.length > 0) {
            recommendations.push({
                category: 'sales',
                priority: 'low',
                title: `${itemsWithLowSales.length} item${itemsWithLowSales.length > 1 ? 's' : ''} with selling price but no recent sales`,
                description: `These items haven't been sold recently. Consider reviewing their pricing or running promotions.`,
                action: 'View inventory items',
                data: itemsWithLowSales.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    sellingPrice: item.sellingPrice,
                })),
            });
        }

        // =============================================
        // 6. POSITIVE RECOMMENDATIONS (Good News)
        // =============================================
        if (netProfit > 0 && totalSales > 0) {
            const margin = (netProfit / totalSales) * 100;
            if (margin > 20) {
                recommendations.push({
                    category: 'positive',
                    priority: 'info',
                    title: `Great profit margin! ${margin.toFixed(1)}%`,
                    description: `Your business is performing well. Consider reinvesting profits into growth or expansion.`,
                    action: 'View full report',
                });
            }
        }

        if (totalOverdue === 0 && totalOutstanding > 0) {
            recommendations.push({
                category: 'positive',
                priority: 'info',
                title: 'All debts are current',
                description: `All ${debtors.filter(d => d.status !== 'PAID').length} active debtors are within payment terms.`,
                action: 'View debtors',
            });
        }

        // =============================================
        // 7. PRIORITY ORDER
        // =============================================
        const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return {
            success: true,
            totalRecommendations: recommendations.length,
            recommendations,
            summary: {
                high: recommendations.filter(r => r.priority === 'high').length,
                medium: recommendations.filter(r => r.priority === 'medium').length,
                low: recommendations.filter(r => r.priority === 'low').length,
                info: recommendations.filter(r => r.priority === 'info').length,
            },
        };
    }
}

module.exports = GetRecommendationsUseCase;