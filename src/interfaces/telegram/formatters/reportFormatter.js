// src/interfaces/telegram/formatters/reportFormatter.js

/**
 * Format daily report for Telegram (Plain Text)
 */
function formatDailyReport(report) {
    const { period, revenue, costs, profitability, transactions, topProducts, customers, receivables, alerts } = report;

    const dateStr = `${formatDate(period.startDate)}`;

    let msg = `📊 DAILY PERFORMANCE REPORT\n`;
    msg += `===========================================\n`;
    msg += `📅 ${dateStr}\n\n`;

    // Revenue
    msg += `💰 REVENUE\n`;
    msg += `   Sales:        ₦${formatCurrency(revenue.sales)}\n`;
    msg += `   Other Income: ₦${formatCurrency(revenue.income)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(revenue.total)}\n\n`;

    // Costs
    msg += `💸 COSTS\n`;
    msg += `   Purchases:    ₦${formatCurrency(costs.purchases)}\n`;
    msg += `   Expenses:     ₦${formatCurrency(costs.expenses)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(costs.total)}\n\n`;

    // Profitability
    msg += `📈 PROFITABILITY\n`;
    msg += `   Gross Profit: ₦${formatCurrency(profitability.grossProfit)}\n`;
    msg += `   Gross Margin: ${profitability.grossMargin}%\n`;
    msg += `   Net Profit:   ₦${formatCurrency(profitability.netProfit)}\n`;
    msg += `   Net Margin:   ${profitability.netMargin}%\n\n`;

    // Transactions
    msg += `📊 TRANSACTIONS\n`;
    msg += `   Sales:        ${transactions.sales}\n`;
    msg += `   Incomes:      ${transactions.incomes}\n`;
    msg += `   Expenses:     ${transactions.expenses}\n`;
    msg += `   Purchases:    ${transactions.purchases}\n\n`;

    // Top Products
    if (topProducts.length > 0) {
        msg += `📦 TOP PERFORMING PRODUCTS\n`;
        topProducts.forEach((product, index) => {
            msg += `   ${index + 1}. ${product.name}: ₦${formatCurrency(product.revenue)} (${product.quantity} unit${product.quantity > 1 ? 's' : ''})\n`;
        });
        msg += `\n`;
    }

    // Customers
    if (customers.total > 0) {
        msg += `👥 CUSTOMERS\n`;
        msg += `   Total Today:  ${customers.total}\n`;
        if (customers.top.length > 0) {
            msg += `   Top Customer: ${customers.top[0].name} (₦${formatCurrency(customers.top[0].total)})\n`;
        }
        msg += `\n`;
    }

    // Receivables
    if (receivables.debtors > 0 || receivables.creditors > 0) {
        msg += `💳 RECEIVABLES & PAYABLES\n`;
        if (receivables.debtors > 0) {
            msg += `   Debtors:      ₦${formatCurrency(receivables.debtors)} (${receivables.debtorCount} active)\n`;
        }
        if (receivables.creditors > 0) {
            msg += `   Creditors:    ₦${formatCurrency(receivables.creditors)} (${receivables.creditorCount} active)\n`;
        }
        msg += `\n`;
    }

    // Alerts
    if (alerts.length > 0) {
        msg += `⚠️ ALERTS\n`;
        alerts.forEach(alert => {
            msg += `   ${alert.message}\n`;
        });
        msg += `\n`;
    } else {
        msg += `✅ ALERTS: No alerts\n\n`;
    }

    msg += `===========================================\n`;
    msg += `📱 @AICFOENTRISE_BOT | AI CFO ENTERPRISE`;

    return msg;
}

/**
 * Format weekly report (Plain Text)
 */
