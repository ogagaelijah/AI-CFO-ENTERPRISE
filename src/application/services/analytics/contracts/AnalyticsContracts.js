/**
 * Analytics Contracts - Production Implementation
 * Single source of truth for all financial analysis payloads.
 * IFRS Compliant | Audit Trail Enabled | Zero Division Safe
 */

const KPI_CATEGORIES = {
    REVENUE: 'revenue',
    PROFITABILITY: 'profitability',
    EXPENSE: 'expense',
    CASH: 'cash',
    INVENTORY: 'inventory',
    CUSTOMER: 'customer'
};

const KPI_DEFINITIONS = {
    // Revenue
    revenue: { displayName: 'Revenue', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.REVENUE },
    salesCount: { displayName: 'Sales Count', unit: 'count', format: '{value}', category: KPI_CATEGORIES.REVENUE },
    averageTransactionValue: { displayName: 'Average Transaction Value', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.REVENUE },
    revenueGrowth: { displayName: 'Revenue Growth', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.REVENUE },

    // Profitability
    grossProfit: { displayName: 'Gross Profit', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.PROFITABILITY },
    grossMargin: { displayName: 'Gross Margin', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.PROFITABILITY },
    grossProfitGrowth: { displayName: 'Gross Profit Growth', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.PROFITABILITY }, // ✅ ADDED
    operatingProfit: { displayName: 'Operating Profit', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.PROFITABILITY },
    netProfit: { displayName: 'Net Profit', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.PROFITABILITY },
    netMargin: { displayName: 'Net Margin', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.PROFITABILITY },
    profitGrowth: { displayName: 'Profit Growth', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.PROFITABILITY },

    // Expense
    totalExpenses: { displayName: 'Total Expenses', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.EXPENSE },
    expenseRatio: { displayName: 'Expense Ratio', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.EXPENSE },
    expenseGrowth: { displayName: 'Expense Growth', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.EXPENSE },

    // Cash
    netCashFlow: { displayName: 'Net Cash Flow', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.CASH },
    cashFlowMargin: { displayName: 'Cash Flow Margin', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.CASH },
    receivablesRatio: { displayName: 'Receivables Ratio', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.CASH },

    // Inventory
    inventoryValue: { displayName: 'Inventory Value', unit: 'currency', format: '₦{value}', category: KPI_CATEGORIES.INVENTORY },
    inventoryTurnover: { displayName: 'Inventory Turnover', unit: 'ratio', format: '{value}x', category: KPI_CATEGORIES.INVENTORY },
    lowStockCount: { displayName: 'Low Stock Count', unit: 'count', format: '{value}', category: KPI_CATEGORIES.INVENTORY }, // ✅ ADDED for InventoryKpi

    // Customer
    customerCount: { displayName: 'Customer Count', unit: 'count', format: '{value}', category: KPI_CATEGORIES.CUSTOMER },
    customerConcentration: { displayName: 'Customer Concentration', unit: 'percent', format: '{value}%', category: KPI_CATEGORIES.CUSTOMER },
};

class AnalyticsContracts {

    static _round2(num) {
        if (num === null || num === undefined || isNaN(num)) return null;
        return Math.round(num * 100) / 100;
    }

