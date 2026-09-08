export function mapConcentration(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    overallRiskLevel: raw.overallRiskLevel || 'LOW',
    summary: raw.summary || 'No concentration data',
    products: raw.products || { items: [], riskLevel: 'LOW', topPercentage: 0 },
    customers: raw.customers || { items: [], riskLevel: 'LOW', topPercentage: 0 },
    suppliers: raw.suppliers || { items: [], riskLevel: 'LOW', topPercentage: 0 },
    expenseCategories: raw.expenseCategories || { items: [], riskLevel: 'LOW', topPercentage: 0 },
    raw,
  };
}