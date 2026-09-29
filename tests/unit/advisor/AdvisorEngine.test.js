/**
 * AdvisorEngine – Production Test Suite v2.0
 *
 * Run: npx jest tests/unit/advisor/AdvisorEngine.test.js --coverage
 */

'use strict';

const AdvisorEngine = require('../../../src/application/services/advisor/AdvisorEngine');
const {
  ADVISOR_CONTEXT,
  ADVISOR_TONE,
  ADVISOR_SEVERITY,
  ADVISOR_SENTIMENT,
  ADVISOR_RESPONSE_TYPES
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

const fixedClock = () => new Date('2026-09-03T19:00:00.000Z');

function createMockInsight(overrides = {}) {
  return {
    category: 'REVENUE',
    title: 'Revenue Growth',
    content: 'Revenue is up 12%.',
    summary: 'Revenue up 12%',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    recommendations: ['Keep marketing spend'],
    confidence: 80,
    toDisplay() {
      return { ...this, generatedAt: fixedClock().toISOString() };
    },
    ...overrides
  };
}

function createMockInsightGenerator(insights = [createMockInsight()]) {
  return {
    generate: jest.fn().mockReturnValue(insights)
  };
}

function createMockResponseBuilder() {
  const response = {
    type: ADVISOR_RESPONSE_TYPES.SUMMARY,
    title: 'Report',
    content: 'Content',
    summary: 'Summary',
    sentiment: ADVISOR_SENTIMENT.NEUTRAL,
    severity: ADVISOR_SEVERITY.INFO,
    insights: [],
    recommendations: ['Review costs', 'Accelerate collections'],
    actions: [],
    toDisplay() {
      return { ...this };
    }
  };
  return {
    build: jest.fn().mockReturnValue(response),
    buildRecommendation: jest.fn().mockReturnValue(response)
  };
}

function createMockSummarizer() {
  const summary = {
    summary: 'Business is healthy.',
    metrics: {},
    wins: [],
    concerns: [],
    opportunities: [],
    takeaways: [],
    recommendations: [],
    context: ADVISOR_CONTEXT.MONTHLY,
    generatedAt: fixedClock()
  };
  return {
    summarize: jest.fn().mockReturnValue(summary),
    formatForDisplay: jest.fn().mockReturnValue({
      ...summary,
      generatedAt: fixedClock().toISOString()
    })
  };
}

function createMockQuestionHandler(result = null) {
  return {
    processQuestion: jest.fn().mockResolvedValue(
      result || {
        requestId: 'q_test',
        intent: 'REVENUE',
        answer: { content: 'Revenue is strong.' },
        entities: {},
        keywords: []
      }
    ),
    getAvailableIntents: jest.fn().mockReturnValue(['REVENUE', 'CASH', 'GENERAL']),
    isSupportedQuestion: jest.fn().mockImplementation(q =>
      typeof q === 'string' && q.toLowerCase().includes('revenue')
    )
  };
}

function createMockProvider(data = {}) {
  return {
    getData: jest.fn().mockResolvedValue(data)
  };
}

function createEngine(overrides = {}) {
  return new AdvisorEngine({
    clock: fixedClock,
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    metrics: {
      increment: jest.fn(),
      histogram: jest.fn(),
      gauge: jest.fn()
    },
    insightGenerator: createMockInsightGenerator(),
    responseBuilder: createMockResponseBuilder(),
    summarizer: createMockSummarizer(),
    questionHandler: createMockQuestionHandler(),
    dataProviders: {},
    ...overrides
  });
}

// ──────────────────────────────────────────────────────────────
describe('AdvisorEngine v2.0', () => {
  let engine;

  beforeEach(() => {
    engine = createEngine();
  });

  // ── Constructor ───────────────────────────────────────────
  describe('constructor', () => {
    it('initialises with SSOT defaults', () => {
      expect(engine.config.defaultContext).toBe(ADVISOR_CONTEXT.MONTHLY);
      expect(engine.config.defaultTone).toBe(ADVISOR_TONE.CONVERSATIONAL);
      expect(engine.config.maxInsights).toBe(20);
      expect(engine.config.confidenceThreshold).toBe(55);
    });

    it('accepts injected collaborators', () => {
      const insightGenerator = createMockInsightGenerator();
      const e = createEngine({ insightGenerator });
      expect(e.insightGenerator).toBe(insightGenerator);
    });
  });

  // ── generateReport ────────────────────────────────────────
  describe('generateReport', () => {
    it('returns a complete report structure', async () => {
      const report = await engine.generateReport(
        { businessId: 'biz_1', businessName: 'Acme' },
        { type: ADVISOR_CONTEXT.MONTHLY }
      );

      expect(report.meta.reportId).toMatch(/^rpt_/);
      expect(report.meta.businessId).toBe('biz_1');
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.MONTHLY);
      expect(report.response).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.metrics).toBeDefined();
    });

    it('includes business name in title path via responseBuilder', async () => {
      await engine.generateReport(
        { businessName: 'Acme Corp' },
        { type: ADVISOR_CONTEXT.MONTHLY }
      );
      expect(engine.responseBuilder.build).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          title: expect.stringContaining('Acme Corp')
        })
      );
    });

    it('respects includeInsights / includeSummary flags', async () => {
      const report = await engine.generateReport({}, {
        includeInsights: false,
        includeSummary: false,
        includeRecommendations: false
      });

      expect(report.insights).toEqual([]);
      expect(report.summary).toBeNull();
      expect(report.recommendations).toEqual([]);
    });

    it('never throws when insight generator fails', async () => {
      const e = createEngine({
        insightGenerator: {
          generate: jest.fn().mockImplementation(() => {
            throw new Error('boom');
          })
        }
      });

      const report = await e.generateReport({});
      expect(report.meta).toBeDefined();
      expect(report.insights).toEqual([]);
      expect(e.logger.error).toHaveBeenCalled();
    });

    it('logs completion metrics', async () => {
      await engine.generateReport({});
      expect(engine.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'report_complete' })
      );
      expect(engine.metrics.histogram).toHaveBeenCalled();
    });
  });

  // ── Convenience report methods ────────────────────────────
  describe('convenience reports', () => {
    it('generateDailyReport', async () => {
      const report = await engine.generateDailyReport({});
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.DAILY);
    });

    it('generateWeeklyReport', async () => {
      const report = await engine.generateWeeklyReport({});
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.WEEKLY);
    });

    it('generateMonthlyReport', async () => {
      const report = await engine.generateMonthlyReport({});
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.MONTHLY);
    });

    it('generateYearlyReport', async () => {
      const report = await engine.generateYearlyReport({});
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.YEARLY);
    });

    it('generateForecastReport', async () => {
      const report = await engine.generateForecastReport({});
      expect(report.meta.type).toBe(ADVISOR_CONTEXT.FORECAST);
    });
  });

  // ── askQuestion ───────────────────────────────────────────
  describe('askQuestion', () => {
    it('delegates to question handler', async () => {
      const result = await engine.askQuestion('How is my revenue?');
      expect(engine.questionHandler.processQuestion).toHaveBeenCalled();
      expect(result.intent).toBe('REVENUE');
    });

    it('never throws when question handler fails', async () => {
      const e = createEngine({
        questionHandler: {
          processQuestion: jest.fn().mockRejectedValue(new Error('fail')),
          getAvailableIntents: jest.fn().mockReturnValue([]),
          isSupportedQuestion: jest.fn().mockReturnValue(false)
        }
      });

      const result = await e.askQuestion('anything');
      expect(result.answer).toBeDefined();
      expect(result.answer.content).toMatch(/issue processing/i);
    });
  });

  // ── getInsights / getSummary / getRecommendations / getWarnings
  describe('getInsights', () => {
    it('returns limited insights', async () => {
      const insights = await engine.getInsights({}, { limit: 1 });
      expect(insights.length).toBeLessThanOrEqual(1);
    });

    it('returns empty array on failure', async () => {
      const e = createEngine({
        insightGenerator: {
          generate: jest.fn().mockImplementation(() => {
            throw new Error('fail');
          })
        }
      });
      const insights = await e.getInsights({});
      expect(insights).toEqual([]);
    });
  });

  describe('getSummary', () => {
    it('returns formatted summary', async () => {
      const summary = await engine.getSummary({});
      expect(summary.summary).toBeDefined();
      expect(engine.summarizer.formatForDisplay).toHaveBeenCalled();
    });
  });

  describe('getRecommendations', () => {
    it('returns capped recommendations', async () => {
      const recs = await engine.getRecommendations({}, { limit: 1 });
      expect(recs.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getWarnings', () => {
    it('filters CRITICAL and HIGH only', async () => {
      const e = createEngine({
        insightGenerator: createMockInsightGenerator([
          createMockInsight({ severity: ADVISOR_SEVERITY.CRITICAL, title: 'Crit' }),
          createMockInsight({ severity: ADVISOR_SEVERITY.INFO, title: 'Info' }),
          createMockInsight({ severity: ADVISOR_SEVERITY.HIGH, title: 'High' })
        ])
      });

      const warnings = await e.getWarnings({});
      expect(warnings.every(w =>
        w.severity === ADVISOR_SEVERITY.CRITICAL ||
        w.severity === ADVISOR_SEVERITY.HIGH
      )).toBe(true);
      expect(warnings.length).toBe(2);
    });
  });

  // ── gatherAllData ─────────────────────────────────────────
  describe('gatherAllData', () => {
    it('merges data from multiple providers', async () => {
      const e = createEngine({
        dataProviders: {
          analytics: createMockProvider({ revenue: 100 }),
          cashFlow: createMockProvider({ currentCash: 50 })
        }
      });

      const data = await e.gatherAllData({});
      expect(data.revenue).toBe(100);
      expect(data.currentCash).toBe(50);
    });

    it('isolates provider failures', async () => {
      const e = createEngine({
        dataProviders: {
          analytics: {
            getData: jest.fn().mockRejectedValue(new Error('down'))
          },
          report: createMockProvider({ ok: true })
        }
      });

      const data = await e.gatherAllData({});
      expect(data.ok).toBe(true);
      expect(e.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'provider_failed', provider: 'analytics' })
      );
    });

    it('times out slow providers without open handles', async () => {
      let resolveSlow;
      const e = createEngine({
        config: { providerTimeoutMs: 50 },
        dataProviders: {
          analytics: {
            getData: jest.fn().mockImplementation(
              () => new Promise(resolve => { resolveSlow = resolve; })
            )
          }
        }
      });

      const data = await e.gatherAllData({});
      expect(data.slow).toBeUndefined();
      expect(e.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'provider_failed' })
      );

      if (typeof resolveSlow === 'function') resolveSlow({});
    }, 10000);
  });

  // ── Helpers ───────────────────────────────────────────────
  describe('helpers', () => {
    it('extractKeyMetrics picks known fields only', () => {
      const metrics = engine.extractKeyMetrics({
        revenue: 10,
        unknown: 99,
        grossMargin: 0.3
      });
      expect(metrics.revenue).toBe(10);
      expect(metrics.grossMargin).toBe(0.3);
      expect(metrics.unknown).toBeUndefined();
    });

    it('generateReportTitle uses SSOT map', () => {
      expect(engine.generateReportTitle(ADVISOR_CONTEXT.DAILY))
        .toContain('Daily');
      expect(engine.generateReportTitle(ADVISOR_CONTEXT.MONTHLY, { businessName: 'Acme' }))
        .toContain('Acme');
    });

    it('getAvailableIntents delegates', () => {
      const intents = engine.getAvailableIntents();
      expect(intents).toContain('REVENUE');
    });

    it('isSupportedQuestion delegates', () => {
      expect(engine.isSupportedQuestion('How is my revenue?')).toBe(true);
      expect(engine.isSupportedQuestion('Hello')).toBe(false);
    });

    it('formatReportForDisplay is safe', () => {
      expect(engine.formatReportForDisplay(null)).toBeNull();
    });
  });

  // ── Resilience ────────────────────────────────────────────
  describe('resilience', () => {
    it('all public methods survive null context', async () => {
      await expect(engine.generateReport(null)).resolves.toBeDefined();
      await expect(engine.getInsights(null)).resolves.toEqual(expect.any(Array));
      await expect(engine.getSummary(null)).resolves.toBeDefined();
      await expect(engine.getRecommendations(null)).resolves.toEqual(expect.any(Array));
      await expect(engine.getWarnings(null)).resolves.toEqual(expect.any(Array));
      await expect(engine.askQuestion(null)).resolves.toBeDefined();
    });
  });
});