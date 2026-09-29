/**
 * AdvisorSummarizer – Production Test Suite v2.0
 */

'use strict';

const AdvisorSummarizer = require('../../../src/application/services/advisor/AdvisorSummarizer');
const {
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  ADVISOR_CATEGORIES
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

const fixedClock = () => new Date('2026-09-03T19:00:00.000Z');

function createSummarizer(overrides = {}) {
  return new AdvisorSummarizer({
    clock: fixedClock,
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    metrics: { increment: jest.fn(), histogram: jest.fn(), gauge: jest.fn() },
    ...overrides
  });
}

const SAMPLE_DATA = {
  revenue: 1_250_000,
  revenueGrowth: 0.18,
  grossMargin: 0.34,
  previousGrossMargin: 0.30,
  netProfit: 180_000,
  currentCash: 450_000,
  monthlyExpenses: 60_000,
  cashTrend: 0.05,
  newCustomers: 42,
  newCustomerGrowth: 0.28,
  repeatRate: 0.41,
  inventoryTurnover: 5.8,
  previousInventoryTurnover: 4.9,
  productGrowth: 0.35,
  topProduct: 'Pro Plan'
};

describe('AdvisorSummarizer v2.0', () => {
  let summarizer;

  beforeEach(() => {
    summarizer = createSummarizer();
  });

  // ── Constructor ───────────────────────────────────────────
  describe('constructor', () => {
    it('uses defaults from SSOT config', () => {
      expect(summarizer.maxSummaryLength).toBe(500);
      expect(summarizer.defaultTone).toBe(ADVISOR_TONE.CONVERSATIONAL);
      expect(summarizer.config.currencySymbol).toBe('₦');
    });

    it('accepts overrides', () => {
      const s = createSummarizer({
        maxSummaryLength: 300,
        config: { currencySymbol: '$' }
      });
      expect(s.maxSummaryLength).toBe(300);
      expect(s.config.currencySymbol).toBe('$');
    });
  });

  // ── summarize() ───────────────────────────────────────────
  describe('summarize()', () => {
    it('returns a complete summary object', () => {
      const result = summarizer.summarize(SAMPLE_DATA);

      expect(result.summary).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.wins).toBeDefined();
      expect(result.concerns).toBeDefined();
      expect(result.opportunities).toBeDefined();
      expect(result.takeaways).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.context).toBe(ADVISOR_CONTEXT.MONTHLY);
      expect(result.generatedAt).toEqual(fixedClock());
    });

    it('identifies strong revenue growth as a win', () => {
      const result = summarizer.summarize(SAMPLE_DATA);
      expect(result.wins.some(w => w.title.includes('revenue growth'))).toBe(true);
    });

    it('identifies margin improvement as a win', () => {
      const result = summarizer.summarize(SAMPLE_DATA);
      expect(result.wins.some(w => w.title.includes('Margin improvement'))).toBe(true);
    });

    it('identifies strong cash position', () => {
      const result = summarizer.summarize(SAMPLE_DATA);
      expect(result.wins.some(w => w.title.includes('cash position'))).toBe(true);
    });

    it('detects revenue decline as a concern', () => {
      const result = summarizer.summarize({
        ...SAMPLE_DATA,
        revenueGrowth: -0.12
      });
      expect(result.concerns.some(c => c.title.includes('Revenue declining'))).toBe(true);
    });

    it('detects cash shortage risk', () => {
      const result = summarizer.summarize({
        projectedCash: 40_000,
        minimumCashThreshold: 100_000,
        currentCash: 50_000
      });
      expect(result.concerns.some(c => c.severity === ADVISOR_SEVERITY.CRITICAL)).toBe(true);
    });

    it('handles empty / null data safely', () => {
      expect(() => summarizer.summarize(null)).not.toThrow();
      expect(() => summarizer.summarize(undefined)).not.toThrow();
      expect(() => summarizer.summarize({})).not.toThrow();

      const result = summarizer.summarize(null);
      expect(result.wins).toEqual([]);
      expect(result.concerns).toEqual([]);
      expect(result.summary).toBeDefined();
    });

    it('respects maxLength', () => {
      const result = summarizer.summarize(SAMPLE_DATA, [], { maxLength: 80 });
      expect(result.summary.length).toBeLessThanOrEqual(80);
    });

    it('freezes returned collections', () => {
      const result = summarizer.summarize(SAMPLE_DATA);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.wins)).toBe(true);
    });
  });

  // ── Convenience methods ───────────────────────────────────
  describe('convenience methods', () => {
    it('summarizeDaily', () => {
      const r = summarizer.summarizeDaily(SAMPLE_DATA);
      expect(r.context).toBe(ADVISOR_CONTEXT.DAILY);
    });

    it('summarizeWeekly', () => {
      const r = summarizer.summarizeWeekly(SAMPLE_DATA);
      expect(r.context).toBe(ADVISOR_CONTEXT.WEEKLY);
    });

    it('summarizeMonthly', () => {
      const r = summarizer.summarizeMonthly(SAMPLE_DATA);
      expect(r.context).toBe(ADVISOR_CONTEXT.MONTHLY);
    });

    it('summarizeYearly', () => {
      const r = summarizer.summarizeYearly(SAMPLE_DATA);
      expect(r.context).toBe(ADVISOR_CONTEXT.YEARLY);
    });

    it('summarizeForecast', () => {
      const r = summarizer.summarizeForecast(SAMPLE_DATA);
      expect(r.context).toBe(ADVISOR_CONTEXT.FORECAST);
    });
  });

  // ── Metrics & Formatting ──────────────────────────────────
  describe('metrics & formatting', () => {
    it('extractKeyMetrics populates formatted fields', () => {
      const metrics = summarizer.extractKeyMetrics(SAMPLE_DATA);
      expect(metrics.revenueFormatted).toContain('₦');
      expect(metrics.revenueGrowthFormatted).toContain('%');
      expect(metrics.grossMarginFormatted).toContain('%');
    });

    it('formatCurrency handles edge cases', () => {
      expect(summarizer.formatCurrency(null)).toBe('₦0');
      expect(summarizer.formatCurrency(undefined)).toBe('₦0');
      expect(summarizer.formatCurrency(1234567)).toBe('₦1,234,567');
    });

    it('formatPercentage handles edge cases', () => {
      expect(summarizer.formatPercentage(null)).toBe('0%');
      expect(summarizer.formatPercentage(0.156)).toBe('+15.6%');
      expect(summarizer.formatPercentage(-0.08)).toBe('-8.0%');
    });
  });

  // ── Formatters ────────────────────────────────────────────
  describe('formatters', () => {
    it('formatForDisplay returns a clean object', () => {
      const result = summarizer.summarize(SAMPLE_DATA);
      const display = summarizer.formatForDisplay(result);

      expect(display.summary).toBe(result.summary);
      expect(typeof display.generatedAt).toBe('string');
      expect(Array.isArray(display.wins)).toBe(true);
    });

    it('formatForText produces readable output', () => {
      const result = summarizer.summarize(SAMPLE_DATA);
      const text = summarizer.formatForText(result);

      expect(text).toContain(result.summary);
      expect(text.length).toBeGreaterThan(50);
    });

    it('formatters handle null safely', () => {
      expect(summarizer.formatForDisplay(null)).toBeNull();
      expect(summarizer.formatForText(null)).toBe('');
    });
  });

  // ── Insights integration ──────────────────────────────────
  describe('insights integration', () => {
    it('pulls positive insights into wins', () => {
      const insights = [{
        sentiment: ADVISOR_SENTIMENT.POSITIVE,
        severity: ADVISOR_SEVERITY.HIGH,
        category: ADVISOR_CATEGORIES.GROWTH,
        title: 'New market traction',
        summary: 'Strong uptake in a new segment',
        confidence: 82
      }];

      const result = summarizer.summarize({}, insights);
      expect(result.wins.some(w => w.title === 'New market traction')).toBe(true);
    });

    it('pulls negative insights into concerns', () => {
      const insights = [{
        sentiment: ADVISOR_SENTIMENT.NEGATIVE,
        severity: ADVISOR_SEVERITY.HIGH,
        category: ADVISOR_CATEGORIES.RISK,
        title: 'Supplier risk',
        summary: 'Key supplier delayed',
        confidence: 78
      }];

      const result = summarizer.summarize({}, insights);
      expect(result.concerns.some(c => c.title === 'Supplier risk')).toBe(true);
    });
  });

  // ── Resilience ────────────────────────────────────────────
  describe('resilience', () => {
    it('never throws on completely invalid input', () => {
      expect(() => summarizer.summarize('bad')).not.toThrow();
      expect(() => summarizer.summarize({}, 'not-array')).not.toThrow();
    });

    it('logs completion metrics on success', () => {
      summarizer.summarize(SAMPLE_DATA);
      expect(summarizer.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'summary_complete' })
      );
      expect(summarizer.metrics.histogram).toHaveBeenCalled();
    });
  });
});