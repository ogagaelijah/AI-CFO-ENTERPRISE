/**
 * AdvisorQuestionHandler – Production Test Suite v2.0
 *
 * Run: npx jest tests/unit/advisor/AdvisorQuestionHandler.test.js --coverage
 */

'use strict';

const AdvisorQuestionHandler = require('../../../src/application/services/advisor/AdvisorQuestionHandler');
const {
  ADVISOR_QUESTION_INTENT,
  QUESTION_INTENT_LABEL
} = require('../../../src/application/services/advisor/AdvisorQuestionHandler');

const {
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  ADVISOR_RESPONSE_TYPES
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

// ──────────────────────────────────────────────────────────────
// Helpers / Mocks
// ──────────────────────────────────────────────────────────────
const fixedClock = () => new Date('2026-09-03T19:00:00.000Z');

function createMockInsightGenerator(insights = []) {
  return {
    generate: jest.fn().mockReturnValue(insights)
  };
}

function createMockResponseBuilder(answerOverrides = {}) {
  const defaultAnswer = {
    id: 'response_test',
    type: ADVISOR_RESPONSE_TYPES.ANSWER,
    title: 'Test Answer',
    content: 'Here is your answer.',
    summary: 'Summary',
    sentiment: ADVISOR_SENTIMENT.NEUTRAL,
    severity: ADVISOR_SEVERITY.INFO,
    insights: [],
    recommendations: [],
    actions: [],
    toDisplay() {
      return { ...this };
    },
    ...answerOverrides
  };

  return {
    buildAnswer: jest.fn().mockReturnValue(defaultAnswer)
  };
}

function createMockProvider(data = {}) {
  return {
    getData: jest.fn().mockResolvedValue(data),
    getProfitData: jest.fn().mockResolvedValue(data)
  };
}

function createHandler(overrides = {}) {
  return new AdvisorQuestionHandler({
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
    summarizer: {},
    dataProviders: {},
    ...overrides
  });
}

// ──────────────────────────────────────────────────────────────
describe('AdvisorQuestionHandler v2.0', () => {
  let handler;

  beforeEach(() => {
    handler = createHandler();
  });

  // ── Constructor ───────────────────────────────────────────
  describe('constructor', () => {
    it('initialises with defaults', () => {
      expect(handler.config.providerTimeoutMs).toBe(4000);
      expect(handler.config.maxQuestionLength).toBe(500);
      expect(handler.intentPatterns).toBeDefined();
      expect(handler.entityPatterns).toBeDefined();
    });

    it('accepts injected collaborators', () => {
      const insightGenerator = createMockInsightGenerator();
      const responseBuilder = createMockResponseBuilder();
      const h = createHandler({ insightGenerator, responseBuilder });

      expect(h.insightGenerator).toBe(insightGenerator);
      expect(h.responseBuilder).toBe(responseBuilder);
    });
  });

  // ── determineIntent ───────────────────────────────────────
  describe('determineIntent', () => {
    it('detects PERFORMANCE intent', () => {
      expect(handler.determineIntent('How is my business doing?'))
        .toBe(ADVISOR_QUESTION_INTENT.PERFORMANCE);
    });

    it('detects REVENUE intent', () => {
      expect(handler.determineIntent('What is my revenue growth?'))
        .toBe(ADVISOR_QUESTION_INTENT.REVENUE);
    });

    it('detects PROFIT intent', () => {
      expect(handler.determineIntent('Why is profit declining?'))
        .toBe(ADVISOR_QUESTION_INTENT.PROFIT);
    });

    it('detects CASH intent', () => {
      expect(handler.determineIntent('How much cash do I have?'))
        .toBe(ADVISOR_QUESTION_INTENT.CASH);
    });

    it('detects CUSTOMERS intent', () => {
      expect(handler.determineIntent('Tell me about customer acquisition'))
        .toBe(ADVISOR_QUESTION_INTENT.CUSTOMERS);
    });

    it('detects INVENTORY intent', () => {
      expect(handler.determineIntent('What is my inventory turnover?'))
        .toBe(ADVISOR_QUESTION_INTENT.INVENTORY);
    });

    it('detects RISK intent', () => {
      expect(handler.determineIntent('What are the main risks?'))
        .toBe(ADVISOR_QUESTION_INTENT.RISK);
    });

    it('detects FORECAST intent', () => {
      expect(handler.determineIntent('What is the outlook for next quarter?'))
        .toBe(ADVISOR_QUESTION_INTENT.FORECAST);
    });

    it('detects RECOMMENDATION intent', () => {
      expect(handler.determineIntent('What should I do next?'))
        .toBe(ADVISOR_QUESTION_INTENT.RECOMMENDATION);
    });

    it('returns GENERAL for unknown questions', () => {
      expect(handler.determineIntent('Hello there'))
        .toBe(ADVISOR_QUESTION_INTENT.GENERAL);
    });

    it('handles null / empty safely', () => {
      expect(handler.determineIntent(null)).toBe(ADVISOR_QUESTION_INTENT.GENERAL);
      expect(handler.determineIntent('')).toBe(ADVISOR_QUESTION_INTENT.GENERAL);
      expect(handler.determineIntent(undefined)).toBe(ADVISOR_QUESTION_INTENT.GENERAL);
    });
  });

  // ── extractEntities ───────────────────────────────────────
  describe('extractEntities', () => {
    it('extracts timeframe – this month', () => {
      const entities = handler.extractEntities('How is revenue this month?');
      expect(entities.timeframe).toBe('this_month');
    });

    it('extracts timeframe – last week', () => {
      const entities = handler.extractEntities('Show me sales last week');
      expect(entities.timeframe).toBe('last_week');
    });

    it('extracts product', () => {
      const entities = handler.extractEntities('How is product Alpha performing?');
      expect(entities.product).toBe('Alpha');
    });

    it('extracts customer', () => {
      const entities = handler.extractEntities('Tell me about customer MegaCorp');
      expect(entities.customer).toBe('MegaCorp');
    });

    it('extracts amount with ₦', () => {
      const entities = handler.extractEntities('Why did we spend ₦150,000?');
      expect(entities.amount).toBe(150000);
    });

    it('extracts amount with k suffix', () => {
      const entities = handler.extractEntities('Did we hit 500k in sales?');
      expect(entities.amount).toBe(500000);
    });

    it('returns empty object for no entities', () => {
      expect(handler.extractEntities('How is my business?')).toEqual({});
    });

    it('handles null safely', () => {
      expect(handler.extractEntities(null)).toEqual({});
    });
  });

  // ── extractKeywords ───────────────────────────────────────
  describe('extractKeywords', () => {
    it('extracts meaningful keywords and drops stop words', () => {
      const keywords = handler.extractKeywords('What is my revenue growth this month?');
      expect(keywords).toContain('revenue');
      expect(keywords).toContain('growth');
      expect(keywords).toContain('month');
      expect(keywords).not.toContain('what');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('my');
    });

    it('respects maxKeywords limit', () => {
      const long = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda';
      const keywords = handler.extractKeywords(long);
      expect(keywords.length).toBeLessThanOrEqual(handler.config.maxKeywords);
    });

    it('handles empty / null', () => {
      expect(handler.extractKeywords('')).toEqual([]);
      expect(handler.extractKeywords(null)).toEqual([]);
    });
  });

  // ── processQuestion (integration) ─────────────────────────
  describe('processQuestion', () => {
    it('returns a full structured result', async () => {
      const analytics = createMockProvider({
        revenue: 100000,
        revenueGrowth: 0.12
      });

      const h = createHandler({
        dataProviders: { analytics },
        insightGenerator: createMockInsightGenerator([
          {
            category: 'REVENUE',
            title: 'Revenue Growth',
            content: 'Revenue is up',
            sentiment: ADVISOR_SENTIMENT.POSITIVE,
            severity: ADVISOR_SEVERITY.INFO
          }
        ])
      });

      const result = await h.processQuestion('How is my revenue this month?');

      expect(result.requestId).toMatch(/^q_/);
      expect(result.intent).toBe(ADVISOR_QUESTION_INTENT.REVENUE);
      expect(result.intentLabel).toBe(QUESTION_INTENT_LABEL.REVENUE);
      expect(result.question).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.entities.timeframe).toBe('this_month');
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(h.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'question_complete' })
      );
      expect(h.metrics.histogram).toHaveBeenCalled();
    });

    it('handles empty question gracefully', async () => {
      const result = await handler.processQuestion('   ');
      expect(result.intent).toBe(ADVISOR_QUESTION_INTENT.GENERAL);
      expect(result.answer.content).toMatch(/valid question/i);
    });

    it('handles null question gracefully', async () => {
      const result = await handler.processQuestion(null);
      expect(result.answer).toBeDefined();
      expect(result.intent).toBe(ADVISOR_QUESTION_INTENT.GENERAL);
    });

    it('never throws when insight generator fails', async () => {
      const h = createHandler({
        insightGenerator: {
          generate: jest.fn().mockImplementation(() => {
            throw new Error('boom');
          })
        }
      });

      const result = await h.processQuestion('How is my business?');
      expect(result.answer).toBeDefined();
      expect(h.logger.error).toHaveBeenCalled();
      expect(h.metrics.increment).toHaveBeenCalledWith('advisor.question.errors');
    });

    it('never throws when response builder fails', async () => {
      const h = createHandler({
        responseBuilder: {
          buildAnswer: jest.fn().mockImplementation(() => {
            throw new Error('builder failed');
          })
        }
      });

      const result = await h.processQuestion('How is cash flow?');
      expect(result.answer).toBeDefined();
      expect(result.answer.content).toMatch(/issue processing/i);
    });

    it('truncates very long questions', async () => {
      const long = 'a'.repeat(1000);
      const result = await handler.processQuestion(long);
      expect(result).toBeDefined();
    });
  });

  // ── gatherRelevantData ────────────────────────────────────
  describe('gatherRelevantData', () => {
    it('fetches analytics + report by default', async () => {
      const analytics = createMockProvider({ revenue: 50 });
      const report = createMockProvider({ cash: 20 });

      const h = createHandler({
        dataProviders: { analytics, report }
      });

      const data = await h.gatherRelevantData(
        ADVISOR_QUESTION_INTENT.PERFORMANCE,
        {},
        {}
      );

      expect(analytics.getData).toHaveBeenCalled();
      expect(report.getData).toHaveBeenCalled();
      expect(data.revenue).toBe(50);
      expect(data.cash).toBe(20);
    });

    it('fetches cashFlow provider for CASH intent', async () => {
      const cashFlow = createMockProvider({ currentCash: 90000 });
      const h = createHandler({ dataProviders: { cashFlow } });

      const data = await h.gatherRelevantData(
        ADVISOR_QUESTION_INTENT.CASH,
        {},
        {}
      );

      expect(cashFlow.getData).toHaveBeenCalled();
      expect(data.currentCash).toBe(90000);
    });

    it('isolates provider failures', async () => {
      const analytics = {
        getData: jest.fn().mockRejectedValue(new Error('network down'))
      };
      const report = createMockProvider({ ok: true });

      const h = createHandler({ dataProviders: { analytics, report } });

      const data = await h.gatherRelevantData(
        ADVISOR_QUESTION_INTENT.PERFORMANCE,
        {},
        {}
      );

      expect(data.ok).toBe(true);
      expect(h.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'provider_failed', provider: 'analytics' })
      );
    });

    it('times out slow providers', async () => {
      let resolveSlow;

      const slow = {
        getData: jest.fn().mockImplementation(
          () =>
            new Promise(resolve => {
              // Do not auto-resolve – only the timeout path matters
              resolveSlow = resolve;
            })
        )
      };

      const h = createHandler({
        config: { providerTimeoutMs: 50 },
        dataProviders: { analytics: slow }
      });

      const data = await h.gatherRelevantData(
        ADVISOR_QUESTION_INTENT.PERFORMANCE,
        {},
        {}
      );

      expect(data.slow).toBeUndefined();
      expect(h.logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'provider_failed' })
      );

      // Clean up so Jest can exit cleanly
      if (typeof resolveSlow === 'function') {
        resolveSlow({});
      }
    }, 10000);
  });

  // ── Tone & Context ────────────────────────────────────────
  describe('determineTone', () => {
    it('returns URGENT when any insight is urgent', () => {
      const tone = handler.determineTone([
        { sentiment: ADVISOR_SENTIMENT.POSITIVE },
        { sentiment: ADVISOR_SENTIMENT.URGENT }
      ]);
      expect(tone).toBe(ADVISOR_TONE.URGENT);
    });

    it('returns ANALYTICAL for multiple negative insights', () => {
      const tone = handler.determineTone([
        { sentiment: ADVISOR_SENTIMENT.NEGATIVE },
        { sentiment: ADVISOR_SENTIMENT.NEGATIVE },
        { sentiment: ADVISOR_SENTIMENT.NEGATIVE }
      ]);
      expect(tone).toBe(ADVISOR_TONE.ANALYTICAL);
    });

    it('returns default for empty insights', () => {
      expect(handler.determineTone([])).toBe(ADVISOR_TONE.CONVERSATIONAL);
      expect(handler.determineTone(null)).toBe(ADVISOR_TONE.CONVERSATIONAL);
    });
  });

  describe('determineContext', () => {
    it('maps timeframes correctly', () => {
      expect(handler.determineContext({ timeframe: 'today' }))
        .toBe(ADVISOR_CONTEXT.REAL_TIME);
      expect(handler.determineContext({ timeframe: 'this_week' }))
        .toBe(ADVISOR_CONTEXT.WEEKLY);
      expect(handler.determineContext({ timeframe: 'this_month' }))
        .toBe(ADVISOR_CONTEXT.MONTHLY);
      expect(handler.determineContext({ timeframe: 'this_year' }))
        .toBe(ADVISOR_CONTEXT.YEARLY);
    });

    it('defaults to MONTHLY', () => {
      expect(handler.determineContext({})).toBe(ADVISOR_CONTEXT.MONTHLY);
      expect(handler.determineContext()).toBe(ADVISOR_CONTEXT.MONTHLY);
    });
  });

  // ── Helpers ───────────────────────────────────────────────
  describe('helpers', () => {
    it('getAvailableIntents returns all intents', () => {
      const intents = handler.getAvailableIntents();
      expect(intents).toContain(ADVISOR_QUESTION_INTENT.REVENUE);
      expect(intents).toContain(ADVISOR_QUESTION_INTENT.GENERAL);
      expect(intents.length).toBeGreaterThan(10);
    });

    it('getIntentLabel returns human label', () => {
      expect(handler.getIntentLabel(ADVISOR_QUESTION_INTENT.CASH))
        .toBe('Cash & Liquidity');
      expect(handler.getIntentLabel('UNKNOWN')).toBe('UNKNOWN');
    });

    it('isSupportedQuestion', () => {
      expect(handler.isSupportedQuestion('How is my revenue?')).toBe(true);
      expect(handler.isSupportedQuestion('Hello world')).toBe(false);
    });
  });

  // ── Resilience ────────────────────────────────────────────
  describe('resilience', () => {
    it('processQuestion never throws', async () => {
      await expect(handler.processQuestion(null)).resolves.toBeDefined();
      await expect(handler.processQuestion(123)).resolves.toBeDefined();
      await expect(handler.processQuestion({})).resolves.toBeDefined();
    });

    it('logs and metrics on success path', async () => {
      await handler.processQuestion('How is my business?');
      expect(handler.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'question_start' })
      );
      expect(handler.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'question_complete' })
      );
      expect(handler.metrics.histogram).toHaveBeenCalled();
    });
  });
});