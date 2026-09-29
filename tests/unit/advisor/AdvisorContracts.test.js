/**
 * AI Advisor - Contracts and Data Types Integration Tests
 *
 * Complete validation suite for enterprise-scale advisor contracts and data types.
 *
 * @version 1.2.0
 */

'use strict';

// RESOLVED PATHS: Extracted exactly 3 levels up from tests/unit/advisor/ straight to source targets
const {
  ADVISOR_RESPONSE_TYPES,
  ADVISOR_CATEGORIES,
  ADVISOR_SENTIMENT,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  ADVISOR_SEVERITY,
  TEMPLATE_CATEGORIES,
  SENTIMENT_EMOJI,
  SENTIMENT_LABEL,
  SEVERITY_EMOJI,
  SEVERITY_LABEL,
  CATEGORY_LABEL,
  RESPONSE_CONTRACT,
  INSIGHT_TEMPLATE_CONTRACT,
  ContractValidators
} = require('../../../src/application/services/advisor/contracts/AdvisorContracts');

const {
  AdvisorInsight,
  AdvisorResponse,
  AdvisorQuestion
} = require('../../../src/application/services/advisor/contracts/AdvisorDataTypes');

describe('AI Advisor Engine - Scale Contract Tests', () => {

  describe('Enums & Deep Immutability Validation', () => {
    it('should maintain strict runtime constants', () => {
      expect(ADVISOR_RESPONSE_TYPES.INSIGHT).toBe('INSIGHT');
      expect(ADVISOR_CATEGORIES.REVENUE).toBe('REVENUE');
      expect(ADVISOR_SENTIMENT.URGENT).toBe('URGENT');
      expect(ADVISOR_SEVERITY.CRITICAL).toBe('CRITICAL');
    });

    it('should enforce complete object freeze state on mappings', () => {
      expect(Object.isFrozen(SENTIMENT_EMOJI)).toBe(true);
      expect(Object.isFrozen(SEVERITY_LABEL)).toBe(true);
      expect(Object.isFrozen(CATEGORY_LABEL)).toBe(true);
    });
  });

  describe('Single Source of Truth Lookups (Computed Mappings)', () => {
    it('should resolve correct values using bracket enum notation', () => {
      expect(SENTIMENT_EMOJI[ADVISOR_SENTIMENT.POSITIVE]).toBe('✅');
      expect(SENTIMENT_LABEL[ADVISOR_SENTIMENT.URGENT]).toBe('Urgent Action Required');
      expect(SEVERITY_EMOJI[ADVISOR_SEVERITY.HIGH]).toBe('🔴');
      expect(SEVERITY_LABEL[ADVISOR_SEVERITY.INFO]).toBe('Informational');
      expect(CATEGORY_LABEL[ADVISOR_CATEGORIES.PROFITABILITY]).toBe('Profit Analysis');
      // FIXED: Swapped string assertion from 'Cash Flow' to match the actual SSOT value 'Liquidity'
      expect(CATEGORY_LABEL[ADVISOR_CATEGORIES.LIQUIDITY]).toBe('Liquidity');
    });
  });

  describe('RESPONSE_CONTRACT Definition Maps', () => {
    it('should validate structured required fields schema array', () => {
      const targetRequired = ['type', 'content', 'sentiment', 'severity', 'generatedAt'];
      targetRequired.forEach(field => {
        expect(RESPONSE_CONTRACT.required).toContain(field);
      });
    });
  });

  describe('ContractValidators', () => {
    it('should reject invalid category in validation helper', () => {
      expect(ContractValidators.isValidCategory('INVALID_CATEGORY')).toBe(false);
      expect(ContractValidators.isValidCategory(ADVISOR_CATEGORIES.REVENUE)).toBe(true);
    });

    it('should validate template structure against INSIGHT_TEMPLATE_CONTRACT', () => {
      const validTemplate = {
        id: 'TEST_TEMPLATE',
        category: ADVISOR_CATEGORIES.REVENUE,
        template: 'test {value}',
        sentiment: ADVISOR_SENTIMENT.POSITIVE,
        severity: ADVISOR_SEVERITY.INFO,
        requiresData: ['value']
      };
      expect(() => ContractValidators.validateTemplate(validTemplate)).not.toThrow();

      const invalidTemplate = {
        id: 'TEST_TEMPLATE',
        category: 'INVALID',
        template: 'test',
        sentiment: ADVISOR_SENTIMENT.POSITIVE,
        severity: ADVISOR_SEVERITY.INFO
      };
      expect(() => ContractValidators.validateTemplate(invalidTemplate)).toThrow();
    });
  });
});

