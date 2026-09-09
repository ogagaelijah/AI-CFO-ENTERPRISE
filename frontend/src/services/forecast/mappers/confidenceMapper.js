/**
 * Confidence Mapper – Forecast
 * Maps forecast confidence data
 */

import { getConfidenceLevel } from './helpers';

export function mapConfidence(confidence = {}) {
  if (!confidence || !confidence.results || Object.keys(confidence.results).length === 0) {
    return {
      available: false,
      results: {},
      bestMetric: null,
      maxScore: 0,
      summary: 'No confidence data available',
    };
  }

  const results = {};
  Object.entries(confidence.results).forEach(([metric, data]) => {
    const score = data.score ?? 0;
    results[metric] = {
      score,
      level: data.level || 'VERY_LOW',
      levelInfo: getConfidenceLevel(score),
      summary: data.summary || '',
      factors: data.factors || {},
    };
  });

  return {
    available: true,
    results,
    bestMetric: confidence.bestMetric || null,
    maxScore: confidence.maxScore ?? 0,
    summary: confidence.summary || '',
    metadata: confidence.metadata || {},
  };
}

export function getEmptyConfidence() {
  return {
    available: false,
    results: {},
    bestMetric: null,
    maxScore: 0,
    summary: 'No confidence data available',
  };
}

export default { mapConfidence, getEmptyConfidence };