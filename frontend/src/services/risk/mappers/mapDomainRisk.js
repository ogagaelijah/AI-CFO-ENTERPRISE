// frontend/src/services/risk/mappers/mapDomainRisk.js

const SEVERITY_COLORS = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'yellow',
  LOW: 'green',
  UNKNOWN: 'gray',
};

const SEVERITY_LABELS = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  UNKNOWN: 'Unknown',
};

export function mapDomainRisk(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const severity = raw.severity || 'LOW';

  return {
    id: raw.id || null,
    type: raw.type || 'UNKNOWN',
    title: raw.title || raw.type || 'Unknown Risk',
    score: Number(raw.score) || 0,
    severity,
    severityLabel: SEVERITY_LABELS[severity] || severity,
    severityColor: SEVERITY_COLORS[severity] || 'gray',
    status: raw.status || 'ACTIVE',
    description: raw.description || '',
    recommendation: raw.recommendation || 'Review and monitor.',
    confidence: Number(raw.confidence) || 0,
    impact: {
      financial: raw.impact?.financial ?? null,
      percentage: raw.impact?.percentage ?? null,
      timeframe: raw.impact?.timeframe ?? null,
    },
    metrics: raw.metrics || {},
    trend: raw.trend
      ? {
          direction: raw.trend.direction || 'STABLE',
          delta: raw.trend.delta ?? null,
        }
      : { direction: 'STABLE', delta: null },
    detectedAt: raw.detectedAt || null,
  };
}