function formatWeeklyReport(report) {
    const { period, revenue, costs, profitability, transactions, topProducts, customers, receivables, alerts } = report;

    const dateStr = `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;

    let msg = `📊 WEEKLY PERFORMANCE REPORT\n`;
    msg += `===========================================\n`;
    msg += `📅 ${dateStr}\n\n`;

    // Revenue
    msg += `💰 REVENUE\n`;
    msg += `   Sales:        ₦${formatCurrency(revenue.sales)}\n`;
    msg += `   Other Income: ₦${formatCurrency(revenue.income)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(revenue.total)}\n\n`;

    // Costs
    msg += `💸 COSTS\n`;
    msg += `   Purchases:    ₦${formatCurrency(costs.purchases)}\n`;
    msg += `   Expenses:     ₦${formatCurrency(costs.expenses)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(costs.total)}\n\n`;

    // Profitability
    msg += `📈 PROFITABILITY\n`;
    msg += `   Gross Profit: ₦${formatCurrency(profitability.grossProfit)}\n`;
    msg += `   Gross Margin: ${profitability.grossMargin}%\n`;
    msg += `   Net Profit:   ₦${formatCurrency(profitability.netProfit)}\n`;
    msg += `   Net Margin:   ${profitability.netMargin}%\n\n`;

    // Transactions
    msg += `📊 TRANSACTIONS\n`;
    msg += `   Sales:        ${transactions.sales}\n`;
    msg += `   Incomes:      ${transactions.incomes}\n`;
    msg += `   Expenses:     ${transactions.expenses}\n`;
    msg += `   Purchases:    ${transactions.purchases}\n\n`;

    // Top Products
    if (topProducts.length > 0) {
        msg += `📦 TOP PERFORMING PRODUCTS\n`;
        topProducts.forEach((product, index) => {
            msg += `   ${index + 1}. ${product.name}: ₦${formatCurrency(product.revenue)} (${product.quantity} unit${product.quantity > 1 ? 's' : ''})\n`;
        });
        msg += `\n`;
    }

    // Customers
    if (customers.total > 0) {
        msg += `👥 CUSTOMERS\n`;
        msg += `   Total:        ${customers.total}\n`;
        if (customers.top.length > 0) {
            msg += `   Top Customer: ${customers.top[0].name} (₦${formatCurrency(customers.top[0].total)})\n`;
        }
        msg += `\n`;
    }

    // Receivables
    if (receivables.debtors > 0 || receivables.creditors > 0) {
        msg += `💳 RECEIVABLES & PAYABLES\n`;
        if (receivables.debtors > 0) {
            msg += `   Debtors:      ₦${formatCurrency(receivables.debtors)} (${receivables.debtorCount} active)\n`;
        }
        if (receivables.creditors > 0) {
            msg += `   Creditors:    ₦${formatCurrency(receivables.creditors)} (${receivables.creditorCount} active)\n`;
        }
        msg += `\n`;
    }

    // Alerts
    if (alerts.length > 0) {
        msg += `⚠️ ALERTS\n`;
        alerts.forEach(alert => {
            msg += `   ${alert.message}\n`;
        });
        msg += `\n`;
    } else {
        msg += `✅ ALERTS: No alerts\n\n`;
    }

    msg += `===========================================\n`;
    msg += `📱 @AICFOENTRISE_BOT | AI CFO ENTERPRISE`;

    return msg;
}

/**
 * Format monthly report (Plain Text)
 */
function formatMonthlyReport(report) {
    const { period, revenue, costs, profitability, transactions, topProducts, customers, receivables, inventory, alerts } = report;

    const dateStr = `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;

    let msg = `📊 MONTHLY PERFORMANCE REPORT\n`;
    msg += `===========================================\n`;
    msg += `📅 ${dateStr}\n\n`;

    // Revenue
    msg += `💰 REVENUE\n`;
    msg += `   Sales:        ₦${formatCurrency(revenue.sales)}\n`;
    msg += `   Other Income: ₦${formatCurrency(revenue.income)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(revenue.total)}\n\n`;

    // Costs
    msg += `💸 COSTS\n`;
    msg += `   Purchases:    ₦${formatCurrency(costs.purchases)}\n`;
    msg += `   Expenses:     ₦${formatCurrency(costs.expenses)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(costs.total)}\n\n`;

    // Profitability
    msg += `📈 PROFITABILITY\n`;
    msg += `   Gross Profit: ₦${formatCurrency(profitability.grossProfit)}\n`;
    msg += `   Gross Margin: ${profitability.grossMargin}%\n`;
    msg += `   Net Profit:   ₦${formatCurrency(profitability.netProfit)}\n`;
    msg += `   Net Margin:   ${profitability.netMargin}%\n\n`;

    // Transactions
    msg += `📊 TRANSACTIONS\n`;
    msg += `   Sales:        ${transactions.sales}\n`;
    msg += `   Incomes:      ${transactions.incomes}\n`;
    msg += `   Expenses:     ${transactions.expenses}\n`;
    msg += `   Purchases:    ${transactions.purchases}\n\n`;

    // Inventory (Monthly includes this)
    if (inventory) {
        msg += `📦 INVENTORY\n`;
        msg += `   Total Value:  ₦${formatCurrency(inventory.totalValue)}\n`;
        msg += `   Pot. Profit:  ₦${formatCurrency(inventory.potentialProfit)}\n`;
        if (inventory.lowStockCount > 0) {
            msg += `   ⚠️ Low Stock:  ${inventory.lowStockCount} items\n`;
        } else {
            msg += `   ✅ Stock levels healthy\n`;
        }
        msg += `\n`;
    }

    // Top Products
    if (topProducts.length > 0) {
        msg += `📦 TOP PERFORMING PRODUCTS\n`;
        topProducts.forEach((product, index) => {
            msg += `   ${index + 1}. ${product.name}: ₦${formatCurrency(product.revenue)} (${product.quantity} unit${product.quantity > 1 ? 's' : ''})\n`;
        });
        msg += `\n`;
    }

    // Customers
    if (customers.total > 0) {
        msg += `👥 CUSTOMERS\n`;
        msg += `   Total:        ${customers.total}\n`;
        if (customers.top.length > 0) {
            msg += `   Top Customer: ${customers.top[0].name} (₦${formatCurrency(customers.top[0].total)})\n`;
        }
        msg += `\n`;
    }

    // Receivables
    if (receivables.debtors > 0 || receivables.creditors > 0) {
        msg += `💳 RECEIVABLES & PAYABLES\n`;
        if (receivables.debtors > 0) {
            msg += `   Debtors:      ₦${formatCurrency(receivables.debtors)} (${receivables.debtorCount} active)\n`;
        }
        if (receivables.creditors > 0) {
            msg += `   Creditors:    ₦${formatCurrency(receivables.creditors)} (${receivables.creditorCount} active)\n`;
        }
        msg += `\n`;
    }

    // Alerts
    if (alerts.length > 0) {
        msg += `⚠️ ALERTS\n`;
        alerts.forEach(alert => {
            msg += `   ${alert.message}\n`;
        });
        msg += `\n`;
    } else {
        msg += `✅ ALERTS: No alerts\n\n`;
    }

    msg += `===========================================\n`;
    msg += `📱 @AICFOENTRISE_BOT | AI CFO ENTERPRISE`;

    return msg;
}

