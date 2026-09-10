const PRIORITY_COLORS = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'yellow',
  LOW: 'green',
};

const PRIORITY_LABELS = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const SEVERITY_LABELS = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  INFO: 'Info',
  OPPORTUNITY: 'Opportunity',
};

export function mapDecision(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const priority = raw.priority || 'MEDIUM';
  const severity = raw.severity || 'INFO';

  return {
    id: raw.id || null,
    type: raw.type || 'UNKNOWN',
    category: raw.category || null,
    title: raw.title || 'Decision',
    summary: raw.summary || '',
    recommendation: raw.recommendation || 'Review and act',
    priority,
    priorityLabel: PRIORITY_LABELS[priority] || priority,
    priorityColor: PRIORITY_COLORS[priority] || 'gray',
    severity,
    severityLabel: SEVERITY_LABELS[severity] || severity,
    timeframe: raw.timeframe || 'MEDIUM_TERM',
    confidence: Number(raw.confidence) || 0,
    status: raw.status || 'ACTIVE',
    evidence: raw.evidence || {},
    createdAt: raw.createdAt || null,
  };
}