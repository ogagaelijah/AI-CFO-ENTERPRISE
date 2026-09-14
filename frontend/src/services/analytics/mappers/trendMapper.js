/**
 * Trend Mapper
 * Works with the clean shape produced by ReportAnalyticsTransformer
 */
export function mapTrends(raw = {}) {
  // The Transformer already returns the final shape under raw.trends
  // or directly as the object
  const trends = raw.trends || raw || {};

  const normalize = (metricData) => {
    if (!metricData) return null;

    return {
      metric: metricData.metric || null,
      displayName: metricData.displayName || metricData.metric || 'Metric',
      data: Array.isArray(metricData.data) ? metricData.data : [],
      current: metricData.current ?? null,
      previous: metricData.previous ?? null,
      percentageChange: metricData.percentageChange ?? null,
      direction: metricData.direction || 'STABLE',
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