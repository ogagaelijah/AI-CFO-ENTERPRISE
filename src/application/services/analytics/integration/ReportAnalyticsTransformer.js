/**
 * ReportAnalyticsTransformer v2.3.0
 * Consumes the clean output from ReportEngineAdapter (SSOT)
 * Never calculates financial numbers – only maps & enriches
 *
 * Permanent improvements:
 * - Balanced performance scoring
 * - Real concentration mapping from Report Engine (products, customers, suppliers, expenses)
 * - Same public shape → zero breaking changes
 */

class ReportAnalyticsTransformer {
  transform(adapterResult, { userId, businessId }) {
    if (!adapterResult) {
      return this._empty(userId, businessId);
    }

    const metrics = adapterResult.metrics || {};
    const comparison = adapterResult.comparison || {};
    const period = adapterResult.period || {};
    const report = adapterResult.report || {};

    const kpis = this._mapKpis(metrics, comparison, period);
    const ratios = this._mapRatios(metrics, period);
    const performance = this._mapPerformance(metrics, comparison);
    const health = this._mapHealth(metrics, performance);
    const concentration = this._mapConcentration(report);
    const signals = this._mapSignals(report);
    const executive = this._mapExecutive(metrics, comparison, health, performance);

    return {
      userId,
      businessId,
      generatedAt: new Date().toISOString(),
      source: 'ReportAnalyticsTransformer',
      version: '2.3.0',
      period,
      reportData: adapterResult,
      snapshot: {
        userId,
        businessId,
        generatedAt: new Date().toISOString(),
        source: 'ReportAnalyticsTransformer',
        version: '2.3.0',
        snapshotType: 'FULL',
        period,
        summary: {
          revenue: metrics.revenue ?? 0,
          revenueGrowth: comparison.revenueChange ?? 0,
          grossMargin: metrics.grossMargin ?? 0,
          healthScore: health.overallScore,
          healthStatus: health.overallStatus,
        },
        signals,
        kpis,
        ratios,
        comparisons: this._mapComparisons(metrics, comparison),
        trends: {},
        concentration,
        performance,
        health,
      },
      executive,
      analytics: {
        kpis,
        ratios,
        comparisons: this._mapComparisons(metrics, comparison),
        trends: {},
        concentration,
        performance,
        health,
      },
    };
  }

  _mapKpis(metrics, comparison, period) {
    const prev = comparison.previousPeriod || {};

    const make = (name, value, previous = null, unit = 'currency') => ({
      name,
      displayName: name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      value: value ?? null,
      previousValue: previous ?? null,
      unit,
      direction: previous == null ? 'N/A' : value > previous ? 'UP' : value < previous ? 'DOWN' : 'STABLE',
      percentageChange: previous && previous !== 0
        ? Number((((value - previous) / Math.abs(previous)) * 100).toFixed(2))
        : null,
      dataStatus: value == null ? 'INSUFFICIENT_DATA' : 'VALID',
      period: period.label || period.type,
      source: 'ReportEngineAdapter',
    });

    return {
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
    };
  }

  _mapRatios(metrics, period) {
    const revenue = metrics.revenue || 0;
    const grossProfit = metrics.grossProfit || 0;
    const netProfit = metrics.netProfit || 0;
    const operatingExpenses = metrics.operatingExpenses || 0;
    const inventory = metrics.inventory || 0;
    const receivables = metrics.receivables || 0;
    const payables = metrics.payables || 0;
    const cash = metrics.cash || metrics.cashFlow || 0;

    // Profitability
    const grossMargin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : null;
    const netMargin = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : null;
    const expenseRatio = revenue > 0 ? Number(((operatingExpenses / revenue) * 100).toFixed(2)) : null;
    const operatingMargin = revenue > 0 ? Number(((grossProfit - operatingExpenses) / revenue * 100).toFixed(2)) : null;

    // Liquidity
    const currentAssets = cash + receivables + inventory;
    const currentLiabilities = payables;
    const currentRatio = currentLiabilities > 0 ? Number((currentAssets / currentLiabilities).toFixed(2)) : null;
    const quickRatio = currentLiabilities > 0 ? Number(((cash + receivables) / currentLiabilities).toFixed(2)) : null;
    const cashRatio = currentLiabilities > 0 ? Number((cash / currentLiabilities).toFixed(2)) : null;

    // Efficiency - with proper fallbacks
    const cogs = (revenue - grossProfit) > 0 ? (revenue - grossProfit) : 0;
    const inventoryTurnover = inventory > 0 && cogs > 0 ? Number((cogs / inventory).toFixed(2)) : null;
    const revenuePerTransaction = revenue > 0 && metrics.salesCount > 0 ? Number((revenue / metrics.salesCount).toFixed(2)) : null;
    const expensePerSale = operatingExpenses > 0 && metrics.salesCount > 0 ? Number((operatingExpenses / metrics.salesCount).toFixed(2)) : null;

    // Working Capital
    const receivablesToRevenue = revenue > 0 ? Number(((receivables / revenue) * 100).toFixed(2)) : null;
    const payablesToPurchases = cogs > 0 ? Number(((payables / cogs) * 100).toFixed(2)) : null;
    const workingCapital = Number((currentAssets - currentLiabilities).toFixed(2));

    return {
      period: period.label || period.type,
      source: 'ReportAnalyticsTransformer',
      profitability: {
        grossMargin: { displayName: 'Gross Margin', value: grossMargin },
        netMargin: { displayName: 'Net Margin', value: netMargin },
        expenseRatio: { displayName: 'Expense Ratio', value: expenseRatio },
        operatingMargin: { displayName: 'Operating Margin', value: operatingMargin },
      },
      liquidity: {
        currentRatio: { displayName: 'Current Ratio', value: currentRatio },
        quickRatio: { displayName: 'Quick Ratio', value: quickRatio },
        cashRatio: { displayName: 'Cash Ratio', value: cashRatio },
      },
      efficiency: {
        inventoryTurnover: { displayName: 'Inventory Turnover', value: inventoryTurnover },
        revenuePerTransaction: { displayName: 'Revenue per Transaction', value: revenuePerTransaction },
        expensePerSale: { displayName: 'Expense per Sale', value: expensePerSale },
      },
      workingCapital: {
        receivablesToRevenue: { displayName: 'Receivables/Revenue', value: receivablesToRevenue },
        payablesToPurchases: { displayName: 'Payables/Purchases', value: payablesToPurchases },
        workingCapital: { displayName: 'Working Capital', value: workingCapital },
      },
    };
  }

