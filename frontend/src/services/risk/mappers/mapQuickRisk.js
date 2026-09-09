// frontend/src/services/risk/mappers/mapQuickRisk.js

export function mapQuickRisk(raw = {}) {
  return {
    overallScore: Number(raw.overallScore) || 0,
    overallSeverity: raw.overallSeverity || 'LOW',
    criticalCount: Number(raw.criticalCount) || 0,
    highCount: Number(raw.highCount) || 0,
    topRisk: raw.topRisk
      ? {
          type: raw.topRisk.type,
          title: raw.topRisk.title,
          score: Number(raw.topRisk.score) || 0,
          severity: raw.topRisk.severity || 'LOW',
        }
      : null,
    summary: raw.summary || '',
  };
}