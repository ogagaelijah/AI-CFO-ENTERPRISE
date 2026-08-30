// src/application/services/reports/ExecutiveReportService.js

const RevenueCalculator = require('./calculators/RevenueCalculator');
const CogsCalculator = require('./calculators/CogsCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');
const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ComparisonCalculator = require('./calculators/ComparisonCalculator');

/**
 * Executive Report Service - Refactored to use canonical calculators
 *
 * Composite report combining:
 * - P&L
 * - Cash Flow
 * - Balance Sheet
 * - Sales
 * - Expenses
 * - Inventory
 * - AR
 * - AP
 * - KPIs
 * - Risks
 * - Insights
 * - Recommendations
 *
 * All data flows through canonical calculators (single source of truth)
 */
class ExecutiveReportService {
    constructor({
        saleRepository,
        purchaseRepository,
        expenseRepository,
        incomeRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        paymentRepository,
        revenueCalculator = null,
        cogsCalculator = null,
        profitCalculator = null,
        cashCalculator = null,
        arCalculator = null,
        apCalculator = null,
        inventoryCalculator = null,
        comparisonCalculator = null,
    }) {
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
        this.paymentRepository = paymentRepository;

        // Initialize calculators
        this.revenueCalculator = revenueCalculator || new RevenueCalculator({
            saleRepository: this.saleRepository,
        });

        this.cogsCalculator = cogsCalculator || new CogsCalculator({
            saleRepository: this.saleRepository,
        });

        this.profitCalculator = profitCalculator || new ProfitCalculator({
            saleRepository: this.saleRepository,
            expenseRepository: this.expenseRepository,
            incomeRepository: this.incomeRepository,
        });

        this.cashCalculator = cashCalculator || new CashCalculator({
            paymentRepository: this.paymentRepository,
        });

        this.arCalculator = arCalculator || new ARCalculator({
            debtorRepository: this.debtorRepository,
        });

        this.apCalculator = apCalculator || new APCalculator({
            creditorRepository: this.creditorRepository,
        });

        this.inventoryCalculator = inventoryCalculator || new InventoryCalculator({
            inventoryRepository: this.inventoryRepository,
        });

        this.comparisonCalculator = comparisonCalculator || new ComparisonCalculator();
    }

    _safeArray(result) {
        return Array.isArray(result)? result : [];
    }

    _safeNumber(value) {
        const num = Number(value);
        return isNaN(num)? 0 : num;
    }

