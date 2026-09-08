/**
 * Report Engine Adapter - Investor Grade Production Configuration
 * Version: 1.5.0 (Production)
 *
 * Correctly maps the real nested shapes returned by:
 * - CashFlowService
 * - BalanceSheetService
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
    periodResolver = null,
    logger = console,
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
    this.logger = logger;
  }

  _safeNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }

  async _safeCall(fn, fallback = null) {
    try {
      if (typeof fn !== 'function') return fallback;
      const res = await fn();
      return res ?? fallback;
    } catch (error) {
      this.logger.error?.('⚠️ [ReportEngineAdapter] Service call failed:', error?.message || error);
      return fallback;
    }
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
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('ReportEngineAdapter: Invalid startDate or endDate parameters provided');
    }

    const periodLabel = this._getPeriodLabel(start, end, periodType);
    const period = { startDate, endDate, label: periodLabel, type: periodType };

    const [
      profitLoss,
      cashFlow,
      balanceSheet,
      inventoryReport,
      aging,
      daily,
      weekly,
      monthly,
      yearly,
    ] = await Promise.all([
      this._safeCall(() =>
        this.profitLossService?.generate({ userId, businessId, startDate, endDate, period: periodType })
      ),
      includeCashFlow
        ? this._safeCall(() => this.cashFlowService?.generate({ userId, businessId, startDate, endDate }))
        : Promise.resolve(null),
      includeBalanceSheet
        ? this._safeCall(() => this.balanceSheetService?.generate({ userId, businessId, asAtDate: endDate }))
        : Promise.resolve(null),
      includeInventory
        ? this._safeCall(() =>
            this.inventoryReportService?.generate({ userId, businessId, includeDetails: false, asAtDate: endDate })
          )
        : Promise.resolve(null),
      includeAging
        ? this._safeCall(() =>
            this.agingService?.generateBoth({ userId, businessId, asAtDate: endDate, includeDetails: false })
          )
        : Promise.resolve(null),
      periodType === 'daily'
        ? this._safeCall(() => this.dailyReportService?.generate({ userId, businessId, date: endDate }))
        : Promise.resolve(null),
      periodType === 'weekly'
        ? this._safeCall(() => this.weeklyReportService?.generate({ userId, businessId, date: endDate }))
        : Promise.resolve(null),
      periodType === 'monthly'
        ? this._safeCall(() => this.monthlyReportService?.generate({ userId, businessId, date: endDate }))
        : Promise.resolve(null),
      periodType === 'yearly'
        ? this._safeCall(() => this.yearlyReportService?.generate({ userId, businessId, date: endDate }))
        : Promise.resolve(null),
    ]);

    const normalizedPl = this._normalizeProfitLoss(profitLoss, monthly);
    const normalizedCf = this._normalizeCashFlow(cashFlow, monthly, balanceSheet);
    const normalizedBs = this._normalizeBalanceSheet(balanceSheet, monthly);
    const normalizedInv = this._normalizeInventory(inventoryReport, monthly);
    const normalizedAging = this._normalizeAging(aging, monthly);
    const comparison = this._buildComparison(profitLoss, monthly);

    return {
      source: 'ReportEngineAdapter',
      version: '1.5.0',
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
        yearly: yearly || {},
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
        totalEquity: normalizedBs.totalEquity,
        salesCount: this._safeNumber(monthly?.kpiDashboard?.totalSales ?? 0),
        uniqueCustomers: this._safeNumber(monthly?.kpiDashboard?.uniqueCustomers ?? 0),
      },
      comparison,
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
      periodType,
    });
  }

  _buildComparison(profitLoss, monthly = null) {
    const plComp = profitLoss?.comparison || {};
    const plPrev = plComp.previousPeriod || {};

    let prevRevenue = this._safeNumber(plPrev.revenue ?? plPrev.totalRevenue);
    let prevGrossProfit = this._safeNumber(plPrev.grossProfit);
    let prevNetProfit = this._safeNumber(plPrev.netProfit);
    let prevExpenses = this._safeNumber(plPrev.operatingExpenses ?? plPrev.expenses);

    let revenueChange = this._safeNumber(plComp.revenueChange);
    let profitChange = this._safeNumber(plComp.profitChange);
    let marginChange = this._safeNumber(plComp.marginChange);

    if (monthly) {
      const mom = monthly.monthOverMonth || {};
      const exec = monthly.executiveSummary || {};
      const prevMonth = mom.previousMonth || {};

      if (prevRevenue === 0) prevRevenue = this._safeNumber(prevMonth.revenue ?? prevMonth.totalRevenue);
      if (prevGrossProfit === 0) prevGrossProfit = this._safeNumber(prevMonth.grossProfit);
      if (prevNetProfit === 0) prevNetProfit = this._safeNumber(prevMonth.netProfit);
      if (prevExpenses === 0) prevExpenses = this._safeNumber(prevMonth.expenses ?? prevMonth.operatingExpenses);

      if (revenueChange === 0) revenueChange = this._safeNumber(mom.revenueChange ?? exec.revenueChange);
      if (profitChange === 0) profitChange = this._safeNumber(mom.profitChange ?? exec.profitChange);
    }

    return {
      previousPeriod: {
        revenue: prevRevenue,
        grossProfit: prevGrossProfit,
        netProfit: prevNetProfit,
        expenses: prevExpenses,
      },
      revenueChange,
      profitChange,
      marginChange,
    };
  }

  _normalizeProfitLoss(pl, monthly = null) {
    const summary = pl?.summary || pl?.profitLoss || pl || {};

    let rev = this._safeNumber(
      summary.totalRevenue ?? summary.revenue ?? summary.sales ?? summary.totalSales ??
      summary.netSales ?? summary.income ?? summary.turnover ??
      summary.revenue?.amount ?? summary.totalRevenue?.amount ?? summary.sales?.amount ?? 0
    );

    if (rev === 0 && monthly) {
      rev = this._safeNumber(
        monthly.revenue ?? monthly.totalRevenue ?? monthly.sales ?? monthly.totalSales ??
        monthly.netSales ?? monthly.income ?? monthly.turnover ??
        monthly.profitLoss?.revenue ?? monthly.profitLoss?.totalRevenue ?? 0
      );
    }

    const gp = this._safeNumber(summary.grossProfit?.amount ?? summary.grossProfit ?? summary.grossProfitAmount ?? 0);
    let gm = this._safeNumber(summary.grossProfit?.margin ?? summary.grossMargin ?? 0);
    if (gm === 0 && rev > 0 && gp !== 0) gm = Number(((gp / rev) * 100).toFixed(2));
    if (rev === 0 && gm > 0 && gp !== 0) rev = Math.round(gp / (gm / 100));

    const np = this._safeNumber(summary.netProfit?.amount ?? summary.netProfit ?? summary.netProfitAmount ?? 0);
    let nm = this._safeNumber(summary.netProfit?.margin ?? summary.netMargin ?? 0);
    if (nm === 0 && rev > 0 && np !== 0) nm = Number(((np / rev) * 100).toFixed(2));

    const exp = this._safeNumber(
      summary.operatingExpenses?.total ?? summary.operatingExpenses ??
      summary.expenses ?? summary.totalExpenses ?? summary.expenseTotal ?? 0
    );

    return { revenue: rev, grossProfit: gp, grossMargin: gm, netProfit: np, netMargin: nm, operatingExpenses: exp };
  }

  /**
   * Matches the exact shape returned by your CashFlowService
   */
  _normalizeCashFlow(cf, monthly = null, balanceSheet = null) {
    if (!cf) {
      return { closingCash: 0, netChange: 0, openingCash: 0 };
    }

    // Direct top-level fields from the raw object we just logged
    let netChange = this._safeNumber(
      cf.netChangeInCash ??
      cf.summary?.netChange ??
      cf.operatingActivities?.netOperatingCash ??
      0
    );

    let closingCash = this._safeNumber(
      cf.closingCash ??
      cf.summary?.closingCash ??
      0
    );

    let openingCash = this._safeNumber(
      cf.openingCash ??
      cf.summary?.openingCash ??
      0
    );

    // Fallback from Balance Sheet cash (if Cash Flow service returns 0)
    if (closingCash === 0 && balanceSheet) {
      closingCash = this._safeNumber(
        balanceSheet.assets?.currentAssets?.cash ??
        balanceSheet.assets?.cash ??
        0
      );
    }

    return {
      closingCash,
      netChange,
      openingCash,
    };
  }

  /**
   * Matches the exact nested shape returned by your BalanceSheetService
   */
  _normalizeBalanceSheet(bs, monthly = null) {
    if (!bs) {
      return {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        receivables: 0,
        payables: 0,
        inventory: 0,
        cash: 0,
      };
    }

    const currentAssets = bs.assets?.currentAssets || {};
    const currentLiabilities = bs.liabilities?.currentLiabilities || {};

    const totalAssets = this._safeNumber(bs.assets?.totalAssets ?? currentAssets.total ?? 0);
    const totalLiabilities = this._safeNumber(bs.liabilities?.totalLiabilities ?? currentLiabilities.total ?? 0);
    const totalEquity = this._safeNumber(bs.equity?.totalEquity ?? (totalAssets - totalLiabilities));

    const receivables = this._safeNumber(currentAssets.accountsReceivable ?? 0);
    const payables = this._safeNumber(currentLiabilities.accountsPayable ?? 0);
    const inventory = this._safeNumber(currentAssets.inventory ?? 0);
    const cash = this._safeNumber(currentAssets.cash ?? 0);

    // Monthly fallbacks
    let finalReceivables = receivables;
    let finalPayables = payables;
    let finalInventory = inventory;

    if (finalReceivables === 0 && monthly?.debtors) {
      finalReceivables = this._safeNumber(monthly.debtors.totalAmount ?? 0);
    }
    if (finalPayables === 0 && monthly?.creditors) {
      finalPayables = this._safeNumber(monthly.creditors.totalAmount ?? 0);
    }
    if (finalInventory === 0 && monthly?.inventory) {
      finalInventory = this._safeNumber(monthly.inventory.totalValue ?? 0);
    }

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      receivables: finalReceivables,
      payables: finalPayables,
      inventory: finalInventory,
      cash,
    };
  }

  _normalizeInventory(inv, monthly = null) {
    const summary = inv?.summary || inv || {};
    let totalValue = this._safeNumber(summary.totalValue ?? summary.inventoryValue ?? summary.value ?? 0);
    let lowStockCount = this._safeNumber(summary.lowStockCount ?? summary.alerts ?? 0);

    if (totalValue === 0 && monthly?.inventory) {
      totalValue = this._safeNumber(monthly.inventory.totalValue ?? 0);
      lowStockCount = this._safeNumber(monthly.inventory.lowStockCount ?? 0);
    }

    return { totalValue, lowStockCount };
  }

  _normalizeAging(aging, monthly = null) {
    let arTotal = this._safeNumber(aging?.ar?.totalOutstanding ?? aging?.ar?.summary?.total ?? aging?.ar ?? 0);
    let arOverdue = this._safeNumber(aging?.ar?.overdueCount ?? 0);
    let apTotal = this._safeNumber(aging?.ap?.totalOutstanding ?? aging?.ap?.summary?.total ?? aging?.ap ?? 0);
    let apOverdue = this._safeNumber(aging?.ap?.overdueCount ?? 0);

    if (arTotal === 0 && monthly?.debtors) arTotal = this._safeNumber(monthly.debtors.totalAmount ?? 0);
    if (apTotal === 0 && monthly?.creditors) apTotal = this._safeNumber(monthly.creditors.totalAmount ?? 0);

    return {
      ar: { totalOutstanding: arTotal, overdueCount: arOverdue },
      ap: { totalOutstanding: apTotal, overdueCount: apOverdue },
    };
  }
}

module.exports = ReportEngineAdapter;