import { mapDecision } from './mapDecision';

export function mapDecisionPackage(raw = {}) {
  if (!raw || raw.error) {
    return {
      available: false,
      error: raw?.reason || raw?.error || 'UNKNOWN',
      message: raw?.message || 'Decision data unavailable',
      decisions: [],
      summary: null,
      executiveSummary: null,
      recommendations: [],
      projected: null,
      riskSummary: null,
      metadata: raw?.metadata || {},
    };
  }

  const decisions = Array.isArray(raw.decisions)
    ? raw.decisions.map(mapDecision)
    : [];

  return {
    available: true,
    generatedAt: raw.generatedAt,
    horizon: raw.horizon,
    period: raw.period,

    projected: raw.projected
      ? {
          revenue: Number(raw.projected.revenue) || 0,
          cogs: Number(raw.projected.cogs) || 0,
          expenses: Number(raw.projected.expenses) || 0,
          profit: Number(raw.projected.profit) || 0,
          cashFlow: Number(raw.projected.cashFlow) || 0,
          receivables: Number(raw.projected.receivables) || 0,
          payables: Number(raw.projected.payables) || 0,
          inventory: Number(raw.projected.inventory) || 0,
          demand: Number(raw.projected.demand) || 0,
        }
      : null,

    decisions,
    summary: {
      total: Number(raw.summary?.total) || 0,
      byPriority: raw.summary?.byPriority || {
        CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
      },
      bySeverity: raw.summary?.bySeverity || {},
      byCategory: raw.summary?.byCategory || {},
      averageConfidence: Number(raw.summary?.averageConfidence) || 0,
      riskOverallSeverity: raw.summary?.riskOverallSeverity || 'LOW',
      riskOverallScore: Number(raw.summary?.riskOverallScore) || 0,
    },

    riskSummary: raw.riskSummary || null,
    domainRisks: raw.domainRisks || null,

    executiveSummary: raw.executiveSummary
      ? {
          totalDecisions: raw.executiveSummary.totalDecisions || 0,
          criticalCount: raw.executiveSummary.criticalCount || 0,
          highCount: raw.executiveSummary.highCount || 0,
          topDecision: raw.executiveSummary.topDecision || null,
          summary: raw.executiveSummary.summary || '',
          riskSeverity: raw.executiveSummary.riskSeverity || 'LOW',
        }
      : null,

    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map((r) => ({
          priority: r.priority || 'MEDIUM',
          title: r.title,
          recommendation: r.recommendation,
          timeframe: r.timeframe || 'SHORT_TERM',
          category: r.category || null,
        }))
      : [],

    metadata: raw.metadata || {},
  };
}