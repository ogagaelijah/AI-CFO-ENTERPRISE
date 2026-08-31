// src/application/services/analytics/integration/ReportEngineAdapter.js

/**
 * Report Engine Adapter - Investor Grade Production Configuration
 *
 * Bridges statement engines and analytics tracking pools safely.
 * Performance Profile: Stateless, O(1) Memory Allocation, Dynamic Query Scoping.
 * IFRS Compliant | Zero Rejection Crashes | Bulk Safe
 */
class ReportEngineAdapter {
    constructor({
        profitLossService,
        cashFlowService,
        balanceSheetService,
        dailyReportService,
        weeklyReportService,
        monthlyReportService,
        yearlyReportService,
        executiveReportService,
        agingService,
        inventoryReportService,
        periodResolver = null
    } = {}) {
        this.profitLossService = profitLossService;
        this.cashFlowService = cashFlowService;
        this.balanceSheetService = balanceSheetService;
        this.dailyReportService = dailyReportService;
        this.weeklyReportService = weeklyReportService;
        this.monthlyReportService = monthlyReportService;
        this.yearlyReportService = yearlyReportService;
        this.executiveReportService = executiveReportService;
        this.agingService = agingService;
        this.inventoryReportService = inventoryReportService;
        this.periodResolver = periodResolver;
    }

    _safeNumber(val) {
        const num = Number(val);
        return isNaN(num)? 0 : num;
    }

    /**
     * Safely executes an asynchronous promise chain, isolating runtime connection failures
     */
    async _safeCall(fn, fallback = null) {
        try {
            const res = await fn();
            return res || fallback;
        } catch (error) {
            console.error('⚠️ [ReportEngineAdapter] Background Service layer failed:', error.message);
            return fallback;
        }
    }

    /**
     * Standard entry-point for analytics data consolidation
     */
    async generate({
        userId,
        businessId,
        startDate,
        endDate,
        periodType = 'monthly',
        includeCashFlow = true,
        includeBalanceSheet = true,
        includeInventory = true,
        includeAging = true,
    }) {
        // Validate date boundaries securely
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error('ReportEngineAdapter: Invalid startDate or endDate parameters provided');
        }

        const periodLabel = this._getPeriodLabel(start, end, periodType);
        const period = { startDate, endDate, label: periodLabel, type: periodType };

        // Scale profile tracking: calls service entities in parallel with clean fallback wrappers
        const [
            profitLoss,
            cashFlow,
            balanceSheet,
            inventoryReport,
            aging,
            daily,
            weekly,
            monthly,
            yearly
        ] = await Promise.all([
            this._safeCall(() => this.profitLossService?.generate({ userId, businessId, startDate, endDate, period: periodType })),
            includeCashFlow? this._safeCall(() => this.cashFlowService?.generate({ userId, businessId, startDate, endDate })) : Promise.resolve(null),
            includeBalanceSheet? this._safeCall(() => this.balanceSheetService?.generate({ userId, businessId, asAtDate: endDate })) : Promise.resolve(null),
            includeInventory? this._safeCall(() => this.inventoryReportService?.generate({ userId, businessId, includeDetails: false, asAtDate: endDate })) : Promise.resolve(null),
            includeAging? this._safeCall(() => this.agingService?.generateBoth({ userId, businessId, asAtDate: endDate, includeDetails: false })) : Promise.resolve(null),

            periodType === 'daily'? this._safeCall(() => this.dailyReportService?.generate({ userId, businessId, date: endDate })) : Promise.resolve(null),
            periodType === 'weekly'? this._safeCall(() => this.weeklyReportService?.generate({ userId, businessId, date: endDate })) : Promise.resolve(null),
            periodType === 'monthly'? this._safeCall(() => this.monthlyReportService?.generate({ userId, businessId, date: endDate })) : Promise.resolve(null),
            periodType === 'yearly'? this._safeCall(() => this.yearlyReportService?.generate({ userId, businessId, date: endDate })) : Promise.resolve(null),
        ]);

        const normalizedPl = this._normalizeProfitLoss(profitLoss);
        const normalizedCf = this._normalizeCashFlow(cashFlow);
        const normalizedBs = this._normalizeBalanceSheet(balanceSheet);
        const normalizedInv = this._normalizeInventory(inventoryReport);
        const normalizedAging = this._normalizeAging(aging);

