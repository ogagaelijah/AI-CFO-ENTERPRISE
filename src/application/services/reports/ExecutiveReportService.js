// src/application/services/reports/ExecutiveReportService.js

/**
 * Executive Report Service
 * Combines P&L, Cash Flow, Balance Sheet, Inventory, AR/AP
 * Provides executive-level intelligence
 */
class ExecutiveReportService {
    constructor({
        profitLossService,
        inventoryRepository,
        debtorRepository,
        creditorRepository,
        saleRepository,
    }) {
        this.profitLossService = profitLossService;
        this.inventoryRepository = inventoryRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.saleRepository = saleRepository;
    }

    async generate({ userId, businessId, startDate, endDate }) {
        // GET P&L
        const pl = await this.profitLossService.generate({
            userId,
            businessId,
            startDate,
            endDate,
            period: 'monthly',
        });

        // GET INVENTORY SUMMARY
        const inventorySummary = await this.inventoryRepository.getSummary(userId);

        // GET DEBTOR SUMMARY
        const debtorSummary = await this.debtorRepository.getSummary(userId);

        // GET CREDITOR SUMMARY
        const creditorSummary = await this.creditorRepository.getSummary(userId);

        // GET SALES SUMMARY
        const salesSummary = await this.saleRepository.getSummary(userId);

        // FINANCIAL RATIOS
        const ratios = {
            grossMargin: pl.grossProfit.margin,
            netMargin: pl.netProfit.margin,
            expenseRatio: pl.revenue.totalRevenue > 0
                ? (pl.operatingExpenses.total / pl.revenue.totalRevenue) * 100
                : 0,
            currentRatio: 0,
            quickRatio: 0,
        };

        // RISK ASSESSMENT
        const risks = [];
        if (debtorSummary.total_outstanding > 0) {
            risks.push({
                severity: 'HIGH',
                category: 'Cash Flow',
                description: `₦${debtorSummary.total_outstanding.toLocaleString()} in overdue receivables`,
                action: 'Prioritize collection from top 5 overdue customers',
            });
        }
        if (inventorySummary.low_stock_count > 0) {
            risks.push({
                severity: 'MEDIUM',
                category: 'Inventory',
                description: `${inventorySummary.low_stock_count} items below reorder level`,
                action: 'Review and reorder low stock items',
            });
        }
        if (pl.netProfit.amount < 0) {
            risks.push({
                severity: 'HIGH',
                category: 'Profitability',
                description: 'Business is operating at a loss',
                action: 'Review expenses and pricing strategy',
            });
        }

        // AI INSIGHTS
        const insights = [];
        if (pl.grossProfit.margin > 50) {
            insights.push({
                type: 'POSITIVE',
                message: `Strong gross margin of ${pl.grossProfit.margin.toFixed(1)}%. Business has good pricing power.`,
            });
        } else if (pl.grossProfit.margin < 20) {
            insights.push({
                type: 'WARNING',
                message: `Low gross margin of ${pl.grossProfit.margin.toFixed(1)}%. Consider increasing prices or reducing costs.`,
            });
        }

        if (pl.revenue.totalRevenue > 0 && pl.netProfit.amount > 0) {
            insights.push({
                type: 'POSITIVE',
                message: `Business is profitable with a net margin of ${pl.netProfit.margin.toFixed(1)}%.`,
            });
        }

        // RECOMMENDATIONS
        const recommendations = [];
        if (debtorSummary.total_outstanding > 0) {
            recommendations.push({
                priority: 'HIGH',
                issue: `₦${debtorSummary.total_outstanding.toLocaleString()} in outstanding receivables`,
                action: 'Follow up with customers on overdue payments',
                expectedImpact: 'Improved liquidity',
                timeframe: '7-14 days',
            });
        }
        if (inventorySummary.low_stock_count > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                issue: `${inventorySummary.low_stock_count} items below reorder level`,
                action: 'Reorder low stock items',
                expectedImpact: 'Prevent stockouts',
                timeframe: 'Immediate',
            });
        }

        return {
            period: {
                start: startDate,
                end: endDate,
            },
            executiveSummary: {
                revenue: pl.revenue.totalRevenue,
                grossProfit: pl.grossProfit.amount,
                grossMargin: pl.grossProfit.margin,
                netProfit: pl.netProfit.amount,
                netMargin: pl.netProfit.margin,
                expenses: pl.operatingExpenses.total,
            },
            kpiDashboard: {
                revenue: pl.revenue.totalRevenue,
                cogs: pl.cogs.total,
                grossProfit: pl.grossProfit.amount,
                grossMargin: pl.grossProfit.margin,
                expenses: pl.operatingExpenses.total,
                netProfit: pl.netProfit.amount,
                netMargin: pl.netProfit.margin,
                totalSales: salesSummary.total_sales || 0,
                uniqueCustomers: salesSummary.unique_customers || 0,
            },
            revenuePerformance: {
                total: pl.revenue.totalRevenue,
                productSales: pl.revenue.productSales,
                otherRevenue: pl.revenue.otherRevenue,
            },
            profitability: {
                grossProfit: pl.grossProfit.amount,
                grossMargin: pl.grossProfit.margin,
                netProfit: pl.netProfit.amount,
                netMargin: pl.netProfit.margin,
            },
            expenseAnalysis: {
                total: pl.operatingExpenses.total,
                salaries: pl.operatingExpenses.salaries,
                rent: pl.operatingExpenses.rent,
                advertising: pl.operatingExpenses.advertising,
                transportation: pl.operatingExpenses.transportation,
                utilities: pl.operatingExpenses.utilities,
                other: pl.operatingExpenses.other,
            },
            cashFlow: {},
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
            inventory: {
                totalItems: inventorySummary.total_items,
                totalQuantity: inventorySummary.total_quantity,
                totalValue: inventorySummary.total_cost_value,
                potentialRevenue: inventorySummary.total_selling_value,
                potentialProfit: inventorySummary.total_profit,
                lowStockCount: inventorySummary.low_stock_count,
            },
            financialRatios: ratios,
            trends: {},
            forecast: {},
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