/**
 * Health Mapper
 * Supports both the new simple shape from ReportAnalyticsTransformer
 * and any legacy rich shape
 */
export function mapHealth(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;

  const score =
    raw.score ??
    raw.overallScore ??
    raw.summary?.overallScore ??
    50;

  const status =
    raw.status ??
    raw.overallStatus ??
    raw.summary?.overallStatus ??
    'NEUTRAL';

  const description =
    raw.description ??
    raw.summary?.description ??
    '';

  return {
    score: Number(score),
    status,
    description,
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    components: raw.components || raw.breakdown || {},
    signals: raw.signals || { positives: [], warnings: [], criticals: [] },
    bestComponent: raw.summary?.bestComponent || null,
    worstComponent: raw.summary?.worstComponent || null,
    raw,
  };
}