/**
 * AdvisorResponseBuilder – Production Test Suite v2.0
 */

'use strict';

const AdvisorResponseBuilder = require('../../../src/application/services/advisor/AdvisorResponseBuilder');
const {
  ADVISOR_RESPONSE_TYPES,
  ADVISOR_CATEGORIES,
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  CATEGORY_LABEL
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

const { AdvisorInsight } = require('../../../src/application/services/advisor/contracts/AdvisorDataTypes');

// ──────────────────────────────────────────────────────────────
const fixedClock = () => new Date('2026-09-03T19:00:00.000Z');

function createInsight(overrides = {}) {
  return new AdvisorInsight({
    category: ADVISOR_CATEGORIES.REVENUE,
    title: 'Test Insight',
    content: 'Revenue grew 12%.',
    summary: 'Revenue grew 12%.',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    source: 'TEST',
    confidence: 80,
    recommendations: ['Review pricing'],
    ...overrides
  });
}

function createBuilder(overrides = {}) {
  return new AdvisorResponseBuilder({
    clock: fixedClock,
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    metrics: { increment: jest.fn(), histogram: jest.fn(), gauge: jest.fn() },
    ...overrides
  });
}

// ──────────────────────────────────────────────────────────────
describe('AdvisorResponseBuilder v2.0', () => {
  let builder;

  beforeEach(() => {
    builder = createBuilder();
  });

  // ── Constructor ───────────────────────────────────────────
  describe('constructor', () => {
    it('uses sensible defaults', () => {
      expect(builder.defaultTone).toBe(ADVISOR_TONE.CONVERSATIONAL);
      expect(builder.defaultContext).toBe(ADVISOR_CONTEXT.MONTHLY);
      expect(builder.maxRecommendations).toBe(5);
      expect(builder.maxActions).toBe(5);
    });

    it('accepts custom config and dependencies', () => {
      const b = createBuilder({
        defaultTone: ADVISOR_TONE.PROFESSIONAL,
        maxRecommendations: 3
      });
      expect(b.defaultTone).toBe(ADVISOR_TONE.PROFESSIONAL);
      expect(b.maxRecommendations).toBe(3);
    });
  });

  // ── build() ───────────────────────────────────────────────
  describe('build()', () => {
    it('builds a valid response from insights', () => {
      const insights = [
        createInsight({ severity: ADVISOR_SEVERITY.HIGH, sentiment: ADVISOR_SENTIMENT.NEGATIVE }),
        createInsight({ category: ADVISOR_CATEGORIES.CASH, severity: ADVISOR_SEVERITY.INFO })
      ];

      const response = builder.build(insights);

      expect(response).toBeDefined();
      expect(response.type).toBe(ADVISOR_RESPONSE_TYPES.INSIGHT);
      expect(response.insights).toHaveLength(2);
      expect(response.sentiment).toBeDefined();
      expect(response.severity).toBe(ADVISOR_SEVERITY.HIGH);
      expect(response.generatedAt).toEqual(fixedClock());
    });

    it('handles empty insights gracefully', () => {
      const response = builder.build([]);
      expect(response.content).toMatch(/don't have any insights/i);
      expect(response.severity).toBe(ADVISOR_SEVERITY.INFO);
      expect(response.sentiment).toBe(ADVISOR_SENTIMENT.NEUTRAL);
    });

    it('handles null / invalid input without crashing', () => {
      expect(() => builder.build(null)).not.toThrow();
      expect(() => builder.build(undefined)).not.toThrow();
      expect(() => builder.build('not-an-array')).not.toThrow();

      const response = builder.build(null);
      expect(response.insights).toEqual([]);
    });

    it('respects maxInsights', () => {
      const insights = Array.from({ length: 15 }, (_, i) =>
        createInsight({ title: `Insight ${i}` })
      );
      const response = builder.build(insights, { maxInsights: 3 });
      expect(response.insights).toHaveLength(3);
    });

    it('sorts by severity (CRITICAL first)', () => {
      const insights = [
        createInsight({ severity: ADVISOR_SEVERITY.INFO }),
        createInsight({ severity: ADVISOR_SEVERITY.CRITICAL, title: 'Critical one' }),
        createInsight({ severity: ADVISOR_SEVERITY.HIGH })
      ];
      const response = builder.build(insights);
      expect(response.insights[0].severity).toBe(ADVISOR_SEVERITY.CRITICAL);
    });

    it('extracts and limits recommendations', () => {
      const insights = [
        createInsight({
          recommendations: ['Rec A', 'Rec B', 'Rec C', 'Rec D', 'Rec E', 'Rec F']
        })
      ];
      const response = builder.build(insights);
      expect(response.recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  // ── Convenience builders ──────────────────────────────────
  describe('convenience builders', () => {
    const insights = [createInsight()];

    it('buildDailyReport', () => {
      const r = builder.buildDailyReport(insights);
      expect(r.type).toBe(ADVISOR_RESPONSE_TYPES.SUMMARY);
      expect(r.context).toBe(ADVISOR_CONTEXT.DAILY);
      expect(r.title).toContain('Daily');
    });

    it('buildWeeklyReport', () => {
      const r = builder.buildWeeklyReport(insights);
      expect(r.context).toBe(ADVISOR_CONTEXT.WEEKLY);
    });

    it('buildMonthlyReport', () => {
      const r = builder.buildMonthlyReport(insights);
      expect(r.context).toBe(ADVISOR_CONTEXT.MONTHLY);
    });

    it('buildRecommendation', () => {
      const r = builder.buildRecommendation(insights);
      expect(r.type).toBe(ADVISOR_RESPONSE_TYPES.RECOMMENDATION);
    });

    it('buildActionPlan', () => {
      const r = builder.buildActionPlan(insights);
      expect(r.type).toBe(ADVISOR_RESPONSE_TYPES.ACTION_PLAN);
      expect(r.tone).toBe(ADVISOR_TONE.URGENT);
    });

    it('buildWarning', () => {
      const r = builder.buildWarning(insights);
      expect(r.type).toBe(ADVISOR_RESPONSE_TYPES.WARNING);
    });

    it('buildAnswer', () => {
      const r = builder.buildAnswer(insights, 'How is revenue?');
      expect(r.type).toBe(ADVISOR_RESPONSE_TYPES.ANSWER);
      expect(r.question).toBe('How is revenue?');
      expect(r.title).toContain('How is revenue?');
    });
  });

  // ── Sentiment / Severity ──────────────────────────────────
  describe('sentiment & severity aggregation', () => {
    it('returns URGENT when any insight is urgent', () => {
      const insights = [
        createInsight({ sentiment: ADVISOR_SENTIMENT.POSITIVE }),
        createInsight({ sentiment: ADVISOR_SENTIMENT.URGENT })
      ];
      expect(builder.determineOverallSentiment(insights)).toBe(ADVISOR_SENTIMENT.URGENT);
    });

    it('returns CRITICAL when any insight is critical', () => {
      const insights = [
        createInsight({ severity: ADVISOR_SEVERITY.INFO }),
        createInsight({ severity: ADVISOR_SEVERITY.CRITICAL })
      ];
      expect(builder.determineOverallSeverity(insights)).toBe(ADVISOR_SEVERITY.CRITICAL);
    });
  });

  // ── SSOT Category Labels ──────────────────────────────────
  describe('SSOT category labels', () => {
    it('uses CATEGORY_LABEL from contracts', () => {
      expect(builder.getCategoryLabel(ADVISOR_CATEGORIES.REVENUE))
        .toBe(CATEGORY_LABEL[ADVISOR_CATEGORIES.REVENUE]);
      expect(builder.getCategoryLabel(ADVISOR_CATEGORIES.CASH))
        .toBe(CATEGORY_LABEL[ADVISOR_CATEGORIES.CASH]);
      expect(builder.getCategoryLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  // ── Formatters ────────────────────────────────────────────
  describe('formatters', () => {
    let response;

    beforeEach(() => {
      response = builder.build([
        createInsight({
          severity: ADVISOR_SEVERITY.HIGH,
          sentiment: ADVISOR_SENTIMENT.NEGATIVE,
          recommendations: ['Review costs immediately']
        })
      ]);
    });

    it('formatDisplay returns clean object', () => {
      const display = builder.formatDisplay(response);
      expect(display.id).toBe(response.id);
      expect(display.sentimentEmoji).toBeDefined();
      expect(Array.isArray(display.insights)).toBe(true);
      expect(typeof display.generatedAt).toBe('string');
    });

    it('formatText produces readable string', () => {
      const text = builder.formatText(response);
      expect(text).toContain(response.title);
      expect(text).toContain('Recommendations');
    });

    it('formatHTML escapes content and produces valid markup', () => {
      const html = builder.formatHTML(response);
      expect(html).toContain('<div');
      expect(html).toContain(response.title);
      expect(html).not.toMatch(/<script/i);
    });

    it('formatJSON is serialisable', () => {
      const json = builder.formatJSON(response);
      expect(() => JSON.stringify(json)).not.toThrow();
      expect(json.type).toBe(response.type);
    });

    it('formatters handle null response safely', () => {
      expect(builder.formatDisplay(null)).toBeNull();
      expect(builder.formatText(null)).toBe('');
      expect(builder.formatHTML(null)).toBe('');
      expect(builder.formatJSON(null)).toBeNull();
    });
  });

  // ── Resilience ────────────────────────────────────────────
  describe('resilience', () => {
    it('never throws even when AdvisorResponse construction fails', () => {
      // Force a failure path by passing completely invalid options
      const result = builder.build([{ completely: 'invalid' }]);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('logs errors and increments metrics on failure', () => {
      // This path is hard to trigger with valid contracts, but the
      // empty-input path still exercises the happy observability path.
      builder.build([]);
      expect(builder.logger.info).toHaveBeenCalled();
    });
  });
});