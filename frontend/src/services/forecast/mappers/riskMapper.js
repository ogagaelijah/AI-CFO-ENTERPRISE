/**
 * Risk Mapper – Forecast
 * Maps forecast risk data
 */

import { formatCurrency, getRiskSeverity } from './helpers';

export function mapRisks(risks = {}) {
  const riskList = risks.risks || [];
  const counts = risks.counts || {};
  const overallSeverity = risks.overallSeverity || 'LOW';

  return {
    risks: riskList.map((risk) => ({
      id: risk.id || null,
      metric: risk.metric || '',
      displayName: risk.displayName || 'Unknown Risk',
      type: risk.type || 'UNKNOWN',
      severity: risk.severity || 'LOW',
      severityInfo: getRiskSeverity(risk.severity || 'LOW'),
      description: risk.description || '',
      trigger: risk.trigger || '',
      action: risk.action || null,
      impact: risk.impact || 0,
      impactFormatted: formatCurrency(risk.impact || 0),
      detectedAt: risk.detectedAt || null,
    })),
    overallSeverity,
    severityInfo: getRiskSeverity(overallSeverity),
    summary: risks.summary || 'No significant risks detected',
    counts: {
      critical: counts.critical ?? 0,
      high: counts.high ?? 0,
      medium: counts.medium ?? 0,
      low: counts.low ?? 0,
      total: counts.total ?? 0,
    },
    metadata: risks.metadata || {},
  };
}

export function getEmptyRisks() {
  return {
    risks: [],
    overallSeverity: 'LOW',
    severityInfo: { label: 'Low', color: '#65A30D', bg: '#DCFCE7', icon: '✅' },
    summary: 'No significant risks detected',
    counts: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    metadata: {},
  };
}

export default { mapRisks, getEmptyRisks };