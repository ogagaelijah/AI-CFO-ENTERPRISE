export function mapPerformance(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    score: raw.scores?.overall?.score ?? raw.summary?.overallScore ?? 50,
    status: raw.scores?.overall?.status ?? raw.summary?.overallStatus ?? 'NEUTRAL',
    categories: raw.scores?.categories || {},
    analysis: raw.analysis || {},
    signals: raw.signals || { positives: [], warnings: [], criticals: [] },
    narrative: raw.summary?.narrative || '',
    raw,
  };
}