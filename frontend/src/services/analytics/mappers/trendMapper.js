export function mapTrends(raw = {}) {
  const trends = raw.trends || raw || {};

  const normalize = (metricData) => {
    if (!metricData) return null;
    return {
      metric: metricData.metric,
      displayName: metricData.displayName || metricData.metric,
      data: Array.isArray(metricData.data) ? metricData.data : [],
      current: metricData.current ?? null,
      previous: metricData.previous ?? null,
      percentageChange: metricData.percentageChange ?? null,
      direction: metricData.direction || 'FLAT',
      unit: metricData.unit || 'currency',
    };
  };

  return {
    revenue: normalize(trends.revenue),
    expenses: normalize(trends.expenses),
    profit: normalize(trends.profit),
    cashFlow: normalize(trends.cashFlow),
    receivables: normalize(trends.receivables),
    payables: normalize(trends.payables),
    inventory: normalize(trends.inventory),
    aggregation: raw.aggregation || {
      improving: 0,
      declining: 0,
      overallStatus: 'NEUTRAL',
    },
    raw,
  };
}