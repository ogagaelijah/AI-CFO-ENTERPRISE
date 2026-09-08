export function mapRatios(raw = {}) {
  return {
    profitability: raw.profitability || {},
    liquidity: raw.liquidity || {},
    efficiency: raw.efficiency || {},
    workingCapital: raw.workingCapital || {},
    // Keep original for deep dive
    raw,
  };
}