    _parseDate(dateStr) {
        if (!dateStr) return new Date();
        const parts = dateStr.split('T')[0].split('-');
        return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
            0, 0, 0, 0
        );
    }

    _formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async generate({ userId, businessId, startDate, endDate }) {
        const start = startDate? this._parseDate(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate? this._parseDate(endDate) : new Date();
        const startStr = this._formatDateStr(start);
        const endStr = this._formatDateStr(end);

        // =============================================
        // 1. GET DATA FROM ALL CALCULATORS (parallel)
        // =============================================

        const [revenueData, cogsData] = await Promise.all([
            this.revenueCalculator.calculate({ userId, businessId, startDate: startStr, endDate: endStr }),
            this.cogsCalculator.calculate({ userId, businessId, startDate: startStr, endDate: endStr }),
        ]);

        // PERMANENT FIX: Fetch expenses + income first and pass to ProfitCalculator
        const [expenses, income] = await Promise.all([
            this.expenseRepository.findByDateRange(userId, startStr, endStr).catch(() => []),
            this.incomeRepository.findByDateRange(userId, startStr, endStr).catch(() => [])
        ]);

        const profitData = await this.profitCalculator.calculate({
            userId,
            businessId,
            startDate: startStr,
            endDate: endStr,
            revenueData: { totalRevenue: revenueData.totalRevenue },
            cogsData: { totalCogs: cogsData.totalCogs },
            expenseData: { total: expenses.reduce((s,e) => s + this._safeNumber(e.amount), 0) },
            incomeData: { total: income.reduce((s,i) => s + this._safeNumber(i.amount), 0) },
        });

        const [cashData, arData, apData, inventoryData] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: startStr, endDate: endStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: endStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: endStr }),
            this.inventoryCalculator.calculate({ userId, businessId, includeDetails: false, lowStockThreshold: 5 }),
        ]);

        // =============================================
        // 2. GET TOP PRODUCTS & CUSTOMERS - USE SALES FROM REVENUECALCULATOR
        // =============================================

        let sales = this._safeArray(revenueData.sales);

        const productSales = {};
        for (const sale of sales) {
            const key = sale.item_name || 'Unknown';
            if (!productSales[key]) productSales[key] = 0;
            productSales[key] += this._safeNumber(sale.total_price);
        }

        const topProducts = Object.entries(productSales)
           .map(([name, amount]) => ({ name, amount }))
           .sort((a, b) => b.amount - a.amount)
           .slice(0, 5);

        const customerSales = {};
        for (const sale of sales) {
            const key = sale.customer_name || 'Unknown';
            if (!customerSales[key]) customerSales[key] = 0;
            customerSales[key] += this._safeNumber(sale.total_price);
        }

        const topCustomers = Object.entries(customerSales)
           .map(([name, amount]) => ({ name, amount }))
           .sort((a, b) => b.amount - a.amount)
           .slice(0, 5);

        // =============================================
        // 3. GET EXPENSE BREAKDOWN - USE CACHED EXPENSES
        // =============================================

        const expenseDrivers = {};
        for (const expense of expenses) {
            const key = expense.category || 'Other';
            if (!expenseDrivers[key]) expenseDrivers[key] = 0;
            expenseDrivers[key] += this._safeNumber(expense.amount);
        }

        const topExpenses = Object.entries(expenseDrivers)
           .map(([category, amount]) => ({ category, amount }))
           .sort((a, b) => b.amount - a.amount)
           .slice(0, 5);

        // =============================================
        // 4. FINANCIAL RATIOS - USE SSOT FROM PROFITCALCULATOR
        // =============================================

        const productRevenue = revenueData.totalRevenue || 0;
        const totalRevenue = profitData.totalRevenue || 0;
        const totalCogs = profitData.totalCogs || 0;
        const grossProfit = profitData.grossProfit || 0;
        const totalExpenses = profitData.totalExpenses || 0;
        const netProfit = profitData.netProfit || 0;

        const totalAssets = (cashData.closingCash || 0) + (arData.totalOutstanding || 0) + (inventoryData.totalCostValue || 0);
        const totalLiabilities = apData.totalOutstanding || 0;
        const totalEquity = totalAssets - totalLiabilities;

        const ratios = {
            grossMargin: profitData.grossMargin || 0,
            netMargin: profitData.netMargin || 0, // SSOT
            expenseRatio: totalRevenue > 0? (totalExpenses / totalRevenue) * 100 : 0,
            currentRatio: totalLiabilities > 0? totalAssets / totalLiabilities : 0,
        };

        // =============================================
        // 5. RISK ASSESSMENT
        // =============================================

        const risks = [];

        if (arData.overdueAmount && arData.overdueAmount > 0) {
            risks.push({
                severity: 'HIGH',
                category: 'Cash Flow',
                description: `₦${arData.overdueAmount.toLocaleString()} in overdue receivables`,
                action: 'Prioritize collection from top overdue customers',
            });
        }

        if (inventoryData.lowStockCount && inventoryData.lowStockCount > 0) {
            risks.push({
                severity: 'MEDIUM',
                category: 'Inventory',
                description: `${inventoryData.lowStockCount} items below reorder level`,
                action: 'Review and reorder low stock items',
            });
        }

        if (netProfit < 0) {
            risks.push({
                severity: 'HIGH',
                category: 'Profitability',
                description: 'Business is operating at a loss',
                action: 'Review expenses and pricing strategy',
            });
        }

        if (cashData.closingCash < 0) {
            risks.push({
                severity: 'HIGH',
                category: 'Liquidity',
                description: 'Negative cash position',
                action: 'Review cash flow and immediate expenses',
            });
        }

        // =============================================
        // 6. INSIGHTS
        // =============================================

        const insights = [];

        if (ratios.grossMargin > 50) {
            insights.push({
                type: 'POSITIVE',
                message: `Strong gross margin of ${ratios.grossMargin.toFixed(1)}%. Business has good pricing power.`,
            });
        } else if (ratios.grossMargin < 20 && ratios.grossMargin > 0) {
            insights.push({
                type: 'WARNING',
                message: `Low gross margin of ${ratios.grossMargin.toFixed(1)}%. Consider increasing prices or reducing costs.`,
            });
        }

        if (netProfit > 0) {
            insights.push({
                type: 'POSITIVE',
                message: `Business is profitable with a net margin of ${ratios.netMargin.toFixed(1)}%.`,
            });
        }

        if (arData.totalOutstanding > 0 && totalRevenue > 0) {
            const arRatio = (arData.totalOutstanding / totalRevenue) * 100;
            if (arRatio > 30) {
                insights.push({
                    type: 'WARNING',
                    message: `Receivables are ${arRatio.toFixed(1)}% of revenue. Review collection process.`,
                });
            }
        }

        // =============================================
        // 7. RECOMMENDATIONS
        // =============================================

        const recommendations = [];

        if (arData.overdueAmount && arData.overdueAmount > 0) {
            recommendations.push({
                priority: 'HIGH',
                issue: `₦${arData.overdueAmount.toLocaleString()} in overdue receivables`,
                action: 'Follow up with customers on overdue payments',
                expectedImpact: 'Improved liquidity',
                timeframe: '7-14 days',
            });
        }

        if (inventoryData.lowStockCount && inventoryData.lowStockCount > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                issue: `${inventoryData.lowStockCount} items below reorder level`,
                action: 'Reorder low stock items',
                expectedImpact: 'Prevent stockouts',
                timeframe: 'Immediate',
            });
        }

        if (netProfit < 0) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'Business is operating at a loss',
                action: 'Review all expense categories and pricing',
                expectedImpact: 'Return to profitability',
                timeframe: '30 days',
            });
        }

        // =============================================
        // 8. WORKING CAPITAL
        // =============================================

        const workingCapital = totalAssets - totalLiabilities;

        // =============================================
        // 9. RETURN FULL EXECUTIVE REPORT
        // =============================================

        return {
            period: {
                start: startStr,
                end: endStr,
            },
            executiveSummary: {
                revenue: totalRevenue, // 315000
                grossProfit: grossProfit, // 195000
                grossMargin: ratios.grossMargin, // 61.9
                netProfit: netProfit, // 165000
                netMargin: ratios.netMargin, // 52.38
                expenses: totalExpenses, // 30000
                cash: cashData.closingCash || 0,
                receivables: arData.totalOutstanding || 0,
                payables: apData.totalOutstanding || 0,
                inventory: inventoryData.totalCostValue || 0,
            },
            kpiDashboard: {
                revenue: totalRevenue,
                cogs: totalCogs,
                grossProfit: grossProfit,
                grossMargin: ratios.grossMargin,
                expenses: totalExpenses,
                netProfit: netProfit,
                netMargin: ratios.netMargin,
                totalSales: sales.length || 0,
                uniqueCustomers: Object.keys(customerSales).length || 0,
            },
            revenuePerformance: {
                total: totalRevenue,
                productSales: productRevenue,
                otherRevenue: profitData.otherIncome || 0,
                topProducts,
                topCustomers,
            },
            profitability: {
                grossProfit,
                grossMargin: ratios.grossMargin,
                netProfit,
                netMargin: ratios.netMargin,
                expenseRatio: ratios.expenseRatio,
            },
            expenseAnalysis: {
                total: totalExpenses,
                topExpenses,
            },
            cashFlow: {
                opening: cashData.openingCash || 0,
                closing: cashData.closingCash || 0,
                netChange: (cashData.closingCash || 0) - (cashData.openingCash || 0),
                cashIn: cashData.cashIn || 0,
                cashOut: cashData.cashOut || 0,
            },
            receivables: {
                totalOutstanding: arData.totalOutstanding || 0,
                activeCount: arData.activeCount || 0,
                overdueCount: arData.overdueCount || 0,
                overdueAmount: arData.overdueAmount || 0,
                aging: arData.aging || null,
            },
            payables: {
                totalOutstanding: apData.totalOutstanding || 0,
                activeCount: apData.activeCount || 0,
                overdueCount: apData.overdueCount || 0,
                overdueAmount: apData.overdueAmount || 0,
                aging: apData.aging || null,
            },
            inventory: {
                totalItems: inventoryData.totalItems || 0,
                totalQuantity: inventoryData.totalQuantity || 0,
                totalValue: inventoryData.totalCostValue || 0,
                potentialRevenue: inventoryData.totalSellingValue || 0,
                potentialProfit: inventoryData.totalPotentialProfit || 0,
                lowStockCount: inventoryData.lowStockCount || 0,
            },
            financialRatios: ratios,
            workingCapital: {
                totalAssets,
                totalLiabilities,
                totalEquity,
                workingCapital,
            },
            risks,
            insights,
            recommendations,
            managementActionPlan: recommendations.map(r => ({
               ...r,
                status: 'PENDING',
            })),
        };
    }
}

module.exports = ExecutiveReportService;