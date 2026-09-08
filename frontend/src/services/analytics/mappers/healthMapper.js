export function mapHealth(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    score: raw.overallScore ?? raw.summary?.overallScore ?? 50,
    status: raw.overallStatus ?? raw.summary?.overallStatus ?? 'NEUTRAL',
    components: raw.components || raw.breakdown || {},
    signals: raw.signals || { positives: [], warnings: [], criticals: [] },
    recommendations: raw.recommendations || [],
    bestComponent: raw.summary?.bestComponent || null,
    worstComponent: raw.summary?.worstComponent || null,
    description: raw.summary?.description || '',
    raw,
  };
}