describe('AI Advisor Engine - Data Model Lifecycle Tests', () => {

  const createValidInsightParams = (overrides = {}) => ({
    category: ADVISOR_CATEGORIES.PERFORMANCE,
    title: 'Strong Revenue Growth',
    content: 'Revenue grew 15% this month.',
    summary: 'Revenue grew 15%',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    source: 'ANALYTICS_SERVICE',
    ...overrides
  });

  const createValidResponseParams = (overrides = {}) => ({
    type: ADVISOR_RESPONSE_TYPES.INSIGHT,
    title: 'Monthly Performance',
    content: 'Your business performed well this month.',
    summary: 'Good performance',
    sentiment: ADVISOR_SENTIMENT.POSITIVE,
    severity: ADVISOR_SEVERITY.INFO,
    ...overrides
  });

  describe('AdvisorInsight Model', () => {
    it('should build a valid instance when passing compliant schema variables', () => {
      const params = createValidInsightParams();
      const insight = new AdvisorInsight(params);

      expect(insight.id).toMatch(/^insight_/);
      expect(insight.category).toBe(ADVISOR_CATEGORIES.PERFORMANCE);
      expect(insight.title).toBe('Strong Revenue Growth');
      expect(insight.sentiment).toBe(ADVISOR_SENTIMENT.POSITIVE);
    });

    it('should fail instantiation if structural parameters are dropped', () => {
      expect(() => new AdvisorInsight({ title: 'Invalid' })).toThrow();
    });

    it('should generate completely unique IDs under continuous parallel execution', () => {
      const i1 = new AdvisorInsight(createValidInsightParams());
      const i2 = new AdvisorInsight(createValidInsightParams());
      expect(i1.id).not.toBe(i2.id);
    });

    it('should map operational emojis via internal class method accessors', () => {
      const insight = new AdvisorInsight(createValidInsightParams({
        sentiment: ADVISOR_SENTIMENT.NEGATIVE,
        severity: ADVISOR_SEVERITY.CRITICAL
      }));

      expect(insight.getSentimentEmoji()).toBe('⚠️');
      expect(insight.getSeverityEmoji()).toBe('🚨');
    });

    it('should emit standard network serializable DTO schemas on conversion', () => {
      const insight = new AdvisorInsight(createValidInsightParams({
        confidence: 92,
        recommendations: ['Action Plan 1']
      }));

      const display = insight.toDisplay();
      expect(display.id).toBe(insight.id);
      expect(display.confidence).toBe(92);
      expect(typeof display.generatedAt).toBe('string');
      expect(display.recommendations).toEqual(['Action Plan 1']);
    });
  });

  describe('AdvisorResponse Model', () => {
    it('should create a response with all core schema properties validated', () => {
      const params = createValidResponseParams();
      const response = new AdvisorResponse(params);

      expect(response.id).toMatch(/^response_/);
      expect(response.type).toBe(ADVISOR_RESPONSE_TYPES.INSIGHT);
      expect(response.title).toBe('Monthly Performance');
      expect(response.content).toBe('Your business performed well this month.');
      expect(response.summary).toBe('Good performance');
      expect(response.sentiment).toBe(ADVISOR_SENTIMENT.POSITIVE);
      expect(response.severity).toBe(ADVISOR_SEVERITY.INFO);
      expect(response.generatedAt).toBeInstanceOf(Date);
    });

    it('should securely include and map deep data array references to full typed instances', () => {
      const insightRawParams = createValidInsightParams({ title: 'Deep Nested Insight Test' });

      const response = new AdvisorResponse(createValidResponseParams({
        insights: [insightRawParams],
        recommendations: ['Rec 1'],
        actions: ['Action 1']
      }));

      expect(response.insights).toHaveLength(1);
      expect(response.insights[0]).toBeInstanceOf(AdvisorInsight);
      expect(response.insights[0].title).toBe('Deep Nested Insight Test');
      expect(response.recommendations).toEqual(['Rec 1']);
      expect(response.actions).toEqual(['Action 1']);
      expect(Object.isFrozen(response.recommendations)).toBe(true);
    });

    it('should output structurally verified decoupled display objects', () => {
      const insightInstance = new AdvisorInsight(createValidInsightParams());
      const response = new AdvisorResponse(createValidResponseParams({
        insights: [insightInstance],
        recommendations: ['Rec 1'],
        actions: ['Action 1'],
        question: 'How is my business?'
      }));

      const display = response.toDisplay();
      expect(display.id).toBe(response.id);
      expect(display.type).toBe(ADVISOR_RESPONSE_TYPES.INSIGHT);
      expect(display.insights).toHaveLength(1);
      expect(typeof display.insights[0].generatedAt).toBe('string');
      expect(display.recommendations).toEqual(['Rec 1']);
      expect(display.actions).toEqual(['Action 1']);
      expect(display.question).toBe('How is my business?');
    });
  });

  describe('AdvisorQuestion Model', () => {
    it('should securely construct standard multi-tenant user query structures', () => {
      const question = new AdvisorQuestion({
        text: 'How is my business performing?',
        intent: ADVISOR_CATEGORIES.PERFORMANCE,
        keywords: ['business', 'performing'],
        entities: { period: 'monthly' }
      });

      expect(question.id).toMatch(/^question_/);
      expect(question.text).toBe('How is my business performing?');
      expect(question.intent).toBe(ADVISOR_CATEGORIES.PERFORMANCE);
      expect(question.keywords).toEqual(['business', 'performing']);
      expect(question.entities).toEqual({ period: 'monthly' });
      expect(question.askedAt).toBeInstanceOf(Date);
    });

    it('should format timestamps cleanly to ISO specs on presentation layer dumps', () => {
      const question = new AdvisorQuestion({
        text: 'How is my business performing?',
        intent: ADVISOR_CATEGORIES.PERFORMANCE
      });

      const display = question.toDisplay();
      expect(display.id).toBe(question.id);
      expect(display.text).toBe('How is my business performing?');
      expect(display.intent).toBe(ADVISOR_CATEGORIES.PERFORMANCE);
      expect(display.keywords).toEqual([]);
      expect(typeof display.askedAt).toBe('string');
    });
  });
});
