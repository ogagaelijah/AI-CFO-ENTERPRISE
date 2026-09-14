/**
 * Ratio Mapper
 * Works with the clean shape produced by ReportAnalyticsTransformer
 */
export function mapRatios(raw = {}) {
  // Transformer already returns the final shape
  const source = raw.ratios || raw || {};

  return {
    profitability: source.profitability || {},
    liquidity: source.liquidity || {},
    efficiency: source.efficiency || {},
    workingCapital: source.workingCapital || {},
    // Keep original for deep dive / debugging
    raw: source,
  };
}