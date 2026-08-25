// src/application/services/report/ReportFormulas.js

class ReportFormulas {
    static calculateMargins(sales, cogs, expenses, income) {
        const grossProfit = sales - cogs;
        const operatingProfit = grossProfit - expenses;
        const netProfit = operatingProfit + income;
        const totalRevenue = sales + income;
        
        return {
            grossProfit,
            operatingProfit,
            netProfit,
            grossMargin: sales > 0 ? parseFloat(((grossProfit / sales) * 100).toFixed(1)) : 0,
            operatingMargin: totalRevenue > 0 ? parseFloat(((operatingProfit / totalRevenue) * 100).toFixed(1)) : 0,
            netMargin: totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0,
        };
    }

    static calculateGrowth(current, previous) {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    }

    static calculateTurnover(purchases, inventoryValue) {
        if (!inventoryValue || inventoryValue === 0) return 0;
        return purchases / inventoryValue;
    }

    static calculateRatios(debtors, creditors, revenue, inventory) {
        return {
            currentRatio: creditors > 0 ? parseFloat((debtors / creditors).toFixed(2)) : 0,
            quickRatio: creditors > 0 ? parseFloat(((revenue - inventory) / creditors).toFixed(2)) : 0,
            debtToEquity: revenue > 0 ? parseFloat((debtors / revenue).toFixed(2)) : 0,
        };
    }
}

module.exports = ReportFormulas;