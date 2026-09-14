/**
 * Performance Mapper
 * Supports both the new simple shape from ReportAnalyticsTransformer
 * and any legacy rich shape
 */
export function mapPerformance(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;

  // Prefer the clean new shape
  const score =
    raw.score ??
    raw.scores?.overall?.score ??
    raw.summary?.overallScore ??
    50;

  const status =
    raw.status ??
    raw.scores?.overall?.status ??
    raw.summary?.overallStatus ??
    'NEUTRAL';

  const narrative =
    raw.narrative ??
    raw.summary?.narrative ??
    '';

  return {
    score: Number(score),
    status,
    narrative,
    categories: raw.scores?.categories || raw.categories || {},
    analysis: raw.analysis || {},
    signals: raw.signals || { positives: [], warnings: [], criticals: [] },
    raw,
  };
}