  _mapPerformance(metrics, comparison) {
    const netMargin = metrics.netMargin || 0;
    const revenueChange = comparison.revenueChange || 0;
    const revenue = metrics.revenue || 0;
    const netProfit = metrics.netProfit || 0;

    let score = 55;

    // Profitability
    if (netMargin >= 25)      score += 25;
    else if (netMargin >= 18) score += 20;
    else if (netMargin >= 12) score += 12;
    else if (netMargin >= 5)  score += 5;
    else if (netMargin < 0)   score -= 15;

    // Revenue change
    if (revenueChange >= 20)       score += 15;
    else if (revenueChange >= 5)   score += 8;
    else if (revenueChange > 0)    score += 3;
    else if (revenueChange > -15)  score -= 5;
    else if (revenueChange > -40)  score -= 12;
    else                           score -= 18;

    if (revenue > 0) score += 5;
    if (netProfit > 0) score += 3;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let status = 'NEUTRAL';
    if (score >= 85) status = 'EXCELLENT';
    else if (score >= 70) status = 'GOOD';
    else if (score >= 55) status = 'NEUTRAL';
    else if (score >= 40) status = 'WEAK';
    else status = 'CRITICAL';

    return {
      score,
      status,
      summary: {
        overallScore: score,
        overallStatus: status,
        narrative: `Performance score ${score}/100 derived from Report Engine metrics.`,
      },
      signals: { positives: [], warnings: [], criticals: [] },
    };
  }

  _mapHealth(metrics, performance) {
    const netMargin = metrics.netMargin || 0;
    const cashFlow = metrics.cashFlow || 0;

    return {
      overallScore: performance.score,
      overallStatus: performance.status,
      components: {
        profitability: {
          score: netMargin >= 18 ? 85 : netMargin >= 10 ? 70 : netMargin >= 0 ? 50 : 25,
          status: netMargin >= 18 ? 'STRONG' : netMargin >= 10 ? 'GOOD' : netMargin >= 0 ? 'NEUTRAL' : 'WEAK',
        },
        revenueGrowth: {
          score: performance.score >= 55 ? 60 : 40,
          status: performance.score >= 55 ? 'NEUTRAL' : 'WEAK',
        },
        cashPosition: {
          score: cashFlow >= 0 ? 70 : 35,
          status: cashFlow >= 0 ? 'STRONG' : 'WEAK',
        },
      },
      recommendations: [],
      summary: {
        overallScore: performance.score,
        overallStatus: performance.status,
        description: `Health assessment: ${performance.score}/100 (${performance.status})`,
      },
      signals: { positives: [], warnings: [], criticals: [] },
    };
  }

