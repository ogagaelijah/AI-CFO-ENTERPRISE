/**
 * ReportAnalyticsTransformer
 * SSOT v2.5.0-prod – pure consumer of ReportEngineAdapter
 *
 * Rules:
 * - Never recalculate base financial numbers
 * - Only map already-trusted metrics from the Adapter
 * - No repository access, no independent data fetching, no derived scores
 */

'use strict';

class ReportAnalyticsTransformer {
  static VERSION = '2.5.0-prod';

  transform(adapterResult, { userId, businessId } = {}) {
    if (!adapterResult || !adapterResult.metrics) {
      return this._empty(userId, businessId);
    }

    const metrics = adapterResult.metrics || {};
    const comparison = adapterResult.comparison || {};
    const period = adapterResult.period || {};
    const report = adapterResult.report || {};

    const kpis = this._mapKpis(metrics, comparison, period);
    const comparisons = this._mapComparisons(metrics, comparison);
    const concentration = this._mapConcentration(report, period?.type);

    const packageResult = {
      userId,
      businessId,
      generatedAt: adapterResult.generatedAt || new Date().toISOString(),
      source: 'ReportAnalyticsTransformer',
      version: ReportAnalyticsTransformer.VERSION,
      period,
      reportData: adapterResult, // full SSOT package passed through

      snapshot: {
        userId,
        businessId,
        generatedAt: adapterResult.generatedAt || new Date().toISOString(),
        source: 'ReportAnalyticsTransformer',
        version: ReportAnalyticsTransformer.VERSION,
        snapshotType: 'FULL',
        period,
        summary: {
          revenue: metrics.revenue ?? 0,
          revenueGrowth: comparison.revenueChange ?? 0,
          grossMargin: metrics.grossMargin ?? 0,
          netProfit: metrics.netProfit ?? 0,
          netMargin: metrics.netMargin ?? 0,
        },
        kpis,
        comparisons,
        concentration,
      },

      executive: {
        keyMetrics: {
          revenue: metrics.revenue ?? 0,
          revenueGrowth: comparison.revenueChange ?? 0,
          netProfit: metrics.netProfit ?? 0,
          netMargin: metrics.netMargin ?? 0,
          grossMargin: metrics.grossMargin ?? 0,
          netCashFlow: metrics.cashFlow ?? null,
        },
      },

      analytics: {
        kpis,
        comparisons,
        concentration,
      },
    };

    return Object.freeze(packageResult);
  }

  _mapKpis(metrics, comparison, period) {
    const prev = comparison.previousPeriod || {};

    const make = (name, value, previous = null, unit = 'currency') => {
      const safeValue = value ?? null;
      const safePrev = previous ?? null;

      let direction = 'N/A';
      let percentageChange = null;

      if (safePrev !== null && safeValue !== null) {
        if (safeValue > safePrev) direction = 'UP';
        else if (safeValue < safePrev) direction = 'DOWN';
        else direction = 'STABLE';

        if (safePrev !== 0) {
          percentageChange = Number(
            (((safeValue - safePrev) / Math.abs(safePrev)) * 100).toFixed(2)
          );
        }
      }

      return Object.freeze({
        name,
        displayName: name
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (s) => s.toUpperCase()),
        value: safeValue,
        previousValue: safePrev,
        unit,
        direction,
        percentageChange,
        dataStatus: safeValue == null ? 'INSUFFICIENT_DATA' : 'VALID',
        period: period.label || period.type || null,
        source: 'ReportEngineAdapter',
      });
    };

