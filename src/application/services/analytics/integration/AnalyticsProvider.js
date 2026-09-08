const ReportAnalyticsTransformer = require('./ReportAnalyticsTransformer');

class AnalyticsProvider {
  constructor({ reportEngineAdapter }) {
    this.reportEngineAdapter = reportEngineAdapter;
    this.transformer = new ReportAnalyticsTransformer();
  }

  async generateAnalytics({ userId, businessId, startDate, endDate, periodType = 'monthly' }) {
    if (!startDate || !endDate) {
      throw new Error('AnalyticsProvider: startDate and endDate are required');
    }

    // 1. Call the official Report Engine Adapter (SSOT)
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

    // 2. Pure transformation – no calculations
    return this.transformer.transform(adapterResult, { userId, businessId });
  }
}

module.exports = AnalyticsProvider;