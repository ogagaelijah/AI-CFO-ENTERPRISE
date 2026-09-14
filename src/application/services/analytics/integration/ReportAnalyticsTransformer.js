/**
 * ReportAnalyticsTransformer
 * SSOT v2.6.0-prod – pure consumer of ReportEngineAdapter
 *
 * Rules (strictly enforced):
 * - Never recalculate base financial numbers
 * - Only map + derive higher-level analytics from already-trusted metrics
 * - No repository access, no independent data fetching
 * - Produces exactly the shapes the frontend expects:
 *     performance, health, trends, ratios
 */

'use strict';

class ReportAnalyticsTransformer {
  static VERSION = '2.6.0-prod';

  transform(adapterResult, { userId, businessId } = {}) {
    if (!adapterResult || !adapterResult.metrics) {
      return this._empty(userId, businessId);
    }

    const metrics = adapterResult.metrics || {};
    const comparison = adapterResult.comparison || {};
    const period = adapterResult.period || {};
    const report = adapterResult.report || {};

    // 1. Pure mappings (already trusted numbers)
    const kpis = this._mapKpis(metrics, comparison, period);
    const comparisons = this._mapComparisons(metrics, comparison);
    const concentration = this._mapConcentration(report, period?.type);

    // 2. Pure derivations for the UI (no recalculation of base numbers)
    const performance = this._derivePerformance(metrics, comparison, concentration);
    const health = this._deriveHealth(metrics, comparison, concentration);
    const trends = this._deriveTrends(metrics, comparison, period);
    const ratios = this._deriveRatios(metrics);

    const packageResult = {
      userId,
      businessId,
      generatedAt: adapterResult.generatedAt || new Date().toISOString(),
      source: 'ReportAnalyticsTransformer',
      version: ReportAnalyticsTransformer.VERSION,
      period,
      reportData: adapterResult, // full SSOT package passed through

      // ===== Core SSOT package =====
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

      // ===== Frontend-required shapes (pure derivations) =====
      performance,
      health,
      trends,
      ratios,
    };

    return Object.freeze(packageResult);
  }

  // ============================================================
  // PURE MAPPINGS
  // ============================================================

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

  // ============================================================
  // PURE DERIVATIONS (no recalculation of base numbers)
  // ============================================================

  /**
   * Performance Score (0-100)
   * Uses only already-calculated metrics + comparison + concentration
   */
  _derivePerformance(metrics, comparison, concentration) {
    let score = 50; // neutral baseline

    const revenueChange = this._safeNumber(comparison.revenueChange);
    const profitChange = this._safeNumber(comparison.profitChange);
    const netMargin = this._safeNumber(metrics.netMargin);
    const grossMargin = this._safeNumber(metrics.grossMargin);
    const netProfit = this._safeNumber(metrics.netProfit);

    // Growth contribution
    if (revenueChange > 15) score += 15;
    else if (revenueChange > 5) score += 10;
    else if (revenueChange > 0) score += 5;
    else if (revenueChange < -10) score -= 15;
    else if (revenueChange < 0) score -= 8;

    // Profitability contribution
    if (netMargin >= 20) score += 15;
    else if (netMargin >= 10) score += 10;
    else if (netMargin >= 5) score += 5;
    else if (netMargin < 0) score -= 20;
    else if (netMargin < 3) score -= 8;

    // Gross margin health
    if (grossMargin >= 40) score += 8;
    else if (grossMargin >= 25) score += 5;
    else if (grossMargin < 15) score -= 8;

    // Absolute profit signal
    if (netProfit > 0) score += 5;
    else score -= 10;

    // Concentration penalty
    if (concentration.overallRiskLevel === 'HIGH') score -= 12;
    else if (concentration.overallRiskLevel === 'MEDIUM') score -= 6;

    // Clamp
    score = Math.max(0, Math.min(100, Math.round(score)));

    let status = 'NEUTRAL';
    if (score >= 80) status = 'EXCELLENT';
    else if (score >= 65) status = 'GOOD';
    else if (score < 40) status = 'CRITICAL';

    const narrativeParts = [];
    if (revenueChange > 5) narrativeParts.push('Strong revenue growth');
    else if (revenueChange < -5) narrativeParts.push('Revenue is declining');
    if (netMargin >= 10) narrativeParts.push('Healthy net margins');
    else if (netMargin < 0) narrativeParts.push('Currently unprofitable');
    if (concentration.overallRiskLevel !== 'LOW') {
      narrativeParts.push(`Concentration risk is ${concentration.overallRiskLevel.toLowerCase()}`);
    }

    const narrative =
      narrativeParts.length > 0
        ? narrativeParts.join('. ') + '.'
        : 'Performance is currently neutral with limited strong signals.';

    return Object.freeze({
      score,
      status,
      narrative,
    });
  }

