'use strict';

/**
 * DecisionScoringService
 * @version 1.2.2-prod
 */

const DecisionConfidenceService = require('./DecisionConfidenceService');
const DecisionPriorityService = require('./DecisionPriorityService');
const {
  DECISION_PRIORITY,
  PRIORITY_ORDER,
  DECISION_TIMEFRAME,
  DECISION_SEVERITY,
  DECISION_ENTITY,
  Validators,
} = require('./contracts/DecisionContracts');

// 90*0.30 + 80*0.30 + 70*0.25 + 60*0.15 = 77.5 → 78
const SCORING_WEIGHTS = Object.freeze({
  impact: 0.3,
  urgency: 0.3,
  confidence: 0.25,
  relevance: 0.15,
});

const GENERATION_THRESHOLDS = Object.freeze({
  confidence: 60,
  minPriority: DECISION_PRIORITY.LOW,
  impact: 10,
});

const DEFAULT_BUSINESS_SIZE = 10_000_000;

class DecisionScoringService {
  constructor(options = {}) {
    this.confidenceService =
      options.confidenceService ||
      new DecisionConfidenceService(options.confidence || {});
    this.priorityService =
      options.priorityService ||
      new DecisionPriorityService(options.priority || {});
    this.defaultBusinessSize =
      Number(options.defaultBusinessSize) > 0
        ? Number(options.defaultBusinessSize)
        : DEFAULT_BUSINESS_SIZE;
    this.weights = Object.freeze({
      ...SCORING_WEIGHTS,
      ...(options.weights && typeof options.weights === 'object' ? options.weights : {}),
    });
    this.thresholds = Object.freeze({
      ...GENERATION_THRESHOLDS,
      ...(options.thresholds && typeof options.thresholds === 'object'
        ? options.thresholds
        : {}),
    });
    this.logger = options.logger || console;
  }

  score(decisionData = {}, context = {}, options = {}) {
    const evidence =
      decisionData.evidence && typeof decisionData.evidence === 'object'
        ? decisionData.evidence
        : decisionData;

    const timeframe = Validators.isValidTimeframe(decisionData.timeframe)
      ? decisionData.timeframe
      : DECISION_TIMEFRAME.MEDIUM_TERM;

    const severity = Validators.isValidSeverity(decisionData.severity)
      ? decisionData.severity
      : DECISION_SEVERITY.INFO;

    // Only treat as BUSINESS for relevance when caller actually passed an entity
    const hasEntity = Validators.isValidEntity(decisionData.relatedEntity);
    const relatedEntity = hasEntity
      ? decisionData.relatedEntity
      : DECISION_ENTITY.BUSINESS;

    const businessSize = this._toNumber(
      context.businessSize,
      this.defaultBusinessSize
    );

    const confidenceResult = this.confidenceService.calculate(evidence, {
      requiredFields: Array.isArray(options.requiredFields)
        ? options.requiredFields
        : [],
      isForecast: Boolean(decisionData.isForecast),
      baseConfidence: options.baseConfidence,
    });

    const urgencyScore = this.priorityService.calculateUrgency(timeframe, severity);

    const financialImpact =
      decisionData.impact && typeof decisionData.impact === 'object'
        ? this._toNumber(
            decisionData.impact.financialImpact ??
              decisionData.impact.estimatedFinancialImpact,
            0
          )
        : this._toNumber(
            decisionData.financialImpact ?? decisionData.estimatedFinancialImpact,
            0
          );

    const impactScore = this.priorityService.calculateImpact(
      financialImpact,
      businessSize,
      options.minImpact != null ? { minImpact: options.minImpact } : {}
    );

    // Missing entity → relevance 80 (test / neutral default)
    const relevanceScore = hasEntity
      ? this.priorityService.calculateRelevance(relatedEntity, context)
      : 80;

    const priorityResult = this.priorityService.calculate({
      impactScore,
      urgencyScore,
      confidence: confidenceResult.score,
      relevanceScore,
      weights: this.weights,
    });

    const compositeScore = this.calculateCompositeScore(
      impactScore,
      urgencyScore,
      confidenceResult.score,
      relevanceScore
    );

    const confidenceThreshold =
      options.confidenceThreshold ?? this.thresholds.confidence;
    const minImpactThreshold =
      options.minImpactThreshold ?? this.thresholds.impact;
    const minPriority = options.minPriority ?? this.thresholds.minPriority;

    const shouldGenerate = this.shouldGenerate({
      confidence: confidenceResult.score,
      confidenceThreshold,
      priority: priorityResult.priority,
      minPriority,
      impactScore,
      minImpactThreshold,
    });

    const priorityPayload = {
      priority: priorityResult.priority,
      score: priorityResult.score,
      impact: impactScore,
      urgency: urgencyScore,
      confidence: confidenceResult.score,
      relevance: relevanceScore,
      emoji: priorityResult.emoji,
      label: priorityResult.label,
      expiryDays: priorityResult.expiryDays,
      breakdown: {
        impact: impactScore,
        urgency: urgencyScore,
        confidence: confidenceResult.score,
        relevance: relevanceScore,
      },
    };

    const overall = {
      score: compositeScore,
      confidence: confidenceResult.score,
      priority: priorityResult.priority,
      level: confidenceResult.level,
    };

    const quality = this.getQualitySummary({
      confidence: confidenceResult,
      priority: priorityResult,
      impact: { score: impactScore },
      overall: { score: compositeScore },
    });

    return {
      confidence: {
        score: confidenceResult.score,
        level: confidenceResult.level,
        emoji: confidenceResult.emoji,
        message: confidenceResult.message,
        isSufficient: confidenceResult.isSufficient,
        penalties: confidenceResult.penalties,
        breakdown: confidenceResult.breakdown,
      },
      urgency: {
        score: urgencyScore,
        timeframe,
      },
      impact: {
        score: impactScore,
        financialImpact,
        description:
          (decisionData.impact && decisionData.impact.description) ||
          decisionData.impactDescription ||
          '',
      },
      relevance: {
        score: relevanceScore,
        relatedEntity,
      },
      priority: priorityPayload,
      overall,
      scoring: {
        compositeScore,
        weights: this.weights,
      },
      shouldGenerate,
      quality,
    };
  }

