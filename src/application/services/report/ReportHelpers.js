// src/application/services/report/ReportHelpers.js

class ReportHelpers {
    static sumArray(arr, key) {
        return arr.reduce((sum, item) => sum + (item[key] || 0), 0);
    }

    static aggregateProducts(sales) {
        const result = {};
        sales.forEach(sale => {
            const name = sale.item_name || 'Unknown';
            if (!result[name]) result[name] = { quantity: 0, revenue: 0, cogs: 0 };
            result[name].quantity += sale.quantity || 0;
            result[name].revenue += sale.total_price || 0;
            result[name].cogs += sale.cogs || 0;
        });
        return result;
    }

    static aggregateCustomers(sales) {
        const result = {};
        sales.forEach(sale => {
            const name = sale.customer_name || 'Unknown';
            if (!result[name]) result[name] = { count: 0, total: 0 };
            result[name].count += 1;
            result[name].total += sale.total_price || 0;
        });
        return result;
    }

    static getTopItems(data, sortKey, limit = 5) {
        return Object.entries(data)
            .map(([name, value]) => ({ name, ...value }))
            .sort((a, b) => b[sortKey] - a[sortKey])
            .slice(0, limit);
    }

    static getInventoryMetrics(inventory) {
        const totalItems = inventory.length;
        const totalUnits = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
        const totalValue = inventory.reduce((s, i) => s + (i.cost_price * i.quantity), 0);
        const sellingValue = inventory.reduce((s, i) => s + (i.selling_price * i.quantity), 0);
        const lowStock = inventory.filter(i => i.quantity <= (i.reorder_level || 5));

        return {
            totalItems,
            totalUnits,
            totalValue,
            potentialProfit: sellingValue - totalValue,
            lowStockCount: lowStock.length,
            lowStockItems: lowStock.map(i => i.item_name),
        };
    }

    static buildAlerts(sales, inventory, debtors) {
        const alerts = [];
        const lowStock = inventory.filter(i => i.quantity <= (i.reorder_level || 5));
        if (lowStock.length > 0) {
            alerts.push({ type: 'LOW_STOCK', message: `${lowStock.length} item(s) below reorder level: ${lowStock.map(i => i.item_name).join(', ')}` });
        }
        const overdue = debtors.filter(d => d.status === 'OVERDUE' || d.balance_remaining > 0);
        if (overdue.length > 0) {
            const total = overdue.reduce((s, d) => s + (d.balance_remaining || 0), 0);
            alerts.push({ type: 'OVERDUE_DEBTORS', message: `${overdue.length} debtor(s) have overdue balances totaling ₦${total.toLocaleString()}` });
        }
        const missingCost = sales.filter(s => (s.total_price || 0) > 0 && !(s.unit_cost > 0) && !(s.cogs > 0));
        if (missingCost.length > 0) {
            const affected = missingCost.reduce((s, i) => s + (i.total_price || 0), 0);
            alerts.push({ type: 'MISSING_COST_DATA', message: `${missingCost.length} sale(s) worth ₦${affected.toLocaleString()} have no cost price recorded` });
        }
        return alerts;
    }

    static formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    static getMonthName(date) {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
}

module.exports = ReportHelpers;