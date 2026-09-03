/**
 * AI Advisor Engine - Data Types
 * Zero external dependencies. Immutable. SSOT. Crash-proof.
 *
 * @version 1.2.0
 */

'use strict';

const crypto = require('crypto');

// Dynamically integrate with the unified Single Source of Truth contracts engine
const {
  ADVISOR_CATEGORIES,
  ADVISOR_SENTIMENT,
  ADVISOR_SEVERITY,
  ADVISOR_TONE,
  ADVISOR_CONTEXT,
  ADVISOR_RESPONSE_TYPES,
  SENTIMENT_EMOJI,
  SEVERITY_EMOJI,
  ContractValidators
} = require('./AdvisorContracts');

/**
 * High-performance, memory-safe deep freeze utility.
 * Protects against prototype pollution, circular references, and native mutations.
 */
const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Prevent breaking native instances that rely on internal slots
  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Map || obj instanceof Set) {
    return Object.freeze(obj);
  }

  const seen = new WeakSet();

  const freezeRecursive = (currentObj) => {
    if (currentObj === null || typeof currentObj !== 'object' || seen.has(currentObj)) {
      return;
    }

    seen.add(currentObj);
    Object.freeze(currentObj);

    const keys = Reflect.ownKeys(currentObj);
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(currentObj, key);
      if (desc && desc.configurable && (typeof desc.value === 'object' && desc.value !== null)) {
        freezeRecursive(desc.value);
      }
    }
  };

  freezeRecursive(obj);
  return obj;
};

/**
 * High-scale cryptographically secure ID generator.
 * Eliminates timestamp tracking collisions under massively parallel microtask loads.
 */
const generateId = (prefix) => {
  const timestamp = Date.now().toString(36);
  // Using 8 random bytes (16 hex chars) ensures entropy safety across distributed environments
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
};

class AdvisorInsight {
  constructor(params = {}) {
    const defaults = {
      id: generateId('insight'),
      evidence: {},
      recommendations: [],
      data: {},
      generatedAt: new Date(),
      confidence: 0
    };

    const p = { ...defaults, ...params };

    // Standard Property Validations
    if (!p.category) throw new Error('AdvisorInsight: category is required');
    if (!p.title) throw new Error('AdvisorInsight: title is required');
    if (!p.content) throw new Error('AdvisorInsight: content is required');
    if (!p.summary) throw new Error('AdvisorInsight: summary is required');
    if (!p.sentiment) throw new Error('AdvisorInsight: sentiment is required');
    if (!p.severity) throw new Error('AdvisorInsight: severity is required');
    if (!p.source) throw new Error('AdvisorInsight: source is required');

    // Secure SSOT Validation Layer Checks
    if (!ContractValidators.isValidCategory(p.category)) throw new Error(`AdvisorInsight: Invalid category ${p.category}`);
    if (!ContractValidators.isValidSentiment(p.sentiment)) throw new Error(`AdvisorInsight: Invalid sentiment ${p.sentiment}`);
    if (!ContractValidators.isValidSeverity(p.severity)) throw new Error(`AdvisorInsight: Invalid severity ${p.severity}`);
    if (p.tone && !ContractValidators.isValidTone(p.tone)) throw new Error(`AdvisorInsight: Invalid tone ${p.tone}`);
    if (p.context && !ContractValidators.isValidContext(p.context)) throw new Error(`AdvisorInsight: Invalid context ${p.context}`);

    if (p.confidence < 0 || p.confidence > 100) throw new Error('AdvisorInsight: confidence must be 0-100');

    this.id = String(p.id);
    this.category = p.category;
    this.title = String(p.title);
    this.content = String(p.content);
    this.summary = String(p.summary);
    this.sentiment = p.sentiment;
    this.severity = p.severity;
    
    // Defensive cloning followed by deep freezing protection
    this.evidence = deepFreeze(JSON.parse(JSON.stringify(p.evidence || {})));
    this.recommendations = deepFreeze([...(p.recommendations || [])].map(String));
    this.data = deepFreeze(JSON.parse(JSON.stringify(p.data || {})));
    
    this.source = String(p.source);
    this.generatedAt = p.generatedAt instanceof Date ? p.generatedAt : new Date(p.generatedAt);
    this.confidence = Number(p.confidence);
    this.tone = p.tone || null;
    this.context = p.context || null;

    Object.freeze(this);
  }

  getSentimentEmoji() {
    return SENTIMENT_EMOJI[this.sentiment] || 'ℹ️';
  }

  getSeverityEmoji() {
    return SEVERITY_EMOJI[this.severity] || 'ℹ️';
  }