        return {
            source: 'ReportEngineAdapter',
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            period,
            periodType,
            report: {
                profitLoss: normalizedPl,
                cashFlow: normalizedCf,
                balanceSheet: normalizedBs,
                inventory: normalizedInv,
                aging: normalizedAging,
                daily: daily || {},
                weekly: weekly || {},
                monthly: monthly || {},
                yearly: yearly || {}
            },
            metrics: {
                revenue: normalizedPl.revenue,
                grossProfit: normalizedPl.grossProfit,
                grossMargin: normalizedPl.grossMargin,
                netProfit: normalizedPl.netProfit,
                netMargin: normalizedPl.netMargin,
                operatingExpenses: normalizedPl.operatingExpenses,
                cash: normalizedCf.closingCash,
                cashFlow: normalizedCf.netChange,
                receivables: normalizedBs.receivables,
                payables: normalizedBs.payables,
                inventory: normalizedInv.totalValue,
                totalAssets: normalizedBs.totalAssets,
                totalLiabilities: normalizedBs.totalLiabilities,
                totalEquity: normalizedBs.totalEquity
            },
            comparison: {
                previousPeriod: {
                    revenue: this._safeNumber(profitLoss?.comparison?.previousPeriod?.revenue?? profitLoss?.comparison?.previousPeriod?.totalRevenue?? 0),
                    grossProfit: this._safeNumber(profitLoss?.comparison?.previousPeriod?.grossProfit?? 0),
                    netProfit: this._safeNumber(profitLoss?.comparison?.previousPeriod?.netProfit?? 0),
                    expenses: this._safeNumber(profitLoss?.comparison?.previousPeriod?.operatingExpenses?? profitLoss?.comparison?.previousPeriod?.expenses?? 0)
                },
                revenueChange: this._safeNumber(profitLoss?.comparison?.revenueChange?? 0),
                profitChange: this._safeNumber(profitLoss?.comparison?.profitChange?? 0),
                marginChange: this._safeNumber(profitLoss?.comparison?.marginChange?? 0)
            }
        };
    }

    async getPreviousPeriod({ userId, businessId, startDate, endDate, periodType = 'monthly' }) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = end.getTime() - start.getTime();

        const prevStart = new Date(start.getTime() - duration - 86400000);
        const prevEnd = new Date(start.getTime() - 86400000);

        const formatIso = (d) => d.toISOString().split('T')[0];

        return this.generate({
            userId,
            businessId,
            startDate: formatIso(prevStart),
            endDate: formatIso(prevEnd),
            periodType
        });
    }

    _getPeriodLabel(start, end, type) {
        try {
            switch (type) {
                case 'daily':
                    return start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
                case 'weekly':
                    return `Week of ${start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`;
                case 'monthly':
                    return start.toLocaleString('en-NG', { month: 'long', year: 'numeric' });
                case 'quarterly':
                    return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
                case 'yearly':
                    return start.getFullYear().toString();
                default:
                    return `${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]}`;
            }
        } catch {
            return `${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]}`;
        }
    }

    // =============================================
    // DATA NORMALIZATION INTERFACE METHODS
    // =============================================

    _normalizeProfitLoss(pl) {
        const summary = pl?.summary || pl?.profitLoss || pl || {};
        const rev = this._safeNumber(summary.totalRevenue?? summary.revenue);
        const gp = this._safeNumber(summary.grossProfit?.amount?? summary.grossProfit);
        const gm = this._safeNumber(summary.grossProfit?.margin?? summary.grossMargin?? (rev > 0? (gp / rev) * 100 : 0));
        const np = this._safeNumber(summary.netProfit?.amount?? summary.netProfit);
        const nm = this._safeNumber(summary.netProfit?.margin?? summary.netMargin?? (rev > 0? (np / rev) * 100 : 0));
        const exp = this._safeNumber(summary.operatingExpenses?.total?? summary.expenses?? summary.totalExpenses);

        return {
            revenue: rev,
            grossProfit: gp,
            grossMargin: gm,
            netProfit: np,
            netMargin: nm,
            operatingExpenses: exp
        };
    }

    _normalizeCashFlow(cf) {
        const summary = cf?.summary || cf?.cashFlow || cf || {};
        return {
            closingCash: this._safeNumber(summary.closingCash?? summary.cash?? summary.closingBalance?? summary.closingCashBalance),
            netChange: this._safeNumber(summary.netChange?? summary.netCashFlow)
        };
    }

    _normalizeBalanceSheet(bs) {
        const summary = bs?.summary || bs?.balanceSheet || bs || {};
        const assets = this._safeNumber(summary.totalAssets);
        const liabilities = this._safeNumber(summary.totalLiabilities);
        const equity = this._safeNumber(summary.totalEquity?? (assets - liabilities));
        return {
            totalAssets: assets,
            totalLiabilities: liabilities,
            totalEquity: equity,
            receivables: this._safeNumber(summary.receivables?? summary.accountsReceivable),
            payables: this._safeNumber(summary.payables?? summary.accountsPayable),
            inventory: this._safeNumber(summary.inventory?? summary.totalInventory)
        };
    }

    _normalizeInventory(inv) {
        const summary = inv?.summary || inv || {};
        return {
            totalValue: this._safeNumber(summary.totalValue?? summary.inventoryValue),
            lowStockCount: this._safeNumber(summary.lowStockCount?? summary.alerts)
        };
    }

    _normalizeAging(aging) {
        return {
            ar: {
                totalOutstanding: this._safeNumber(aging?.ar?.totalOutstanding?? aging?.ar?.summary?.total?? aging?.ar),
                overdueCount: this._safeNumber(aging?.ar?.overdueCount?? 0)
            },
            ap: {
                totalOutstanding: this._safeNumber(aging?.ap?.totalOutstanding?? aging?.ap?.summary?.total?? aging?.ap),
                overdueCount: this._safeNumber(aging?.ap?.overdueCount?? 0)
            }
        };
    }
}

module.exports = ReportEngineAdapter;