  /**
   * Business Health Score (0-100)
   * Focuses on sustainability signals already present in the metrics
   */
  _deriveHealth(metrics, comparison, concentration) {
    let score = 55;

    const netMargin = this._safeNumber(metrics.netMargin);
    const grossMargin = this._safeNumber(metrics.grossMargin);
    const cashFlow = metrics.cashFlow; // can be null
    const receivables = this._safeNumber(metrics.receivables);
    const revenue = this._safeNumber(metrics.revenue);
    const revenueChange = this._safeNumber(comparison.revenueChange);

    // Margin health
    if (netMargin >= 15) score += 12;
    else if (netMargin >= 8) score += 7;
    else if (netMargin < 0) score -= 18;
    else if (netMargin < 4) score -= 8;

    if (grossMargin >= 35) score += 8;
    else if (grossMargin < 18) score -= 7;

    // Cash flow signal (only if present)
    if (cashFlow != null) {
      if (cashFlow > 0) score += 10;
      else if (cashFlow < 0) score -= 12;
    }

    // Receivables pressure (relative to revenue)
    if (revenue > 0) {
      const arRatio = receivables / revenue;
      if (arRatio > 0.4) score -= 10;
      else if (arRatio > 0.25) score -= 5;
      else if (arRatio < 0.1) score += 4;
    }

    // Growth trend
    if (revenueChange > 8) score += 6;
    else if (revenueChange < -8) score -= 9;

    // Concentration
    if (concentration.overallRiskLevel === 'HIGH') score -= 10;
    else if (concentration.overallRiskLevel === 'MEDIUM') score -= 5;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let status = 'NEUTRAL';
    if (score >= 80) status = 'EXCELLENT';
    else if (score >= 65) status = 'GOOD';
    else if (score < 40) status = 'CRITICAL';

    const description =
      status === 'EXCELLENT'
        ? 'Business shows strong health across profitability, cash and concentration metrics.'
        : status === 'GOOD'
          ? 'Business is in solid health with a few areas that can be strengthened.'
          : status === 'CRITICAL'
            ? 'Several key health indicators are weak. Immediate attention recommended.'
            : 'Business health is currently neutral. No extreme strengths or weaknesses detected.';

    const recommendations = [];
    if (netMargin < 5 && netMargin >= 0) {
      recommendations.push('Net margin is thin – review pricing and operating expenses.');
    }
    if (netMargin < 0) {
      recommendations.push('Business is currently loss-making. Focus on cost control and revenue recovery.');
    }
    if (cashFlow != null && cashFlow < 0) {
      recommendations.push('Negative cash flow detected. Prioritise collections and working-capital management.');
    }
    if (concentration.overallRiskLevel !== 'LOW') {
      recommendations.push(concentration.summary);
    }
    if (revenueChange < -5) {
      recommendations.push('Revenue is declining. Investigate root causes and customer retention.');
    }

    return Object.freeze({
      score,
      status,
      description,
      recommendations: Object.freeze(recommendations.slice(0, 5)),
    });
  }