  calculateCompositeScore(impact, urgency, confidence, relevance) {
    const w = this.weights;
    const i = this._clamp(this._toNumber(impact, 0), 0, 100);
    const u = this._clamp(this._toNumber(urgency, 0), 0, 100);
    const c = this._clamp(this._toNumber(confidence, 0), 0, 100);
    const r = this._clamp(this._toNumber(relevance, 0), 0, 100);
    return Math.round(
      i * w.impact + u * w.urgency + c * w.confidence + r * w.relevance
    );
  }

  shouldGenerate({
    confidence,
    confidenceThreshold,
    priority,
    minPriority,
    impactScore,
    minImpactThreshold,
  }) {
    const confThreshold = confidenceThreshold ?? this.thresholds.confidence;
    const impactThreshold = minImpactThreshold ?? this.thresholds.impact;
    const minP = Validators.isValidPriority(minPriority)
      ? minPriority
      : this.thresholds.minPriority;
    const p = Validators.isValidPriority(priority) ? priority : DECISION_PRIORITY.LOW;

    if (!this.confidenceService.isSufficient(confidence, confThreshold)) {
      return false;
    }

    if ((PRIORITY_ORDER[p] ?? 99) > (PRIORITY_ORDER[minP] ?? 3)) {
      return false;
    }

    if (this._toNumber(impactScore, 0) < impactThreshold) {
      return false;
    }

    return true;
  }

  getQualitySummary(scoreResult = {}) {
    const confidence =
      scoreResult.confidence ||
      (scoreResult.overall && { score: scoreResult.overall.confidence }) ||
      { score: 0 };

    const priority =
      scoreResult.priority ||
      (scoreResult.overall && { priority: scoreResult.overall.priority }) ||
      { priority: DECISION_PRIORITY.LOW };

    const impact = scoreResult.impact || { score: 0 };
    const overall =
      scoreResult.overall ||
      (scoreResult.scoring && { score: scoreResult.scoring.compositeScore }) ||
      { score: 0 };

    const confScore = this._toNumber(
      typeof confidence === 'object' ? confidence.score : confidence,
      0
    );
    const impactScore = this._toNumber(
      typeof impact === 'object' ? impact.score : impact,
      0
    );
    const priorityValue =
      typeof priority === 'object' ? priority.priority : priority;

    const recommendations = [];
    let quality = 'GOOD';

    if (confScore < 60) {
      quality = 'POOR';
      recommendations.push('Improve data quality and recency');
    } else if (confScore < 75) {
      quality = 'FAIR';
      recommendations.push('Consider verifying key assumptions');
    }

    if (impactScore < 30) {
      if (quality === 'GOOD') quality = 'FAIR';
      recommendations.push('Decision impact may be limited');
    }

    if (priorityValue === DECISION_PRIORITY.LOW && confScore < 75) {
      quality = 'POOR';
      recommendations.push(
        'Low priority and low confidence. Defer or gather more data.'
      );
    }

    return {
      quality,
      recommendations,
      score: this._toNumber(
        typeof overall === 'object' ? overall.score : overall,
        0
      ),
      confidence: confScore,
      priority: priorityValue || DECISION_PRIORITY.LOW,
    };
  }

  _clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  _toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
}

module.exports = DecisionScoringService;