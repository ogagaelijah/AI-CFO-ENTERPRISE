/**
 * Report Engine Adapter - Investor Grade Production Configuration
 * Version: 1.8.0 (Production)
 *
 * Pure consumer of the Report Services (SSOT).
 * - Never recalculates financial numbers
 * - Correctly extracts nested shapes from ProfitLossService, DailyReportService, MonthlyReportService, etc.
 * - Period-aware (daily / weekly / monthly / yearly)
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

    // Period-specific report (SSOT for the requested period)
    const periodReport =
      periodType === 'daily'   ? daily :
      periodType === 'weekly'  ? weekly :
      periodType === 'monthly' ? monthly :
      periodType === 'yearly'  ? yearly :
      null;

    const normalizedPl     = this._normalizeProfitLoss(profitLoss, periodReport, periodType);
    const normalizedCf     = this._normalizeCashFlow(cashFlow, periodReport, balanceSheet);
    const normalizedBs     = this._normalizeBalanceSheet(balanceSheet, periodReport);
    const normalizedInv    = this._normalizeInventory(inventoryReport, periodReport);
    const normalizedAging  = this._normalizeAging(aging, periodReport);
    const comparison       = this._buildComparison(profitLoss, periodReport, periodType);

    return {
      source: 'ReportEngineAdapter',
      version: '1.8.0',
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
        revenue:           normalizedPl.revenue,
        grossProfit:       normalizedPl.grossProfit,
        grossMargin:       normalizedPl.grossMargin,
        netProfit:         normalizedPl.netProfit,
        netMargin:         normalizedPl.netMargin,
        operatingExpenses: normalizedPl.operatingExpenses,
        cash:              normalizedCf.closingCash,
        cashFlow:          normalizedCf.netChange,
        receivables:       normalizedBs.receivables,
        payables:          normalizedBs.payables,
        inventory:         normalizedInv.totalValue,
        totalAssets:       normalizedBs.totalAssets,
        totalLiabilities:  normalizedBs.totalLiabilities,
        totalEquity:       normalizedBs.totalEquity,
        salesCount: this._safeNumber(
          periodReport?.today?.salesCount ??
          periodReport?.kpiDashboard?.totalSales ??
          periodReport?.salesCount ??
          0
        ),
        uniqueCustomers: this._safeNumber(
          periodReport?.kpiDashboard?.uniqueCustomers ??
          periodReport?.uniqueCustomers ??
          0
        ),
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

  _buildComparison(profitLoss, periodReport = null, periodType = 'monthly') {
    const plComp = profitLoss?.comparison || {};
    const plPrev = plComp.previousPeriod || {};

    let prevRevenue = this._safeNumber(plPrev.revenue ?? plPrev.totalRevenue);
    let prevGrossProfit = this._safeNumber(plPrev.grossProfit);
    let prevNetProfit = this._safeNumber(plPrev.netProfit);
    let prevExpenses = this._safeNumber(plPrev.operatingExpenses ?? plPrev.expenses);

    let revenueChange = this._safeNumber(plComp.revenueChange);
    let profitChange = this._safeNumber(plComp.profitChange);
    let marginChange = this._safeNumber(plComp.marginChange);

    // Prefer period-specific comparison data when available
    if (periodReport) {
      if (periodType === 'daily') {
        const prevDay = periodReport.comparison?.previousDay || {};
        if (prevRevenue === 0) prevRevenue = this._safeNumber(prevDay.revenue);
        if (prevGrossProfit === 0) prevGrossProfit = this._safeNumber(prevDay.grossProfit);
        if (prevNetProfit === 0) prevNetProfit = this._safeNumber(prevDay.netProfit);
        if (prevExpenses === 0) prevExpenses = this._safeNumber(prevDay.expenses);

        if (revenueChange === 0) {
          revenueChange = this._safeNumber(periodReport.comparison?.revenueChange);
        }
        if (profitChange === 0) {
          profitChange = this._safeNumber(periodReport.comparison?.netProfitChange);
        }
      } else {
        // monthly / weekly / yearly
        const mom = periodReport.monthOverMonth || {};
        const exec = periodReport.executiveSummary || {};
        const prevMonth = mom.previousMonth || {};

        if (prevRevenue === 0) prevRevenue = this._safeNumber(prevMonth.revenue ?? prevMonth.totalRevenue);
        if (prevGrossProfit === 0) prevGrossProfit = this._safeNumber(prevMonth.grossProfit);
        if (prevNetProfit === 0) prevNetProfit = this._safeNumber(prevMonth.netProfit);
        if (prevExpenses === 0) prevExpenses = this._safeNumber(prevMonth.expenses ?? prevMonth.operatingExpenses);

        if (revenueChange === 0) {
          revenueChange = this._safeNumber(mom.revenueChange ?? exec.revenueChange);
        }
        if (profitChange === 0) {
          profitChange = this._safeNumber(mom.profitChange ?? exec.profitChange);
        }
      }
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

  /**
   * Pure extraction of already-calculated numbers.
   * Handles:
   * - ProfitLossService nested shape (revenue.totalRevenue)
   * - DailyReportService (today.revenue)
   * - MonthlyReportService (top-level + executiveSummary + kpiDashboard)
   */
  _normalizeProfitLoss(pl, periodReport = null, periodType = 'monthly') {
    const summary = pl?.summary || pl?.profitLoss || pl || {};

    // 1. Prefer official ProfitLossService nested shape
    let rev = this._safeNumber(
      summary.revenue?.totalRevenue ??          // ← critical fix
      summary.totalRevenue ??
      (typeof summary.revenue === 'number' ? summary.revenue : 0) ??
      summary.sales ??
      summary.totalSales ??
      summary.netSales ??
      summary.income ??
      0
    );

    // 2. Fall back to the period-specific report
    if (rev === 0 && periodReport) {
      if (periodType === 'daily') {
        rev = this._safeNumber(
          periodReport.today?.revenue ??
          periodReport.revenue ??
          0
        );
      } else {
        rev = this._safeNumber(
          periodReport.revenue ??
          periodReport.totalRevenue ??
          periodReport.executiveSummary?.totalRevenue ??
          periodReport.kpiDashboard?.revenue ??
          periodReport.profitLoss?.revenue ??
          periodReport.profitLoss?.totalRevenue ??
          0
        );
      }
    }

    // Prefer numbers already calculated by the report services — never recompute
    const gp = this._safeNumber(
      summary.grossProfit?.amount ??
      summary.grossProfit ??
      (periodType === 'daily' ? periodReport?.today?.grossProfit : periodReport?.grossProfit) ??
      0
    );

    const gm = this._safeNumber(
      summary.grossProfit?.margin ??
      summary.grossMargin ??
      (periodType === 'daily' ? periodReport?.today?.grossMargin : periodReport?.grossMargin) ??
      0
    );

    const np = this._safeNumber(
      summary.netProfit?.amount ??
      summary.netProfit ??
      (periodType === 'daily' ? periodReport?.today?.netProfit : periodReport?.netProfit) ??
      0
    );

    const nm = this._safeNumber(
      summary.netProfit?.margin ??
      summary.netMargin ??
      (periodType === 'daily' ? periodReport?.today?.netMargin : periodReport?.netMargin) ??
      0
    );

    const exp = this._safeNumber(
      summary.operatingExpenses?.total ??
      summary.operatingExpenses ??
      summary.expenses ??
      summary.totalExpenses ??
      (periodType === 'daily' ? periodReport?.today?.expenses : periodReport?.expenses) ??
      0
    );

    return {
      revenue: rev,
      grossProfit: gp,
      grossMargin: gm,
      netProfit: np,
      netMargin: nm,
      operatingExpenses: exp,
    };
  }

  /**
   * FIXED: Matches the exact shape returned by CashFlowService
   */
  _normalizeCashFlow(cf, periodReport = null, balanceSheet = null) {
    if (!cf) {
      return { closingCash: 0, netChange: 0, openingCash: 0 };
    }

    let netChange = this._safeNumber(
      cf.netChangeInCash ??
      cf.summary?.netChange ??
      cf.operatingActivities?.netOperatingCash ??
      cf.netChange ??
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

    // DailyReportService cash shape fallback
    if (closingCash === 0 && periodReport?.today?.cash) {
      closingCash = this._safeNumber(periodReport.today.cash.closing);
      openingCash = this._safeNumber(periodReport.today.cash.opening);
      if (netChange === 0 && openingCash !== 0) {
        netChange = closingCash - openingCash;
      }
    }

    if (netChange !== 0 && closingCash === 0) {
      if (openingCash !== 0) {
        closingCash = openingCash + netChange;
      } else {
        closingCash = netChange;
      }
    }

    return {
      closingCash,
      netChange,
      openingCash,
    };
  }

  _normalizeBalanceSheet(bs, periodReport = null) {
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

    let receivables = this._safeNumber(currentAssets.accountsReceivable ?? 0);
    let payables = this._safeNumber(currentLiabilities.accountsPayable ?? 0);
    let inventory = this._safeNumber(currentAssets.inventory ?? 0);
    const cash = this._safeNumber(currentAssets.cash ?? 0);

    // Fallbacks from period report
    if (receivables === 0 && periodReport?.debtors) {
      receivables = this._safeNumber(periodReport.debtors.totalAmount ?? 0);
    }
    if (payables === 0 && periodReport?.creditors) {
      payables = this._safeNumber(periodReport.creditors.totalAmount ?? 0);
    }
    if (inventory === 0 && periodReport?.inventory) {
      inventory = this._safeNumber(periodReport.inventory.totalValue ?? 0);
    }
    // Daily shape
    if (receivables === 0 && periodReport?.today?.receivables) {
      receivables = this._safeNumber(periodReport.today.receivables.outstanding ?? 0);
    }
    if (payables === 0 && periodReport?.today?.payables) {
      payables = this._safeNumber(periodReport.today.payables.outstanding ?? 0);
    }

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      receivables,
      payables,
      inventory,
      cash,
    };
  }

  _normalizeInventory(inv, periodReport = null) {
    const summary = inv?.summary || inv || {};
    let totalValue = this._safeNumber(summary.totalValue ?? summary.inventoryValue ?? summary.value ?? 0);
    let lowStockCount = this._safeNumber(summary.lowStockCount ?? summary.alerts ?? 0);

    if (totalValue === 0 && periodReport?.inventory) {
      totalValue = this._safeNumber(periodReport.inventory.totalValue ?? 0);
      lowStockCount = this._safeNumber(periodReport.inventory.lowStockCount ?? 0);
    }
    // Daily shape
    if (totalValue === 0 && periodReport?.today?.inventory) {
      totalValue = this._safeNumber(periodReport.today.inventory.totalValue ?? 0);
      lowStockCount = this._safeNumber(periodReport.today.inventory.lowStockCount ?? 0);
    }

    return { totalValue, lowStockCount };
  }

  _normalizeAging(aging, periodReport = null) {
    let arTotal = this._safeNumber(aging?.ar?.totalOutstanding ?? aging?.ar?.summary?.total ?? aging?.ar ?? 0);
    let arOverdue = this._safeNumber(aging?.ar?.overdueCount ?? 0);
    let apTotal = this._safeNumber(aging?.ap?.totalOutstanding ?? aging?.ap?.summary?.total ?? aging?.ap ?? 0);
    let apOverdue = this._safeNumber(aging?.ap?.overdueCount ?? 0);

    if (arTotal === 0 && periodReport?.debtors) {
      arTotal = this._safeNumber(periodReport.debtors.totalAmount ?? 0);
    }
    if (apTotal === 0 && periodReport?.creditors) {
      apTotal = this._safeNumber(periodReport.creditors.totalAmount ?? 0);
    }
    // Daily shape
    if (arTotal === 0 && periodReport?.today?.receivables) {
      arTotal = this._safeNumber(periodReport.today.receivables.outstanding ?? 0);
    }
    if (apTotal === 0 && periodReport?.today?.payables) {
      apTotal = this._safeNumber(periodReport.today.payables.outstanding ?? 0);
    }

    return {
      ar: { totalOutstanding: arTotal, overdueCount: arOverdue },
      ap: { totalOutstanding: apTotal, overdueCount: apOverdue },
    };
  }
}

module.exports = ReportEngineAdapter;