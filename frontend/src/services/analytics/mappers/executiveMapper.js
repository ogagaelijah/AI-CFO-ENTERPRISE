/**
 * Executive Mapper – Production version
 * Prefers the already-correct keyMetrics from ReportAnalyticsTransformer
 * Falls back to reportData.metrics only if needed
 */
export function mapExecutive(executive = {}, snapshot = {}, reportData = {}) {
  const km = executive.keyMetrics || {};
  const metrics = reportData.metrics || {};
  const comparison = reportData.comparison || {};

  const revenue = km.revenue ?? metrics.revenue ?? 0;
  const netProfit = km.netProfit ?? metrics.netProfit ?? 0;
  const netMargin = km.netMargin ?? metrics.netMargin ?? 0;
  const grossMargin = km.grossMargin ?? metrics.grossMargin ?? 0;
  const revenueGrowth = km.revenueGrowth ?? comparison.revenueChange ?? 0;
  const netCashFlow = km.netCashFlow ?? metrics.cashFlow ?? null;

  const keyMetrics = {
    revenue,
    revenueGrowth,
    netProfit,
    netMargin,
    grossMargin,
    netCashFlow,
  };

  // Prefer the narrative already built by the Transformer
  const narrative =
    executive.executiveSummary?.narrative ||
    `Revenue ₦${Number(revenue).toLocaleString()} • Net Profit ₦${Number(netProfit).toLocaleString()} • Net Margin ${Number(netMargin).toFixed(1)}% • Health: ${
      executive.healthSummary?.score ?? snapshot.summary?.healthScore ?? 50
    }/100.`;

  return {
    keyMetrics,
    performanceSummary: executive.performanceSummary || {
      score: 50,
      status: 'NEUTRAL',
    },
    healthSummary: executive.healthSummary || {
      score: snapshot.summary?.healthScore ?? 50,
      status: snapshot.summary?.healthStatus ?? 'NEUTRAL',
    },
    signalSummary: executive.signalSummary || {
      positiveCount: 0,
      warningCount: 0,
      criticalCount: 0,
    },
    executiveSummary: {
      narrative,
      overallRiskLevel: executive.executiveSummary?.overallRiskLevel || 'LOW',
    },
  };
}