/**
 * Format yearly report (Plain Text)
 */
function formatYearlyReport(report) {
    const { period, revenue, costs, profitability, transactions, topProducts, customers, receivables, inventory, alerts } = report;

    const dateStr = `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;

    let msg = `📊 YEARLY PERFORMANCE REPORT\n`;
    msg += `===========================================\n`;
    msg += `📅 ${dateStr}\n\n`;

    // Revenue
    msg += `💰 REVENUE\n`;
    msg += `   Sales:        ₦${formatCurrency(revenue.sales)}\n`;
    msg += `   Other Income: ₦${formatCurrency(revenue.income)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(revenue.total)}\n\n`;

    // Costs
    msg += `💸 COSTS\n`;
    msg += `   Purchases:    ₦${formatCurrency(costs.purchases)}\n`;
    msg += `   Expenses:     ₦${formatCurrency(costs.expenses)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(costs.total)}\n\n`;

    // Profitability
    msg += `📈 PROFITABILITY\n`;
    msg += `   Gross Profit: ₦${formatCurrency(profitability.grossProfit)}\n`;
    msg += `   Gross Margin: ${profitability.grossMargin}%\n`;
    msg += `   Net Profit:   ₦${formatCurrency(profitability.netProfit)}\n`;
    msg += `   Net Margin:   ${profitability.netMargin}%\n\n`;

    // Transactions
    msg += `📊 TRANSACTIONS\n`;
    msg += `   Sales:        ${transactions.sales}\n`;
    msg += `   Incomes:      ${transactions.incomes}\n`;
    msg += `   Expenses:     ${transactions.expenses}\n`;
    msg += `   Purchases:    ${transactions.purchases}\n\n`;

    // Inventory (Yearly includes this)
    if (inventory) {
        msg += `📦 INVENTORY\n`;
        msg += `   Total Value:  ₦${formatCurrency(inventory.totalValue)}\n`;
        msg += `   Pot. Profit:  ₦${formatCurrency(inventory.potentialProfit)}\n`;
        if (inventory.lowStockCount > 0) {
            msg += `   ⚠️ Low Stock:  ${inventory.lowStockCount} items\n`;
        } else {
            msg += `   ✅ Stock levels healthy\n`;
        }
        msg += `\n`;
    }

    // Top Products
    if (topProducts.length > 0) {
        msg += `📦 TOP PERFORMING PRODUCTS\n`;
        topProducts.forEach((product, index) => {
            msg += `   ${index + 1}. ${product.name}: ₦${formatCurrency(product.revenue)} (${product.quantity} unit${product.quantity > 1 ? 's' : ''})\n`;
        });
        msg += `\n`;
    }

    // Customers
    if (customers.total > 0) {
        msg += `👥 CUSTOMERS\n`;
        msg += `   Total:        ${customers.total}\n`;
        if (customers.top.length > 0) {
            msg += `   Top Customer: ${customers.top[0].name} (₦${formatCurrency(customers.top[0].total)})\n`;
        }
        msg += `\n`;
    }

    // Receivables
    if (receivables.debtors > 0 || receivables.creditors > 0) {
        msg += `💳 RECEIVABLES & PAYABLES\n`;
        if (receivables.debtors > 0) {
            msg += `   Debtors:      ₦${formatCurrency(receivables.debtors)} (${receivables.debtorCount} active)\n`;
        }
        if (receivables.creditors > 0) {
            msg += `   Creditors:    ₦${formatCurrency(receivables.creditors)} (${receivables.creditorCount} active)\n`;
        }
        msg += `\n`;
    }

    // Alerts
    if (alerts.length > 0) {
        msg += `⚠️ ALERTS\n`;
        alerts.forEach(alert => {
            msg += `   ${alert.message}\n`;
        });
        msg += `\n`;
    } else {
        msg += `✅ ALERTS: No alerts\n\n`;
    }

    msg += `===========================================\n`;
    msg += `📱 @AICFOENTRISE_BOT | AI CFO ENTERPRISE`;

    return msg;
}

/**
 * Format executive summary (Plain Text)
 */
function formatExecutiveSummary(report) {
    const { period, revenue, costs, profitability, customers, receivables, inventory, alerts } = report;

    const dateStr = `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;

    let msg = `📊 EXECUTIVE SUMMARY\n`;
    msg += `===========================================\n`;
    msg += `📅 ${dateStr}\n\n`;

    // Revenue
    msg += `💰 REVENUE\n`;
    msg += `   Sales:        ₦${formatCurrency(revenue.sales)}\n`;
    msg += `   Other Income: ₦${formatCurrency(revenue.income)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(revenue.total)}\n\n`;

    // Costs
    msg += `💸 COSTS\n`;
    msg += `   Purchases:    ₦${formatCurrency(costs.purchases)}\n`;
    msg += `   Expenses:     ₦${formatCurrency(costs.expenses)}\n`;
    msg += `   ─────────────────────\n`;
    msg += `   Total:        ₦${formatCurrency(costs.total)}\n\n`;

    // Profitability
    msg += `📈 PROFITABILITY\n`;
    msg += `   Gross Profit: ₦${formatCurrency(profitability.grossProfit)}\n`;
    msg += `   Gross Margin: ${profitability.grossMargin}%\n`;
    msg += `   Net Profit:   ₦${formatCurrency(profitability.netProfit)}\n`;
    msg += `   Net Margin:   ${profitability.netMargin}%\n\n`;

    // Inventory
    if (inventory) {
        msg += `📦 INVENTORY SUMMARY\n`;
        msg += `   Total Value:  ₦${formatCurrency(inventory.totalValue)}\n`;
        msg += `   Pot. Profit:  ₦${formatCurrency(inventory.potentialProfit)}\n`;
        if (inventory.lowStockCount > 0) {
            msg += `   ⚠️ Low Stock:  ${inventory.lowStockCount} items\n`;
        } else {
            msg += `   ✅ Stock levels healthy\n`;
        }
        msg += `\n`;
    }

    // Receivables & Payables
    if (receivables.debtors > 0 || receivables.creditors > 0) {
        msg += `💳 RECEIVABLES & PAYABLES\n`;
        if (receivables.debtors > 0) {
            msg += `   Total Debtors:  ₦${formatCurrency(receivables.debtors)}\n`;
        }
        if (receivables.creditors > 0) {
            msg += `   Total Creditors: ₦${formatCurrency(receivables.creditors)}\n`;
        }
        msg += `\n`;
    }

    // Key Metrics
    msg += `📊 KEY METRICS\n`;
    const daysInPeriod = Math.max(1, Math.ceil((new Date(period.endDate) - new Date(period.startDate)) / (1000 * 60 * 60 * 24)));
    const dailyAvgRevenue = revenue.total / daysInPeriod;
    msg += `   Daily Avg Revenue: ₦${formatCurrency(dailyAvgRevenue)}\n`;
    msg += `   Period Revenue:    ₦${formatCurrency(revenue.total)}\n`;
    if (profitability.netProfit > 0) {
        msg += `   Profit Status:     ✅ Profitable\n`;
    } else if (profitability.netProfit < 0) {
        msg += `   Profit Status:     ⚠️ Loss\n`;
    } else {
        msg += `   Profit Status:     ⚖️ Breakeven\n`;
    }
    msg += `\n`;

    // Alerts
    if (alerts.length > 0) {
        msg += `⚠️ ALERTS\n`;
        alerts.forEach(alert => {
            msg += `   ${alert.message}\n`;
        });
        msg += `\n`;
    } else {
        msg += `✅ ALERTS: No alerts\n\n`;
    }

    msg += `===========================================\n`;
    msg += `📱 @AICFOENTRISE_BOT | AI CFO ENTERPRISE`;

    return msg;
}

/**
 * Helper: Format currency
 */
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('en-US');
}

/**
 * Helper: Format date
 */
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

module.exports = {
    formatDailyReport,
    formatWeeklyReport,
    formatMonthlyReport,
    formatYearlyReport,
    formatExecutiveSummary,
    formatCurrency,
    formatDate,
};