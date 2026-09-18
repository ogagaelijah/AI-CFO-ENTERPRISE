/**
 * Forecast Mapper - Main
 * Maps backend forecast data to frontend format
 * SSOT v5.8.0 – Current values for Executive Summary, projected for Metrics
 */

import {
  formatCurrency,
  formatPercentage,
  getConfidenceLevel,
} from './helpers';
import { mapExecutive } from './executiveMapper';
import { mapConfidence } from './confidenceMapper';

/**
 * Main forecast mapper
 */
export function mapForecastResponse(data = {}) {
  const forecastData = data.data || data;

  if (!forecastData || Object.keys(forecastData).length === 0) {
    return getEmptyForecastData();
  }

  const baseForecast = forecastData.baseForecast || {};
  const summary = forecastData.summary || {};
  const metadata = forecastData.metadata || {};
  const scenarios = forecastData.scenarios || {};
  const confidence = forecastData.confidence || {};
  const risks = forecastData.risks || {};
  const current = forecastData.current || {}; // SSOT current values

  return {
    baseForecast: mapBaseForecast(baseForecast),
    summary: mapSummary(summary),
    scenarios: mapScenarios(scenarios),
    confidence: mapConfidence(confidence),
    risks: mapRisksData(risks),
    current, // pass through for any component that needs pure SSOT
    metadata: {
      horizon: metadata.horizon || forecastData.horizon || '30D',
      generatedAt:
        forecastData.generatedAt ||
        metadata.generatedAt ||
        new Date().toISOString(),
      dataPoints: metadata.dataPoints || {},
      durationMs: metadata.durationMs || 0,
      warnings: metadata.warnings || [],
      partialSuccess: metadata.partialSuccess || false,
    },
    // Critical: pass current into executive mapper
    executive: mapExecutive(summary, metadata, baseForecast, current),
    status: summary.status || 'NEUTRAL',
    available: true,
  };
}

/**
 * Map base forecast metrics (projected values)
 */
function mapBaseForecast(baseForecast = {}) {
  const metrics = [
    'revenue',
    'salesVolume',
    'cogs',
    'expenses',
    'profit',
    'cashFlow',
    'receivables',
    'payables',
    'inventory',
    'demand',
  ];

  const result = {};
  metrics.forEach((metric) => {
    const data = baseForecast[metric] || {};
    result[metric] = mapForecastMetric(data, metric);
  });

  return result;
}

/**
 * Map individual forecast metric
 */
function mapForecastMetric(data = {}, name = '') {
  const forecast = data.forecast ?? 0;
  const isAvailable = data.available !== false && (forecast > 0 || data.available === true);
  const dataStatus = data.dataStatus || 'INSUFFICIENT';
  const isInsufficient = dataStatus === 'INSUFFICIENT' || dataStatus === 'MINIMAL';

  return {
    name: data.displayName || name,
    forecast,
    formatted: formatCurrency(forecast),
    available: isAvailable,
    dataStatus,
    isInsufficient,
    reason: data.reason || null,
    method: data.method || null,
    lowerBound: data.lowerBound ?? null,
    upperBound: data.upperBound ?? null,
    confidence: data.confidence?.score ?? 0,
    confidenceLevel: data.confidence?.level || 'VERY_LOW',
    confidenceInfo: getConfidenceLevel(data.confidence?.score ?? 0),
    historicalBasis: data.historicalBasis || {},
    assumptions: data.assumptions || [],
    risks: data.risks || [],
    metadata: data.metadata || {},
  };
}

/**
 * Map summary data – supports both .value (new) and .forecast (legacy)
 */
function mapSummary(summary = {}) {
  const getVal = (obj) => obj?.value ?? obj?.forecast ?? 0;
  const getConf = (obj) => obj?.confidence ?? 0;

  return {
    revenue: {
      forecast: getVal(summary.revenue),
      value: getVal(summary.revenue),
      formatted: formatCurrency(getVal(summary.revenue)),
      confidence: getConf(summary.revenue),
      confidenceLevel: getConfidenceLevel(getConf(summary.revenue)),
    },
    profit: {
      forecast: getVal(summary.profit),
      value: getVal(summary.profit),
      formatted: formatCurrency(getVal(summary.profit)),
      confidence: getConf(summary.profit),
      confidenceLevel: getConfidenceLevel(getConf(summary.profit)),
    },
    cashFlow: {
      forecast: getVal(summary.cashFlow),
      value: getVal(summary.cashFlow),
      formatted: formatCurrency(getVal(summary.cashFlow)),
      confidence: getConf(summary.cashFlow),
      confidenceLevel: getConfidenceLevel(getConf(summary.cashFlow)),
    },
    expenses: {
      forecast: getVal(summary.expenses),
      value: getVal(summary.expenses),
      formatted: formatCurrency(getVal(summary.expenses)),
      confidence: getConf(summary.expenses),
      confidenceLevel: getConfidenceLevel(getConf(summary.expenses)),
    },
    risks: {
      critical: summary.risks?.critical ?? 0,
      high: summary.risks?.high ?? 0,
      total: summary.risks?.total ?? 0,
      overallSeverity: summary.risks?.overallSeverity || 'LOW',
    },
    status: summary.status || 'NEUTRAL',
  };
}

/**
 * Map scenarios data
 */