    return Object.freeze({
      revenue: make('revenue', metrics.revenue, prev.revenue),
      revenueGrowth: make('revenueGrowth', comparison.revenueChange, null, 'percent'),
      grossProfit: make('grossProfit', metrics.grossProfit, prev.grossProfit),
      grossMargin: make('grossMargin', metrics.grossMargin, null, 'percent'),
      netProfit: make('netProfit', metrics.netProfit, prev.netProfit),
      netMargin: make('netMargin', metrics.netMargin, null, 'percent'),
      totalExpenses: make('totalExpenses', metrics.operatingExpenses, prev.expenses),
      netCashFlow: make('netCashFlow', metrics.cashFlow),
      inventoryValue: make('inventoryValue', metrics.inventory),
      receivables: make('receivables', metrics.receivables),
      payables: make('payables', metrics.payables),
    });
  }

  _mapComparisons(metrics, comparison) {
    const prev = comparison.previousPeriod || {};

    const direction = (change) => {
      if (change > 0) return 'UP';
      if (change < 0) return 'DOWN';
      return 'NO_CHANGE';
    };

    return Object.freeze({
      previousPeriod: Object.freeze({
        revenue: Object.freeze({
          current: metrics.revenue ?? 0,
          previous: prev.revenue ?? 0,
          percentageChange: comparison.revenueChange ?? 0,
          direction: direction(comparison.revenueChange),
        }),
        netProfit: Object.freeze({
          current: metrics.netProfit ?? 0,
          previous: prev.netProfit ?? 0,
          percentageChange: comparison.profitChange ?? 0,
          direction: direction(comparison.profitChange),
        }),
      }),
      growth: Object.freeze({
        revenueGrowth: { value: comparison.revenueChange ?? 0 },
        profitGrowth: { value: comparison.profitChange ?? 0 },
      }),
    });
  }

  _mapConcentration(report = {}, periodType = 'monthly') {
    // Prefer the richest available source
    const source =
      (periodType === 'daily' && report.daily) ||
      report.monthly ||
      report.weekly ||
      report.yearly ||
      {};

    const topProducts = Array.isArray(source.topProducts) ? source.topProducts : [];
    const topCustomers = Array.isArray(source.topCustomers) ? source.topCustomers : [];
    const topExpenses = Array.isArray(source.topExpenses) ? source.topExpenses : [];
    const debtors = source.debtors || {};
    const creditors = source.creditors || {};

    const totalRevenue = this._safeNumber(source.revenue ?? source.today?.revenue ?? 0);
    const totalExpenses = this._safeNumber(source.expenses ?? source.today?.expenses ?? 0);

    const calc = (items, total, nameKey = 'name', amountKey = 'amount') => {
      if (!items.length || total <= 0) {
        return Object.freeze({
          riskLevel: 'LOW',
          topPercentage: 0,
          topCount: 0,
          items: Object.freeze([]),
        });
      }

      const sorted = [...items].sort(
        (a, b) => (Number(b[amountKey]) || 0) - (Number(a[amountKey]) || 0)
      );
      const top3 = sorted.slice(0, 3);
      const topSum = top3.reduce((sum, i) => sum + (Number(i[amountKey]) || 0), 0);
      const topPercentage = Number(((topSum / total) * 100).toFixed(1));

      let riskLevel = 'LOW';
      if (topPercentage >= 70) riskLevel = 'HIGH';
      else if (topPercentage >= 45) riskLevel = 'MEDIUM';

      return Object.freeze({
        riskLevel,
        topPercentage,
        topCount: top3.length,
        items: Object.freeze(
          top3.map((i) =>
            Object.freeze({
              name: i[nameKey] || i.category || 'Unknown',
              amount: Number(i[amountKey]) || 0,
              percentage:
                total > 0
                  ? Number((((Number(i[amountKey]) || 0) / total) * 100).toFixed(1))
                  : 0,
            })
          )
        ),
      });
    };

    // Normalize different shapes (Daily uses totalRevenue, Monthly uses amount)
    const normalizeItems = (items) =>
      items.map((i) => ({
        name: i.name || i.category || 'Unknown',
        amount: i.amount ?? i.totalRevenue ?? 0,
      }));

    const products = calc(normalizeItems(topProducts), totalRevenue);
    const customers = calc(normalizeItems(topCustomers), totalRevenue);
    const expenseCategories = calc(normalizeItems(topExpenses), totalExpenses, 'category', 'amount');

    const supplierItems = Array.isArray(creditors.top3)
      ? creditors.top3
      : Array.isArray(creditors.top)
        ? creditors.top
        : [];
    const suppliers = calc(supplierItems, this._safeNumber(creditors.totalAmount));

    const risks = [
      products.riskLevel,
      customers.riskLevel,
      suppliers.riskLevel,
      expenseCategories.riskLevel,
    ];
    let overallRiskLevel = 'LOW';
    if (risks.includes('HIGH')) overallRiskLevel = 'HIGH';
    else if (risks.includes('MEDIUM')) overallRiskLevel = 'MEDIUM';

    return Object.freeze({
      overallRiskLevel,
      summary:
        overallRiskLevel === 'LOW'
          ? 'Concentration risk is currently low across products, customers, suppliers and expenses.'
          : `Elevated concentration detected (${overallRiskLevel}). Review top contributors.`,
      products,
      customers,
      suppliers,
      expenseCategories,
    });
  }

  _safeNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  }

  _empty(userId, businessId) {
    return Object.freeze({
      userId,
      businessId,
      generatedAt: new Date().toISOString(),
      source: 'ReportAnalyticsTransformer',
      version: ReportAnalyticsTransformer.VERSION,
      period: {},
      reportData: {},
      snapshot: {},
      executive: {},
      analytics: {},
    });
  }
}

module.exports = ReportAnalyticsTransformer;