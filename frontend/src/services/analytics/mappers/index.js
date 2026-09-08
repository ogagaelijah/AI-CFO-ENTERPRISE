import { mapKpis } from './kpiMapper';
import { mapRatios } from './ratioMapper';
import { mapTrends } from './trendMapper';
import { mapPerformance } from './performanceMapper';
import { mapHealth } from './healthMapper';
import { mapConcentration } from './concentrationMapper';
import { mapComparisons } from './comparisonMapper';
import { mapExecutive } from './executiveMapper';

/**
 * Master mapper – converts backend AnalyticsProvider response
 * into a clean, UI-ready structure
 */
export function mapAnalyticsResponse(raw) {
  if (!raw) return getEmptyAnalytics();

  const snapshot = raw.snapshot || {};
  const executive = raw.executive || {};
  const analytics = raw.analytics || {};
  const reportData = raw.reportData || {};

  return {
    meta: {
      businessId: raw.businessId,
      generatedAt: raw.generatedAt || snapshot.generatedAt,
      source: raw.source || 'AnalyticsProvider',
      version: raw.version || '1.0.0',
      period: raw.period || snapshot.period || {},
    },

    // Executive layer
    executive: mapExecutive(executive, snapshot, reportData),

    // Core analytics – pass reportData as fallback
    kpis: mapKpis(snapshot.kpis || analytics.kpis || {}, reportData),
    ratios: mapRatios(snapshot.ratios || analytics.ratios || {}),
    trends: mapTrends(snapshot.trends || analytics.trends || {}),
    performance: mapPerformance(snapshot.performance || analytics.performance || {}),
    health: mapHealth(snapshot.health || analytics.health || {}),
    concentration: mapConcentration(snapshot.concentration || analytics.concentration || {}),
    comparisons: mapComparisons(snapshot.comparisons || analytics.comparisons || {}),

    signals: snapshot.signals || executive.signalSummary?.allSignals || {
      positives: [],
      warnings: [],
      criticals: [],
    },

    summary: snapshot.summary || {},
    reportData, // keep raw for debugging
  };
}

function getEmptyAnalytics() {
  return {
    meta: { period: {}, generatedAt: null },
    executive: null,
    kpis: {},
    ratios: {},
    trends: {},
    performance: null,
    health: null,
    concentration: null,
    comparisons: null,
    signals: { positives: [], warnings: [], criticals: [] },
    summary: {},
  };
}