function mapScenarios(scenarios = {}) {
  if (!scenarios || Object.keys(scenarios).length === 0) {
    return {
      available: false,
      conservative: null,
      expected: null,
      optimistic: null,
      comparison: null,
    };
  }

  const mapScenario = (scenario, type) => {
    if (!scenario || !scenario.values) return null;
    const values = scenario.values || {};
    return {
      type: scenario.type || type,
      label: scenario.label || type,
      values: {
        revenue: values.revenue || 0,
        revenueFormatted: formatCurrency(values.revenue || 0),
        cogs: values.cogs || 0,
        cogsFormatted: formatCurrency(values.cogs || 0),
        expenses: values.expenses || 0,
        expensesFormatted: formatCurrency(values.expenses || 0),
        profit: values.profit || 0,
        profitFormatted: formatCurrency(values.profit || 0),
        cashFlow: values.cashFlow || 0,
        cashFlowFormatted: formatCurrency(values.cashFlow || 0),
        grossProfit: values.grossProfit || 0,
        grossProfitFormatted: formatCurrency(values.grossProfit || 0),
        grossMargin: values.grossMargin || 0,
        grossMarginFormatted: formatPercentage(values.grossMargin || 0),
        netMargin: values.netMargin || 0,
        netMarginFormatted: formatPercentage(values.netMargin || 0),
      },
      assumptions: scenario.assumptions || [],
      description: scenario.description || '',
      confidence: {
        score: scenario.confidence?.score || 0,
        level: scenario.confidence?.level || 'VERY_LOW',
        levelInfo: getConfidenceLevel(scenario.confidence?.score || 0),
      },
      factors: scenario.factors || {},
    };
  };

  const comparison = scenarios.comparison || {};
  const compareMetrics = ['revenue', 'profit', 'cashFlow'];

  const mappedComparison = {};
  compareMetrics.forEach((metric) => {
    const data = comparison[metric] || {};
    mappedComparison[metric] = {
      conservative: data.conservative || 0,
      expected: data.expected || 0,
      optimistic: data.optimistic || 0,
      range: data.range || 0,
      variance: data.variance || 0,
      varianceFormatted: formatPercentage(data.variance || 0),
    };
  });

  return {
    available: true,
    conservative: mapScenario(scenarios.conservative, 'CONSERVATIVE'),
    expected: mapScenario(scenarios.expected, 'EXPECTED'),
    optimistic: mapScenario(scenarios.optimistic, 'OPTIMISTIC'),
    comparison: mappedComparison,
    metadata: scenarios.metadata || {},
  };
}

/**
 * Map risks data
 */
function mapRisksData(risks = {}) {
  const riskList = risks.risks || [];
  const counts = risks.counts || {};
  const overallSeverity = risks.overallSeverity || 'LOW';

  return {
    risks: riskList.map((risk) => ({
      id: risk.id || null,
      metric: risk.metric || '',
      displayName: risk.displayName || 'Unknown Risk',
      type: risk.type || 'UNKNOWN',
      severity: risk.severity || 'LOW',
      description: risk.description || '',
      trigger: risk.trigger || '',
      action: risk.action || null,
      impact: risk.impact || 0,
      impactFormatted: formatCurrency(risk.impact || 0),
      detectedAt: risk.detectedAt || null,
    })),
    overallSeverity,
    summary: risks.summary || 'No significant risks detected',
    counts: {
      critical: counts.critical ?? 0,
      high: counts.high ?? 0,
      medium: counts.medium ?? 0,
      low: counts.low ?? 0,
      total: counts.total ?? 0,
    },
    metadata: risks.metadata || {},
  };
}

/**
 * Empty forecast data fallback
 */
export function getEmptyForecastData() {
  return {
    baseForecast: {},
    summary: {
      revenue: { forecast: 0, value: 0, formatted: '₦0', confidence: 0 },
      profit: { forecast: 0, value: 0, formatted: '₦0', confidence: 0 },
      cashFlow: { forecast: 0, value: 0, formatted: '₦0', confidence: 0 },
      expenses: { forecast: 0, value: 0, formatted: '₦0', confidence: 0 },
      risks: { critical: 0, high: 0, total: 0, overallSeverity: 'LOW' },
      status: 'NEUTRAL',
    },
    scenarios: {
      available: false,
      conservative: null,
      expected: null,
      optimistic: null,
      comparison: null,
    },
    confidence: {
      available: false,
      results: {},
      bestMetric: null,
      maxScore: 0,
      summary: 'No confidence data',
    },
    risks: {
      risks: [],
      overallSeverity: 'LOW',
      summary: 'No risks detected',
      counts: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    },
    current: {
      revenue: 0,
      profit: 0,
      cashFlow: 0,
      expenses: 0,
    },
    metadata: {
      horizon: '30D',
      generatedAt: new Date().toISOString(),
      dataPoints: {},
      durationMs: 0,
      warnings: [],
      partialSuccess: false,
    },
    executive: {
      keyMetrics: {
        revenue: 0,
        profit: 0,
        cashFlow: 0,
        expenses: 0,
        revenueConfidence: 0,
        profitConfidence: 0,
        cashConfidence: 0,
      },
      riskSummary: {
        critical: 0,
        high: 0,
        total: 0,
        overallSeverity: 'LOW',
      },
      status: 'NEUTRAL',
      statusEmoji: 'ℹ️',
      statusColor: '#6B7280',
      executiveSummary: {
        narrative: 'No forecast data available',
        status: 'NEUTRAL',
        summary: 'No forecast data available',
      },
      meta: { horizon: '30D', generatedAt: null },
    },
    status: 'NEUTRAL',
    available: false,
  };
}

export default mapForecastResponse;