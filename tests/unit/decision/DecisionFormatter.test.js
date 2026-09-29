'use strict';

const DecisionFormatter = require('../../../src/application/services/decision/DecisionFormatter');
const Decision = require('../../../src/domain/entities/Decision');

/** Helper – always produces a valid Decision against the current entity contract */
function makeDecision(overrides = {}) {
  return new Decision({
    type: 'CASH_FLOW_WARNING',
    category: 'CASH_FLOW',
    title: overrides.title || 'Test Decision',
    summary: overrides.summary || 'Test summary',
    recommendation: overrides.recommendation || 'Take action',
    severity: 'WARNING',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    relatedEntity: 'BUSINESS',
    relatedEntityId: 'global',
    evidence: {},
    impact: { financialImpact: 0 },
    ...overrides,
  });
}

describe('DecisionFormatter', () => {
  let formatter;
  let sampleDecision;

  beforeEach(() => {
    formatter = new DecisionFormatter(); // default ₦ / en-NG

    sampleDecision = makeDecision({
      id: 'dec_test_123',
      type: 'CASH_FLOW_WARNING',
      category: 'CASH_FLOW',
      title: 'Projected Cash Pressure',
      summary: 'Cash position is declining and may reach critical levels.',
      priority: 'CRITICAL',
      severity: 'WARNING',
      confidence: 85,
      trigger: { ruleId: 'CASH_FLOW_WARNING' },
      evidence: {
        currentCash: 200000,
        projectedCash: 150000,
        minimumCashThreshold: 500000,
        shortfall: 350000,
      },
      currentState: { cash: 200000 },
      expectedImpact: 'Improved liquidity',
      recommendation: 'Review expenses and accelerate collections',
      alternatives: ['Bridge financing', 'Delay capex'],
      risks: ['Cash crisis'],
      assumptions: ['Current spend continues'],
      timeframe: 'SHORT_TERM',
      relatedEntity: 'BUSINESS',
      relatedEntityId: '1',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01'),
      // Must be in the future relative to test runtime so isActionable() === true
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      impactResult: {
        type: 'WORKING_CAPITAL',
        recommendation: 'Working capital optimization',
        profitImpact: 350000,
        totalCashFreed: 350000,
        confidence: 85,
      },
    });
  });

  describe('constructor', () => {
    it('should accept custom currency and locale', () => {
      const custom = new DecisionFormatter({
        currencySymbol: '$',
        locale: 'en-US',
      });
      expect(custom.formatCurrency(1500)).toBe('$1,500');
    });
  });

  describe('format', () => {
    it('should format decision with default (detailed) options', () => {
      const result = formatter.format(sampleDecision);

      expect(result).not.toBeNull();
      expect(result.id).toBe('dec_test_123');
      expect(result.title).toBe('Projected Cash Pressure');
      expect(result.priorityEmoji).toBe('🔴');
      expect(result.priorityLabel).toBe('🔴 Critical');
      expect(result.severityEmoji).toBe('⚠️');
      expect(result.confidence).toBe(85);
      expect(result.confidenceLevel).toBe('High');
      expect(result.isActionable).toBe(true);
    });

    it('should format as short', () => {
      const result = formatter.format(sampleDecision, { format: 'short' });

      expect(result.id).toBe('dec_test_123');
      expect(result.title).toBe('Projected Cash Pressure');
      expect(result.priorityEmoji).toBe('🔴');
      expect(result.recommendation).toBe(
        'Review expenses and accelerate collections'
      );
      expect(result.isActionable).toBe(true);
      expect(result.evidence).toBeUndefined();
      expect(result.impact).toBeUndefined();
    });

    it('should format as detailed with evidence formatting', () => {
      const result = formatter.format(sampleDecision, { format: 'detailed' });

      expect(result.id).toBe('dec_test_123');
      expect(result.evidence).toBeDefined();
      expect(result.evidence.currentCash).toBe('₦200,000');
      expect(result.evidence.shortfall).toBe('₦350,000');
      expect(result.alternatives).toEqual(['Bridge financing', 'Delay capex']);
      expect(result.risks).toEqual(['Cash crisis']);
      expect(result.assumptions).toEqual(['Current spend continues']);
    });

    it('should format as full', () => {
      const result = formatter.format(sampleDecision, { format: 'full' });

      expect(result.id).toBe('dec_test_123');
      expect(result.evidence).toBeDefined();
      expect(result.currentState).toBeDefined();
      expect(result.alternatives).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.assumptions).toBeDefined();
      expect(result.trigger).toBeDefined();
      expect(result.impact).toBeDefined();
      expect(result.impact.metrics.profit).toBe('₦350,000');
      expect(result.impact.metrics.totalCashFreed).toBe('₦350,000');
    });

    it('should exclude evidence when requested', () => {
      const result = formatter.format(sampleDecision, {
        format: 'detailed',
        includeEvidence: false,
      });
      expect(result.evidence).toBeUndefined();
    });

    it('should include impact when available', () => {
      const result = formatter.format(sampleDecision, {
        format: 'detailed',
        includeImpact: true,
      });
      expect(result.impact).toBeDefined();
      expect(result.impact.metrics.profit).toBe('₦350,000');
      expect(result.impact.metrics.totalCashFreed).toBe('₦350,000');
    });

    it('should handle decision without impact', () => {
      const decision = makeDecision({
        type: 'LOW_STOCK',
        category: 'INVENTORY',
        title: 'Low stock',
        recommendation: 'Reorder',
        // no impactResult
      });
      const result = formatter.format(decision, { format: 'detailed' });
      expect(result.impact).toBeUndefined();
    });

    it('should return null for invalid input', () => {
      expect(formatter.format(null)).toBeNull();
      expect(formatter.format(undefined)).toBeNull();
      expect(formatter.format(42)).toBeNull();
    });
  });

  describe('formatMany', () => {
    it('should format multiple decisions and produce summary', () => {
      const decisions = [
        sampleDecision,
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Low Stock Alert',
          priority: 'HIGH',
          recommendation: 'Order more stock',
        }),
      ];

      const result = formatter.formatMany(decisions, { format: 'short' });

      expect(result.count).toBe(2);
      expect(result.decisions).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.byPriority.CRITICAL).toBe(1);
      expect(result.summary.byPriority.HIGH).toBe(1);
    });

    it('should handle empty list', () => {
      const result = formatter.formatMany([]);
      expect(result.count).toBe(0);
      expect(result.decisions).toEqual([]);
      expect(result.summary.total).toBe(0);
    });
  });

  describe('formatForWeb', () => {
    it('should format decisions for Web UI with limit', () => {
      const decisions = [
        sampleDecision,
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Low Stock Alert',
          priority: 'HIGH',
          recommendation: 'Order more stock',
        }),
        makeDecision({
          type: 'MARGIN_COMPRESSION',
          category: 'PRICING',
          title: 'Margin Decline',
          priority: 'MEDIUM',
          recommendation: 'Review pricing',
        }),
      ];

      const result = formatter.formatForWeb(decisions, { limit: 2 });

      expect(result.summary.total).toBe(3);
      expect(result.summary.critical).toBe(1);
      expect(result.summary.high).toBe(1);
      expect(result.decisions).toHaveLength(2);
      expect(result.groups.critical).toHaveLength(1);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.displayed).toBe(2);
      expect(result.pagination.limit).toBe(2);
    });

    it('should include all decisions when requested', () => {
      const decisions = [
        sampleDecision,
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Low Stock Alert',
          priority: 'HIGH',
          recommendation: 'Order more stock',
        }),
      ];

      const result = formatter.formatForWeb(decisions, {
        limit: 1,
        includeAll: true,
      });

      expect(result.decisions).toHaveLength(2);
      expect(result.pagination.displayed).toBe(2);
    });
  });

  describe('formatForAPI', () => {
    it('should wrap engine result', () => {
      const engineResult = {
        generatedAt: new Date(),
        summary: { total: 1 },
        decisions: [formatter.format(sampleDecision, { format: 'short' })],
        fullDecisions: [sampleDecision],
        metrics: { total: 1 },
        context: { businessId: '1' },
      };

      const api = formatter.formatForAPI(engineResult, { includeFull: true });

      expect(api.status).toBe('success');
      expect(api.summary.total).toBe(1);
      expect(api.decisions).toHaveLength(1);
      expect(api.fullDecisions).toHaveLength(1);
      expect(api.metrics.total).toBe(1);
      expect(api.context.businessId).toBe('1');
    });

    it('should handle invalid result', () => {
      const api = formatter.formatForAPI(null);
      expect(api.status).toBe('error');
    });
  });

  describe('formatForExecutive', () => {
    it('should produce executive summary structure', () => {
      const decisions = [
        sampleDecision,
        makeDecision({
          type: 'LOW_STOCK',
          category: 'INVENTORY',
          title: 'Low Stock',
          priority: 'HIGH',
          recommendation: 'Reorder',
        }),
      ];

      const result = formatter.formatForExecutive(decisions, {
        maxTopDecisions: 2,
      });

      expect(result.executiveSummary.totalDecisions).toBe(2);
      expect(result.executiveSummary.criticalIssues).toBe(1);
      expect(result.topDecisions).toHaveLength(2);
      expect(result.criticalDecisions).toHaveLength(1);
      expect(result.byCategory.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.actionPlan).toBeDefined();
    });
  });

  describe('formatting helpers', () => {
    it('should format currency with default symbol', () => {
      expect(formatter.formatCurrency(1234567)).toBe('₦1,234,567');
      expect(formatter.formatCurrency(null)).toBeNull();
    });

    it('should format percentage', () => {
      // Accepts both ratio and already-percent styles
      const pct = formatter.formatPercentage(0.255);
      expect(pct).toMatch(/%/);
    });

    it('should map confidence levels correctly', () => {
      expect(formatter.getConfidenceLevel(95)).toBe('Very High');
      expect(formatter.getConfidenceLevel(80)).toBe('High');
      expect(formatter.getConfidenceLevel(65)).toBe('Moderate');
      expect(formatter.getConfidenceLevel(45)).toBe('Low');
      expect(formatter.getConfidenceLevel(10)).toBe('Very Low');
    });
  });

  describe('formatForHTML / formatForText', () => {
    it('should produce non-empty HTML', () => {
      const html = formatter.formatForHTML(sampleDecision);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(50);
      expect(html).toContain('Projected Cash Pressure');
      expect(html).toContain('Review expenses');
    });

    it('should produce non-empty plain text', () => {
      const text = formatter.formatForText(sampleDecision);
      expect(typeof text).toBe('string');
      expect(text).toContain('Projected Cash Pressure');
      expect(text).toContain('Recommendation:');
    });

    it('should return empty string for null decision', () => {
      expect(formatter.formatForHTML(null)).toBe('');
      expect(formatter.formatForText(null)).toBe('');
    });
  });
});