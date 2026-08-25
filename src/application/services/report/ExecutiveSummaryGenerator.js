// src/application/services/report/ExecutiveSummaryGenerator.js
const ReportHelpers = require('./ReportHelpers');
const ReportFormulas = require('./ReportFormulas');

class ExecutiveSummaryGenerator {
    constructor(reportGenerator) {
        this.reportGenerator = reportGenerator;
    }

    async generate(userId, date = new Date()) {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        const prevStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);
        const prevEnd = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);

        const current = await this.reportGenerator.generate(userId, monthStart, monthEnd, { includeInventory: true });
        const previous = await this.reportGenerator.generate(userId, prevStart, prevEnd, { includeInventory: true });
        const trendData = await this._getTrendData(userId, date);

        const r = current.revenue;
        const p = current.profitability;
        const c = current.costs;
        const rec = current.receivables;
        const inv = current.inventory;

        const revenueGrowth = ReportFormulas.calculateGrowth(r.total, previous.revenue.total);
        const profitGrowth = ReportFormulas.calculateGrowth(p.netProfit, previous.profitability.netProfit);
        const expenseGrowth = ReportFormulas.calculateGrowth(c.expenses, previous.costs.expenses);
        const ratios = ReportFormulas.calculateRatios(rec.debtors, rec.creditors, r.total, inv.totalValue);

        return {
            metadata: {
                generatedAt: new Date().toISOString(),
                period: ReportHelpers.getMonthName(monthStart),
                previousPeriod: ReportHelpers.getMonthName(prevStart),
            },
            executiveSummary: {
                businessHealth: p.netProfit > 0 && revenueGrowth > 0 && p.netMargin > 10 ? 'Excellent' : p.netProfit > 0 && revenueGrowth > 0 ? 'Good' : p.netProfit > 0 ? 'Fair' : 'Needs Attention',
                topAchievement: revenueGrowth > 20 ? `Revenue grew by ${revenueGrowth.toFixed(1)}%` : p.netMargin > 20 ? 'Strong profitability' : rec.debtors < previous.receivables.debtors ? 'Debtors reduced' : 'Stable performance',
                topRisk: inv.lowStockCount > 3 ? 'Low stock on critical items' : rec.debtors > r.total * 0.5 ? 'High debtor exposure' : p.netMargin < 5 ? 'Low profit margins' : 'No major risks',
            },
            kpiDashboard: {
                revenue: { current: r.total, previous: previous.revenue.total, change: revenueGrowth },
                grossProfit: { current: p.grossProfit, previous: previous.profitability.grossProfit, change: profitGrowth },
                netProfit: { current: p.netProfit, previous: previous.profitability.netProfit, change: profitGrowth },
                grossMargin: p.grossMargin,
                netMargin: p.netMargin,
                debtorsOutstanding: rec.debtors,
                creditorsOutstanding: rec.creditors,
            },
            revenueSales: { total: r.total, sales: r.sales, income: r.income, topProducts: current.topProducts.slice(0, 5), growth: revenueGrowth },
            profitability: {
                grossProfit: p.grossProfit,
                grossMargin: p.grossMargin,
                operatingProfit: p.operatingProfit,
                operatingMargin: p.operatingMargin,
                netProfit: p.netProfit,
                netMargin: p.netMargin,
                comparison: {
                    grossProfit: ReportFormulas.calculateGrowth(p.grossProfit, previous.profitability.grossProfit),
                    netProfit: ReportFormulas.calculateGrowth(p.netProfit, previous.profitability.netProfit),
                },
            },
            expenses: { total: c.expenses, comparison: expenseGrowth },
            cashFlow: {
                inflows: r.sales + r.income,
                outflows: c.purchases + c.expenses,
                net: (r.sales + r.income) - (c.purchases + c.expenses),
            },
            receivables: { total: rec.debtors, count: rec.debtorCount, overdue: rec.debtors * 0.3 },
            payables: { total: rec.creditors, count: rec.creditorCount, overdue: rec.creditors * 0.2 },
            inventory: {
                totalValue: inv.totalValue,
                totalItems: inv.totalItems,
                totalUnits: inv.totalUnits,
                lowStock: inv.lowStockCount,
                potentialProfit: inv.potentialProfit,
                turnover: ReportFormulas.calculateTurnover(c.purchases, inv.totalValue),
            },
            financialRatios: ratios,
            trends: {
                data: trendData,
                summary: this._getTrendSummary(trendData),
            },
            forecast: {
                nextMonthRevenue: r.total * (1 + revenueGrowth * 0.5),
                confidence: 'Medium',
                factors: ['Historical performance', 'Seasonal patterns', 'Market conditions'],
            },
            risks: this._getRisks(current),
            aiInsights: this._getAIInsights(current, previous),
            recommendations: this._getRecommendations(current, previous),
            actionPlan: this._getActionPlan(current, previous),
        };
    }

    async _getTrendData(userId, date) {
        const data = [];
        for (let i = 2; i >= 0; i--) {
            const start = new Date(date.getFullYear(), date.getMonth() - i, 1);
            const end = new Date(date.getFullYear(), date.getMonth() - i + 1, 0, 23, 59, 59, 999);
            const r = await this.reportGenerator.generate(userId, start, end);
            data.push({
                month: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: r.revenue.total,
                grossProfit: r.profitability.grossProfit,
                netProfit: r.profitability.netProfit,
                expenses: r.costs.expenses,
            });
        }
        return data;
    }

    _getTrendSummary(trendData) {
        if (trendData.length < 2) return { direction: 'Insufficient data', growth: '0' };
        const growth = ReportFormulas.calculateGrowth(trendData[trendData.length - 1].revenue, trendData[0].revenue);
        return { direction: growth > 5 ? 'Upward' : growth < -5 ? 'Downward' : 'Stable', growth: growth.toFixed(1) };
    }

    _getRisks(current) {
        const r = [];
        if (current.inventory.lowStockCount > 0) {
            r.push({ 
                type: 'Inventory', 
                severity: current.inventory.lowStockCount > 3 ? 'High' : 'Medium', 
                description: `${current.inventory.lowStockCount} item(s) below reorder level` 
            });
        }
        if (current.profitability.netMargin < 5) {
            r.push({ type: 'Profitability', severity: 'High', description: 'Net profit margin below 5%' });
        }
        if (current.receivables.debtors > current.revenue.total * 0.5) {
            r.push({ type: 'Cash Flow', severity: 'Medium', description: 'High debtor exposure relative to revenue' });
        }
        return { items: r, priority: r.filter(x => x.severity === 'High').map(x => x.description) };
    }

    _getAIInsights(current, previous) {
        const insights = [];
        const growth = ReportFormulas.calculateGrowth(current.revenue.total, previous.revenue.total);
        const margin = current.profitability.netMargin;
        const debtorGrowth = ReportFormulas.calculateGrowth(current.receivables.debtors, previous.receivables.debtors);

        if (growth > 15) insights.push(`Revenue growth is strong at ${growth.toFixed(1)}%. Consider reinvesting.`);
        else if (growth < -5) insights.push('Revenue has declined. Review your pricing strategy.');
        if (margin > 20) insights.push('Excellent profit margins. Your pricing strategy is working well.');
        else if (margin < 5) insights.push('Profit margins are low. Review your cost structure.');
        if (debtorGrowth > 20) insights.push('Debtors have increased significantly. Review your credit policies.');
        if (current.inventory.lowStockCount > 0) insights.push('Low stock items identified. Place orders to avoid stockouts.');
        if (insights.length === 0) insights.push('Business is performing steadily. Continue monitoring key metrics.');
        return insights;
    }

    _getRecommendations(current, previous) {
        const recs = [];
        const margin = current.profitability.netMargin;
        const growth = ReportFormulas.calculateGrowth(current.revenue.total, previous.revenue.total);
        const expenseGrowth = ReportFormulas.calculateGrowth(current.costs.expenses, previous.costs.expenses);

        // ✅ FIXED: Removed emojis, using plain text labels
        if (margin < 10) recs.push('[Pricing] Optimize pricing: Review your pricing strategy to improve margins');
        if (current.receivables.debtors > current.revenue.total * 0.3) recs.push('[Collections] Improve collections: Implement stricter credit policies');
        if (current.inventory.lowStockCount > 2) recs.push('[Inventory] Reorder inventory: Critical items need restocking');
        if (growth < 5 && growth > -5) recs.push('[Growth] Grow revenue: Explore new channels or products');
        if (expenseGrowth > 10) recs.push('[Expenses] Review expenses: Expenses have increased significantly');
        if (recs.length === 0) recs.push('[Success] Business is performing well. Continue current strategy.');
        
        return recs;
    }

    _getActionPlan(current, previous) {
        const actions = [];
        const growth = ReportFormulas.calculateGrowth(current.revenue.total, previous.revenue.total);

        if (current.inventory.lowStockCount > 0) {
            actions.push({ 
                action: `Restock ${current.inventory.lowStockCount} low stock items`, 
                priority: 'High', 
                timeline: 'Immediate', 
                owner: 'Inventory Manager' 
            });
        }
        if (current.receivables.debtors > current.revenue.total * 0.3) {
            actions.push({ 
                action: 'Review debtor accounts and follow up on overdue payments', 
                priority: 'High', 
                timeline: '1-2 weeks', 
                owner: 'Accounts Receivable' 
            });
        }
        if (current.profitability.netMargin < 10) {
            actions.push({ 
                action: 'Conduct cost review and identify savings opportunities', 
                priority: 'Medium', 
                timeline: 'This month', 
                owner: 'Management' 
            });
        }
        if (growth < 0) {
            actions.push({ 
                action: 'Develop marketing plan to boost sales', 
                priority: 'Medium', 
                timeline: 'This month', 
                owner: 'Sales Manager' 
            });
        }
        if (actions.length === 0) {
            actions.push({ 
                action: 'Maintain current operations and monitor performance', 
                priority: 'Low', 
                timeline: 'Ongoing', 
                owner: 'Management' 
            });
        }
        return actions;
    }
}

module.exports = ExecutiveSummaryGenerator;