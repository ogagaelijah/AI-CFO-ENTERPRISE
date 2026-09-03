'use strict';

/**
 * Decision Rule Engine
 * Path: src/application/services/decision/DecisionRuleEngine.js
 * @version 1.0.1-prod
 */

const Decision = require('../../../domain/entities/Decision');
const {
  DECISION_SEVERITY,
  DECISION_TIMEFRAME,
  DECISION_ENTITY,
  DECISION_STATUS,
} = require('./contracts/DecisionContracts');

const safeObj = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

class DecisionRuleEngine {
  constructor(options = {}) {
    this.confidenceService = options.confidenceService || null;
    this.priorityService = options.priorityService || null;
    this._rules = Object.freeze([]);
  }

  registerRules(rules) {
    let list = [];
    if (Array.isArray(rules)) {
      list = rules;
    } else if (rules && typeof rules === 'object') {
      list = Object.values(rules).flatMap((v) => (Array.isArray(v) ? v : []));
    }
    this._rules = Object.freeze(
      list.filter((r) => r && typeof r.evaluate === 'function')
    );
    return this._rules.length;
  }

  getRules() {
    return this._rules;
  }

  clearRules() {
    this._rules = Object.freeze([]);
  }

  async evaluate(data = {}, context = {}) {
    const payload = safeObj(data);
    const ctx = safeObj(context);
    if (this._rules.length === 0) return [];

    const batches = await Promise.all(
      this._rules.map((rule) => this._evaluateOne(rule, payload, ctx))
    );
    return batches.flat().filter(Boolean);
  }

  async _evaluateOne(rule, data, context) {
    try {
      const input = { ...data, ...context };
      const raw = await rule.evaluate(input);
      if (raw == null) return [];

      // Support:
      //  - single hit: { triggered: true, ... }
      //  - array of hits: [{ triggered: true }, ...]
      //  - triggered: false / empty → no decisions
      let hits;
      if (Array.isArray(raw)) {
        hits = raw;
      } else if (typeof raw === 'object') {
        if (raw.triggered === false) return [];
        // Single object: treat as hit unless explicitly not triggered
        hits = [raw];
      } else {
        return [];
      }

      const out = [];
      for (const hit of hits) {
        if (!hit || typeof hit !== 'object') continue;
        if (hit.triggered === false) continue;
        // Require explicit triggered:true when the property exists;
        // if omitted on array elements, still accept (legacy rules).
        if (
          Object.prototype.hasOwnProperty.call(hit, 'triggered') &&
          hit.triggered !== true
        ) {
          continue;
        }
        const d = this._toDecision(rule, hit, context);
        if (d) out.push(d);
      }
      return out;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          `[DecisionRuleEngine] ${rule.id || rule.type}:`,
          err && err.message
        );
      }
      return [];
    }
  }

  _toDecision(rule, hit, context) {
    const evidence = safeObj(hit.evidence);
    const impact = safeObj(hit.impact);
    const timeframe =
      hit.urgency || hit.timeframe || DECISION_TIMEFRAME.MEDIUM_TERM;
    const relatedEntity = hit.relatedEntity || DECISION_ENTITY.BUSINESS;
    const relatedEntityId =
      hit.relatedEntityId != null
        ? String(hit.relatedEntityId)
        : relatedEntity === DECISION_ENTITY.BUSINESS
          ? 'global'
          : 'unknown';

    const recommendation =
      typeof rule.generateRecommendation === 'function'
        ? rule.generateRecommendation(evidence)
        : hit.recommendation || rule.defaultRecommendation || 'Review and act';

    const title =
      hit.title || rule.defaultTitle || rule.name || rule.type || 'Decision';

    try {
      return new Decision({
        type: rule.type || rule.id,
        category: rule.category,
        title: String(title).trim() || 'Decision',
        summary:
          hit.summary ||
          rule.defaultSummary ||
          impact.description ||
          '',
        recommendation: String(recommendation).trim() || 'Review and act',
        severity: hit.severity || rule.severity || DECISION_SEVERITY.INFO,
        timeframe,
        status: DECISION_STATUS.ACTIVE,
        evidence,
        impact: {
          financialImpact:
            impact.financialImpact != null ? impact.financialImpact : 0,
          description: impact.description || '',
        },
        currentState: safeObj(hit.currentState),
        expectedImpact:
          hit.expectedImpact != null ? String(hit.expectedImpact) : '',
        risks: Array.isArray(hit.risks) ? hit.risks : [],
        relatedEntity,
        relatedEntityId,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          '[DecisionRuleEngine] Decision build failed:',
          err.message,
          'rule=',
          rule.type || rule.id
        );
      }
      return null;
    }
  }
}

module.exports = DecisionRuleEngine;