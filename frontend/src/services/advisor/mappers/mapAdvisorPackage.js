export function mapAdvisorPackage(raw = {}) {
  if (!raw || raw.error) {
    return {
      available: false,
      error: raw?.reason || 'UNKNOWN',
      message: raw?.message || 'Advisor data unavailable',
      insights: [],
      recommendations: [],
      summary: null,
      projected: null,
      metadata: raw?.metadata || {},
    };
  }

  return {
    available: true,
    generatedAt: raw.generatedAt,
    horizon: raw.horizon,
    period: raw.period,
    projected: raw.projected || null,
    insights: Array.isArray(raw.insights)
      ? raw.insights.map((i) => ({
          id: i.id,
          type: i.type,
          category: i.category,
          title: i.title,
          content: i.content,
          summary: i.summary,
          sentiment: i.sentiment || 'NEUTRAL',
          severity: i.severity || 'INFO',
          recommendation: i.recommendation,
          confidence: Number(i.confidence) || 0,
        }))
      : [],
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map((r) => ({
          priority: r.priority || 'MEDIUM',
          title: r.title,
          recommendation: r.recommendation,
          timeframe: r.timeframe,
          category: r.category,
        }))
      : [],
    summary: {
      totalInsights: Number(raw.summary?.totalInsights) || 0,
      criticalCount: Number(raw.summary?.criticalCount) || 0,
      highCount: Number(raw.summary?.highCount) || 0,
      summary: raw.summary?.summary || '',
      riskOverallSeverity: raw.summary?.riskOverallSeverity || 'LOW',
    },
    decisionSummary: raw.decisionSummary || null,
    riskSummary: raw.riskSummary || null,
    executiveSummary: raw.executiveSummary || null,
    metadata: raw.metadata || {},
  };
}