    /**
     * Factory method to build clean corporate KPIs safely
     */
    static createKpi({ name, value, previousValue = null, period, source = 'ReportEngine' }) {
        const definition = KPI_DEFINITIONS[name];
        if (!definition) {
            throw new Error(`Unknown KPI name: ${name}`);
        }

        let direction = 'STABLE';
        let absoluteChange = null;
        let percentageChange = null;

        if (value!== null && previousValue!== null) {
            absoluteChange = this._round2(value - previousValue);

            // PRODUCTION PROTECTION: Safe trend-line guard against cross-zero and zero dividers
            if (previousValue === 0 || previousValue < 0) {
                percentageChange = null;
            } else {
                percentageChange = this._round2(((value - previousValue) / previousValue) * 100);
            }

            if (absoluteChange > 0) direction = 'UP';
            if (absoluteChange < 0) direction = 'DOWN';
        } else if (previousValue === null) {
            direction = 'N/A';
        }

        const dataStatus = value === null? 'INSUFFICIENT_DATA' : (value < 0? 'NEGATIVE' : 'VALID');

        return {
            name,
            displayName: definition.displayName,
            value: value === null? null : this._round2(value),
            previousValue: previousValue === null? null : this._round2(previousValue),
            unit: definition.unit,
            format: definition.format,
            period,
            category: definition.category,
            dataStatus,
            direction,
            absoluteChange,
            percentageChange,
            source,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Factory method to build financial variant comparisons
     */
    static createComparison({ metric, displayName, current, previous, currentPeriodLabel, previousPeriodLabel, comparisonType = 'PREVIOUS_PERIOD' }) {
        const absoluteChange = this._round2(current - previous);
        const percentageChange = previous <= 0? null : this._round2((absoluteChange / previous) * 100);

        let direction = 'NO_CHANGE';
        if (absoluteChange > 0) direction = 'INCREASE';
        if (absoluteChange < 0) direction = 'DECREASE';

        return {
            metric,
            displayName,
            current: this._round2(current),
            previous: this._round2(previous),
            absoluteChange,
            percentageChange,
            direction,
            periodLabel: currentPeriodLabel,
            previousPeriodLabel,
            comparisonType,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Factory method to create an issue alert signal
     */
    static createSignal({ metric, displayName, type, severity, direction, currentValue, previousValue, change, message, action }) {
        return {
            metric,
            displayName,
            type,
            severity,
            direction,
            currentValue: this._round2(currentValue),
            previousValue: this._round2(previousValue),
            change: this._round2(change),
            message,
            action,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Factory method to map safe mathematical trends over ranges
     */
    static createTrend({ metric, displayName, data = [], unit = 'currency' }) {
        if (!data || data.length === 0) {
            return {
                metric,
                displayName,
                data: [],
                current: null,
                previous: null,
                absoluteChange: null,
                percentageChange: null,
                direction: 'STABLE',
                status: 'NEUTRAL',
                unit,
                min: null,
                max: null,
                average: null,
                generatedAt: new Date().toISOString()
            };
        }

        const sanitizedValues = data.map(pt => pt.value).filter(v => v!== null &&!isNaN(v));

        if (sanitizedValues.length === 0) {
            return {
                metric,
                displayName,
                data,
                current: null,
                previous: null,
                absoluteChange: null,
                percentageChange: null,
                direction: 'STABLE',
                status: 'NEUTRAL',
                unit,
                min: null,
                max: null,
                average: null,
                generatedAt: new Date().toISOString()
            };
        }

        const current = sanitizedValues[sanitizedValues.length - 1];
        const previous = sanitizedValues.length > 1? sanitizedValues[sanitizedValues.length - 2] : null;

        let absoluteChange = null;
        let percentageChange = null;
        let direction = 'STABLE';

        if (previous!== null && previous > 0) {
            absoluteChange = this._round2(current - previous);
            percentageChange = this._round2((absoluteChange / previous) * 100);

            if (absoluteChange > 0) direction = percentageChange > 20? 'STRONG_UP' : 'UP';
            if (absoluteChange < 0) direction = percentageChange < -20? 'STRONG_DOWN' : 'DOWN';
        } else if (previous!== null) {
            absoluteChange = this._round2(current - previous);
            if (absoluteChange > 0) direction = 'UP';
            if (absoluteChange < 0) direction = 'DOWN';
        }

        const min = Math.min(...sanitizedValues);
        const max = Math.max(...sanitizedValues);
        const sum = sanitizedValues.reduce((s, v) => s + v, 0);
        const average = this._round2(sum / sanitizedValues.length);

        return {
            metric,
            displayName,
            data,
            current: this._round2(current),
            previous: previous!== null? this._round2(previous) : null,
            absoluteChange,
            percentageChange,
            direction,
            status: current >= average? 'POSITIVE' : 'NEGATIVE',
            unit,
            min: this._round2(min),
            max: this._round2(max),
            average,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Factory method to safely handle ratios
     */
    static createRatio({ name, displayName, value, previousValue = null, category, interpretation = 'HIGHER_IS_BETTER', formula }) {
        const change = previousValue!== null? this._round2(value - previousValue) : null;

        let direction = 'STABLE';
        if (change!== null) {
            if (change > 0) direction = interpretation === 'HIGHER_IS_BETTER'? 'IMPROVING' : 'DECLINING';
            if (change < 0) direction = interpretation === 'LOWER_IS_BETTER'? 'IMPROVING' : 'DECLINING';
        }

        return {
            name,
            displayName,
            value: this._round2(value),
            previousValue: previousValue!== null? this._round2(previousValue) : null,
            category,
            interpretation,
            dataStatus: value === null? 'INSUFFICIENT_DATA' : 'VALID',
            direction,
            change,
            formula
        };
    }
}

module.exports = {
    AnalyticsContracts,
    KPI_CATEGORIES,
    KPI_DEFINITIONS
};