  toDisplay() {
    return {
      id: this.id,
      title: this.title,
      summary: this.summary,
      content: this.content,
      category: this.category,
      sentiment: this.sentiment,
      sentimentEmoji: this.getSentimentEmoji(),
      severity: this.severity,
      severityEmoji: this.getSeverityEmoji(),
      recommendations: [...this.recommendations],
      confidence: this.confidence,
      source: this.source,
      tone: this.tone,
      context: this.context,
      generatedAt: this.generatedAt.toISOString() // Universal serialization standard
    };
  }

  toJSON() {
    return this.toDisplay();
  }
}

class AdvisorResponse {
  constructor(params = {}) {
    const defaults = {
      id: generateId('response'),
      insights: [],
      recommendations: [],
      actions: [],
      data: {},
      generatedAt: new Date(),
      question: null
    };

    const p = { ...defaults, ...params };

    if (!p.type) throw new Error('AdvisorResponse: type is required');
    if (!p.content) throw new Error('AdvisorResponse: content is required');
    if (!p.sentiment) throw new Error('AdvisorResponse: sentiment is required');
    if (!p.severity) throw new Error('AdvisorResponse: severity is required');

    ContractValidators.validateResponse(p);
    if (p.tone && !ContractValidators.isValidTone(p.tone)) throw new Error(`AdvisorResponse: Invalid tone ${p.tone}`);
    if (p.context && !ContractValidators.isValidContext(p.context)) throw new Error(`AdvisorResponse: Invalid context ${p.context}`);

    // Map nested insights safely into true typed structures
    const insights = (p.insights || []).map(i => i instanceof AdvisorInsight ? i : new AdvisorInsight(i));

    this.id = String(p.id);
    this.type = p.type;
    this.title = p.title ? String(p.title) : null;
    this.content = String(p.content);
    this.summary = p.summary ? String(p.summary) : null;
    this.sentiment = p.sentiment;
    this.severity = p.severity;
    
    this.insights = deepFreeze(insights);
    this.recommendations = deepFreeze([...(p.recommendations || [])].map(String));
    this.actions = deepFreeze([...(p.actions || [])].map(String));
    this.data = deepFreeze(JSON.parse(JSON.stringify(p.data || {})));
    
    this.tone = p.tone || null;
    this.context = p.context || null;
    this.question = p.question ? String(p.question) : null;
    this.generatedAt = p.generatedAt instanceof Date ? p.generatedAt : new Date(p.generatedAt);

    Object.freeze(this);
  }

  toDisplay() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      content: this.content,
      summary: this.summary,
      sentiment: this.sentiment,
      severity: this.severity,
      insights: this.insights.map(i => i.toDisplay()),
      recommendations: [...this.recommendations],
      actions: [...this.actions],
      data: JSON.parse(JSON.stringify(this.data)),
      question: this.question,
      tone: this.tone,
      context: this.context,
      generatedAt: this.generatedAt.toISOString()
    };
  }

  toJSON() {
    return this.toDisplay();
  }
}

class AdvisorQuestion {
  constructor(params = {}) {
    const defaults = {
      id: generateId('question'),
      keywords: [],
      entities: {},
      context: {},
      askedAt: new Date()
    };

    const p = { ...defaults, ...params };

    if (!p.text) throw new Error('AdvisorQuestion: text is required');
    if (!p.intent) throw new Error('AdvisorQuestion: intent is required');
    
    // FIX: Removed category validation. Intent is now free-form string.
    // If you later add ADVISOR_QUESTION_INTENT enum, re-add validation here.

    this.id = String(p.id);
    this.text = String(p.text);
    this.intent = String(p.intent);
    
    this.keywords = deepFreeze([...(p.keywords || [])].map(String));
    this.entities = deepFreeze(JSON.parse(JSON.stringify(p.entities || {})));
    this.context = deepFreeze(JSON.parse(JSON.stringify(p.context || {})));
    this.askedAt = p.askedAt instanceof Date ? p.askedAt : new Date(p.askedAt);

    Object.freeze(this);
  }

  toDisplay() {
    return {
      id: this.id,
      text: this.text,
      intent: this.intent,
      keywords: [...this.keywords],
      entities: JSON.parse(JSON.stringify(this.entities)),
      context: JSON.parse(JSON.stringify(this.context)),
      askedAt: this.askedAt.toISOString()
    };
  }

  toJSON() {
    return this.toDisplay();
  }
}

module.exports = {
  AdvisorInsight,
  AdvisorResponse,
  AdvisorQuestion
};