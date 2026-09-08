/**
 * KPI Mapper – Production version
 * Prefers structured KPIs, falls back to reportData (SSOT)
 */
export function mapKpis(rawKpis = {}, reportData = {}) {
  const source = rawKpis?.kpis || rawKpis || {};

  // Helper to extract value safely
  const extract = (obj, fallback = null) => {
    if (obj == null) return { value: fallback, direction: null, percentageChange: null };
    if (typeof obj === 'number') return { value: obj, direction: null, percentageChange: null };
    if (Array.isArray(obj)) return { value: fallback, direction: null, percentageChange: null }; // empty array from backend
    if (typeof obj === 'object') {
      return {
        value: obj.value ?? obj.amount ?? obj.total ?? fallback,
        direction: obj.direction || null,
        percentageChange: obj.percentageChange ?? obj.change ?? null,
        label: obj.label || obj.displayName || null,
        unit: obj.unit || 'currency',
        ...obj,
      };
    }
    return { value: fallback, direction: null, percentageChange: null };
  };

  // Prefer structured KPIs, fall back to reportData
  const revenue = extract(source.revenue, reportData.revenue);
  const grossProfit = extract(source.grossProfit || source.profitability?.grossProfit, reportData.grossProfit);
  const grossMargin = extract(source.grossMargin || source.profitability?.grossMargin, reportData.grossMargin);
  const netProfit = extract(source.netProfit || source.profitability?.netProfit, reportData.netProfit);
  const netMargin = extract(source.netMargin || source.profitability?.netMargin, reportData.netMargin);
  const totalExpenses = extract(source.totalExpenses || source.expenses?.total, reportData.expenses);
  const netCashFlow = extract(source.netCashFlow || source.cash?.netCashFlow, null);
  const inventoryValue = extract(source.inventoryValue || source.inventory?.value, reportData.inventory?.totalValue);

  return {
    revenue,
    revenueGrowth: extract(source.revenueGrowth, reportData.executiveSummary?.revenueChange),
    grossProfit,
    grossMargin,
    netProfit,
    netMargin,
    totalExpenses,
    expenseRatio: extract(source.expenseRatio),
    expenseGrowth: extract(source.expenseGrowth),
    netCashFlow,
    cashFlowMargin: extract(source.cashFlowMargin),
    inventoryValue,
    lowStockCount: extract(source.lowStockCount, reportData.inventory?.lowStockCount),
    customerCount: extract(source.customerCount, reportData.kpiDashboard?.uniqueCustomers),
    customerConcentration: extract(source.customerConcentration),

    // Keep original groups
    groups: {
      revenue: source.revenue || {},
      profitability: source.profitability || {},
      expenses: source.expenses || {},
      cash: source.cash || {},
      inventory: source.inventory || {},
      customer: source.customer || {},
    },
  };
}