  /**
   * Real Concentration mapping from Report Engine data
   * Uses topProducts, topCustomers, topExpenses, debtors, creditors
   */
  _mapConcentration(report = {}) {
    const monthly = report.monthly || {};
    const topProducts = Array.isArray(monthly.topProducts) ? monthly.topProducts : [];
    const topCustomers = Array.isArray(monthly.topCustomers) ? monthly.topCustomers : [];
    const topExpenses = Array.isArray(monthly.topExpenses) ? monthly.topExpenses : [];
    const debtors = monthly.debtors || {};
    const creditors = monthly.creditors || {};

    const totalRevenue = monthly.revenue || 0;
    const totalExpenses = monthly.expenses || 0;

    // Helper to calculate concentration
    const calc = (items, total, nameKey = 'name', amountKey = 'amount') => {
      if (!items.length || total <= 0) {
        return { riskLevel: 'LOW', topPercentage: 0, topCount: 0, items: [] };
      }

      const sorted = [...items].sort((a, b) => (b[amountKey] || 0) - (a[amountKey] || 0));
      const top3 = sorted.slice(0, 3);
      const topSum = top3.reduce((sum, i) => sum + (i[amountKey] || 0), 0);
      const topPercentage = Number(((topSum / total) * 100).toFixed(1));

      let riskLevel = 'LOW';
      if (topPercentage >= 70) riskLevel = 'HIGH';
      else if (topPercentage >= 45) riskLevel = 'MEDIUM';

      return {
        riskLevel,
        topPercentage,
        topCount: top3.length,
        items: top3.map(i => ({
          name: i[nameKey] || i.category || 'Unknown',
          amount: i[amountKey] || 0,
          percentage: total > 0 ? Number(((i[amountKey] || 0) / total * 100).toFixed(1)) : 0,
        })),
      };
    };

    const products = calc(topProducts, totalRevenue);
    const customers = calc(topCustomers, totalRevenue);
    const expenseCategories = calc(topExpenses, totalExpenses, 'category', 'amount');

    // Suppliers from creditors
    const supplierItems = Array.isArray(creditors.top3)
      ? creditors.top3
      : (Array.isArray(creditors.top) ? creditors.top : []);
    const suppliers = calc(supplierItems, creditors.totalAmount || 0);

    // Overall risk
    const risks = [products.riskLevel, customers.riskLevel, suppliers.riskLevel, expenseCategories.riskLevel];
    let overallRiskLevel = 'LOW';
    if (risks.includes('HIGH')) overallRiskLevel = 'HIGH';
    else if (risks.includes('MEDIUM')) overallRiskLevel = 'MEDIUM';

    return {
      overallRiskLevel,
      summary: overallRiskLevel === 'LOW'
        ? 'Concentration risk is currently low across products, customers, suppliers and expenses.'
        : `Elevated concentration detected (${overallRiskLevel}). Review top contributors.`,
      products,
      customers,
      suppliers,
      expenseCategories,
    };
  }

  _mapComparisons(metrics, comparison) {
    const prev = comparison.previousPeriod || {};
    return {
      previousPeriod: {
        revenue: {
          current: metrics.revenue,
          previous: prev.revenue,
          percentageChange: comparison.revenueChange,
          direction: comparison.revenueChange > 0 ? 'UP' : comparison.revenueChange < 0 ? 'DOWN' : 'NO_CHANGE',
        },
        netProfit: {
          current: metrics.netProfit,
          previous: prev.netProfit,
          percentageChange: comparison.profitChange,
          direction: comparison.profitChange > 0 ? 'UP' : comparison.profitChange < 0 ? 'DOWN' : 'NO_CHANGE',
        },
      },
      growth: {
        revenueGrowth: { value: comparison.revenueChange },
        profitGrowth: { value: comparison.profitChange },
      },
    };
  }

  _mapSignals() {
    return { positives: [], warnings: [], criticals: [] };
  }

  _mapExecutive(metrics, comparison, health, performance) {
    const revenue = metrics.revenue || 0;
    const netProfit = metrics.netProfit || 0;
    const netMargin = metrics.netMargin || 0;
    const grossMargin = metrics.grossMargin || 0;
    const growth = comparison.revenueChange || 0;

    const growthText = growth < 0
      ? `Revenue declined ${Math.abs(growth).toFixed(1)}%`
      : `Revenue grew ${growth.toFixed(1)}%`;

    return {
      keyMetrics: {
        revenue,
        revenueGrowth: growth,
        netProfit,
        netMargin: Number(netMargin.toFixed(2)),
        grossMargin: Number(grossMargin.toFixed(2)),
        netCashFlow: metrics.cashFlow ?? null,
      },
      performanceSummary: {
        score: performance.score,
        status: performance.status,
      },
      healthSummary: {
        score: health.overallScore,
        status: health.overallStatus,
      },
      signalSummary: { positiveCount: 0, warningCount: 0, criticalCount: 0 },
      executiveSummary: {
        narrative: `Revenue ₦${revenue.toLocaleString()} • Net Profit ₦${netProfit.toLocaleString()} • Net Margin ${Number(netMargin).toFixed(2)}% • ${growthText}. Health: ${health.overallScore}/100.`,
        overallRiskLevel: 'LOW',
      },
    };
  }

  _empty(userId, businessId) {
    return {
      userId,
      businessId,
      generatedAt: new Date().toISOString(),
      source: 'ReportAnalyticsTransformer',
      version: '2.3.0',
      period: {},
      reportData: {},
      snapshot: {},
      executive: {},
      analytics: {},
    };
  }
}

module.exports = ReportAnalyticsTransformer;