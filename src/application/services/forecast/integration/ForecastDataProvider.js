// src/application/services/forecast/integration/ForecastDataProvider.js
// SSOT v5.7.0-prod – pure consumer of Analytics

'use strict';

class ForecastDataProvider {
  constructor({ analyticsProvider, logger = console } = {}) {
    this.analyticsProvider = analyticsProvider;
    this.logger = logger;
  }

  async getHistoricalPackage({ userId, businessId, periods = 90 } = {}) {
    const empty = this._emptyPackage();
    const { startDate, endDate } = this._resolveDateRange(periods);

    try {
      if (!this.analyticsProvider?.generateAnalytics) {
        this.logger.warn('[ForecastDataProvider] AnalyticsProvider missing');
        return empty;
      }

      const analytics = await this.analyticsProvider.generateAnalytics({
        userId,
        businessId,
        startDate,
        endDate,
        periodType: 'monthly',
      });

      return this._mapFromAnalytics(analytics, empty);
    } catch (err) {
      this.logger.error('[ForecastDataProvider] Failed', { error: err.message });
      return empty;
    }
  }

  _resolveDateRange(periods = 90) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - periods);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }

  _mapFromAnalytics(analytics = {}, empty) {
    if (!analytics || typeof analytics !== 'object') return empty;

    const metrics = analytics.reportData?.metrics || {};
    const pl = analytics.reportData?.report?.profitLoss || {};
    const executive = analytics.executive?.keyMetrics || {};
    const kpis = analytics.kpis || analytics.analytics?.kpis || {};
    const monthly = analytics.reportData?.report?.monthly || {};
    const comparison = analytics.reportData?.comparison || {};

    const getNumber = (val) => {
      if (val == null) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'object') return Number(val.value ?? val.amount ?? val.total ?? 0);
      return Number(val) || 0;
    };

    // ---------- CURRENT PERIOD ONLY (never YTD) ----------
    const current = {
      revenue: getNumber(metrics.revenue ?? pl.revenue ?? executive.revenue ?? kpis.revenue?.value ?? monthly.revenue),
      profit: getNumber(metrics.netProfit ?? pl.netProfit ?? executive.netProfit ?? kpis.netProfit?.value ?? monthly.netProfit),
      expenses: getNumber(metrics.operatingExpenses ?? pl.operatingExpenses ?? kpis.totalExpenses?.value ?? monthly.expenses),
      cashFlow: getNumber(metrics.cashFlow ?? metrics.cash ?? executive.netCashFlow ?? kpis.netCashFlow?.value),
      inventory: getNumber(metrics.inventory ?? kpis.inventoryValue?.value ?? monthly.inventory?.totalValue),
      receivables: getNumber(metrics.receivables ?? kpis.receivables?.value),
      payables: getNumber(metrics.payables ?? kpis.payables?.value),
      grossMargin: getNumber(metrics.grossMargin ?? pl.grossMargin ?? executive.grossMargin),
      netMargin: getNumber(metrics.netMargin ?? pl.netMargin ?? executive.netMargin),
      cogs: getNumber(metrics.cogs ?? monthly.kpiDashboard?.cogs),
    };

    // Derive COGS if missing
    if (current.cogs === 0 && current.revenue > 0 && current.grossMargin > 0) {
      current.cogs = current.revenue * (1 - current.grossMargin / 100);
    }

    // ---------- TREND RATES (heavily clamped) ----------
    const clamp = (rawPercent, max = 0.18) => {
      const r = (Number(rawPercent) || 0) / 100;
      return Math.max(-max, Math.min(max, r));
    };

    const trendRates = {
      revenue: clamp(comparison.revenueChange),
      expenses: 0.01,               // mild upward drift
      cogs: clamp(comparison.revenueChange), // moves with revenue
      cashFlow: 0,
      inventory: 0.005,
      receivables: 0.005,
      payables: 0.005,
      profit: 0,                    // we will derive profit, not project it
      salesVolume: clamp(comparison.revenueChange),
      demand: clamp(comparison.revenueChange),
    };

    return {
      ...empty,
      openingCash: current.cashFlow,
      currentReceivables: current.receivables,
      currentPayables: current.payables,
      currentRevenue: current.revenue,
      currentExpenses: current.expenses,
      currentProfit: current.profit,
      currentInventory: current.inventory,
      currentCogs: current.cogs,
      currentGrossMargin: current.grossMargin,
      currentNetMargin: current.netMargin,
      otherIncome: 0,
      safetyStock: null,
      reorderLevel: null,
      trendRates,
      revenue: [], expenses: [], profit: [], cashFlow: [],
      inventory: [], salesVolume: [], cogs: [], demand: [],
      historical: [],
    };
  }

  _emptyPackage() {
    return {
      revenue: [], salesVolume: [], cogs: [], expenses: [], profit: [], cashFlow: [],
      receivables: [], payables: [], inventory: [], demand: [],
      payments: [], collections: [], supplierPayments: [], purchases: [], historical: [],
      openingCash: 0, currentReceivables: 0, currentPayables: 0,
      currentRevenue: 0, currentExpenses: 0, currentProfit: 0,
      currentInventory: 0, currentCogs: 0,
      currentGrossMargin: 0, currentNetMargin: 0,
      otherIncome: 0, safetyStock: null, reorderLevel: null,
      trendRates: {},
    };
  }
}

module.exports = ForecastDataProvider;