  /**
   * Trends – builds the shape expected by TrendCharts
   * Uses current vs previous values only (no new calculations)
   */
  _deriveTrends(metrics, comparison, period) {
    const prev = comparison.previousPeriod || {};

    const makeTrend = (key, displayName, current, previous, percentageChange) => {
      const curr = this._safeNumber(current);
      const prevVal = this._safeNumber(previous);
      const change = percentageChange != null ? this._safeNumber(percentageChange) : null;

      let direction = 'STABLE';
      if (change > 0.5) direction = 'UP';
      else if (change < -0.5) direction = 'DOWN';

      // Minimal sparkline data (current + previous only – still pure)
      const data = [
        { period: 'Previous', value: prevVal },
        { period: period?.label || 'Current', value: curr },
      ];

      return Object.freeze({
        displayName,
        current: curr,
        previous: prevVal,
        direction,
        percentageChange: change,
        data: Object.freeze(data),
      });
    };

    return Object.freeze({
      revenue: makeTrend(
        'revenue',
        'Revenue',
        metrics.revenue,
        prev.revenue,
        comparison.revenueChange
      ),
      expenses: makeTrend(
        'expenses',
        'Expenses',
        metrics.operatingExpenses,
        prev.expenses,
        // approximate % change from absolute values if available
        prev.expenses
          ? Number(
              (
                ((this._safeNumber(metrics.operatingExpenses) - this._safeNumber(prev.expenses)) /
                  Math.abs(this._safeNumber(prev.expenses) || 1)) *
                100
              ).toFixed(2)
            )
          : null
      ),
      profit: makeTrend(
        'profit',
        'Net Profit',
        metrics.netProfit,
        prev.netProfit,
        comparison.profitChange
      ),
      cashFlow: makeTrend(
        'cashFlow',
        'Cash Flow',
        metrics.cashFlow,
        null, // previous cash flow not always present
        null
      ),
    });
  }

  /**
   * Financial Ratios – pure extraction / light derivation from existing metrics
   * Only uses numbers that already exist in the Adapter result
   */
  _deriveRatios(metrics) {
    const revenue = this._safeNumber(metrics.revenue);
    const grossProfit = this._safeNumber(metrics.grossProfit);
    const netProfit = this._safeNumber(metrics.netProfit);
    const grossMargin = this._safeNumber(metrics.grossMargin);
    const netMargin = this._safeNumber(metrics.netMargin);
    const receivables = this._safeNumber(metrics.receivables);
    const payables = this._safeNumber(metrics.payables);
    const inventory = this._safeNumber(metrics.inventory);
    const cash = this._safeNumber(metrics.cash);
    const totalAssets = this._safeNumber(metrics.totalAssets);
    const totalLiabilities = this._safeNumber(metrics.totalLiabilities);

    // Profitability
    const profitability = Object.freeze({
      grossMargin: Number(grossMargin.toFixed(2)),
      netMargin: Number(netMargin.toFixed(2)),
      grossProfit: grossProfit,
      netProfit: netProfit,
    });

    // Liquidity (only if we have the building blocks)
    const currentAssetsApprox = cash + receivables + inventory;
    const currentLiabilitiesApprox = payables; // simplified – only what we have
    const currentRatio =
      currentLiabilitiesApprox > 0
        ? Number((currentAssetsApprox / currentLiabilitiesApprox).toFixed(2))
        : null;

    const liquidity = Object.freeze({
      currentRatio: currentRatio,
      cash: cash,
      receivables: receivables,
      payables: payables,
    });

    // Efficiency
    const arDays =
      revenue > 0 ? Number(((receivables / revenue) * 30).toFixed(1)) : null; // rough 30-day proxy

    const efficiency = Object.freeze({
      receivablesToRevenue: revenue > 0 ? Number(((receivables / revenue) * 100).toFixed(1)) : null,
      estimatedReceivableDays: arDays,
      inventoryValue: inventory,
    });

    // Working Capital
    const workingCapital = Object.freeze({
      workingCapital: Number((currentAssetsApprox - currentLiabilitiesApprox).toFixed(2)),
      cash: cash,
      receivables: receivables,
      payables: payables,
      inventory: inventory,
    });

    return Object.freeze({
      profitability,
      liquidity,
      efficiency,
      workingCapital,
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

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
      performance: null,
      health: null,
      trends: {},
      ratios: {},
    });
  }
}

module.exports = ReportAnalyticsTransformer;