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
 * Supports both top-level fields (new Transformer) and nested fields (legacy)
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
      version: raw.version || '2.6.0-prod',
      period: raw.period || snapshot.period || {},
    },

    // Executive layer
    executive: mapExecutive(executive, snapshot, reportData),

    // Core analytics – prefer top-level (new Transformer), then nested
    kpis: mapKpis(
      raw.kpis || snapshot.kpis || analytics.kpis || {},
      reportData
    ),

    ratios: mapRatios(
      raw.ratios || snapshot.ratios || analytics.ratios || {}
    ),

    trends: mapTrends(
      raw.trends || snapshot.trends || analytics.trends || {}
    ),

    performance: mapPerformance(
      raw.performance || snapshot.performance || analytics.performance || {}
    ),

    health: mapHealth(
      raw.health || snapshot.health || analytics.health || {}
    ),

    concentration: mapConcentration(
      raw.concentration || snapshot.concentration || analytics.concentration || {}
    ),

    comparisons: mapComparisons(
      raw.comparisons || snapshot.comparisons || analytics.comparisons || {}
    ),

    signals: raw.signals || snapshot.signals || executive.signalSummary?.allSignals || {
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