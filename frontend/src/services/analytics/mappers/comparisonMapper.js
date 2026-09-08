export function mapComparisons(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    previousPeriod: raw.previousPeriod || {},
    growth: raw.growth || {},
    summary: raw.summary || null,
    raw,
  };
}