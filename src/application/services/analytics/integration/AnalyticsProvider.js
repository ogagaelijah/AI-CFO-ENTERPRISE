// src/application/services/analytics/integration/AnalyticsProvider.js
// v2.0.0-prod — Cached analytics provider.
//
// v2.0.0 changes:
//   - generateAnalytics() is now wrapped in cacheService.getOrSet with a
//     5-minute TTL. Cache key: aicfo:analytics:{businessId}:{startDate}:
//     {endDate}:{periodType}.
//   - Cache is shared across dashboard, forecast, and risk consumers.
//     One dashboard request warms the cache; subsequent requests within
//     5 minutes (including forecast/risk) hit the cache.
//   - Invalidated on any successful write via invalidateAfterWrite
//     (cacheInvalidator already targets aicfo:*:{businessId}:*).
//   - In-flight coalescing: CacheService.getOrSet is atomic per key, so
//     concurrent identical requests share one execution.
//
// Impact: dashboard drops from ~25 DB queries to ~1 on cache hit.

'use strict';

const ReportAnalyticsTransformer = require('./ReportAnalyticsTransformer');
const { cacheService } = require('../../../../infrastructure/services/cache/CacheService');

const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class AnalyticsProvider {
  static VERSION = '2.0.0-prod';

  constructor({ reportEngineAdapter }) {
    this.reportEngineAdapter = reportEngineAdapter;
    this.transformer = new ReportAnalyticsTransformer();
  }

  async generateAnalytics({ userId, businessId, startDate, endDate, periodType = 'monthly' }) {
    if (!startDate || !endDate) {
      throw new Error('AnalyticsProvider: startDate and endDate are required');
    }

    const cacheKey = `aicfo:analytics:${businessId}:${startDate}:${endDate}:${periodType}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const adapterResult = await this.reportEngineAdapter.generate({
          userId,
          businessId,
          startDate,
          endDate,
          periodType,
          includeCashFlow: true,
          includeBalanceSheet: true,
          includeInventory: true,
          includeAging: true,
        });

        return this.transformer.transform(adapterResult, { userId, businessId });
      },
      ANALYTICS_CACHE_TTL_MS
    );
  }
}

module.exports = AnalyticsProvider;