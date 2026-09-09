/**
 * Scenarios Mapper – Forecast
 * Maps forecast scenarios data
 */

import { formatCurrency, formatPercentage, getConfidenceLevel, getScenarioType } from './helpers';

export function mapScenarios(scenarios = {}) {
  if (!scenarios || Object.keys(scenarios).length === 0) {
    return {
      available: false,
      conservative: null,
      expected: null,
      optimistic: null,
      comparison: null,
      metadata: {},
    };
  }

  return {
    available: true,
    conservative: mapScenario(scenarios.conservative, 'CONSERVATIVE'),
    expected: mapScenario(scenarios.expected, 'EXPECTED'),
    optimistic: mapScenario(scenarios.optimistic, 'OPTIMISTIC'),
    comparison: mapComparison(scenarios.comparison),
    metadata: scenarios.metadata || {},
  };
}

function mapScenario(scenario, type) {
  if (!scenario || !scenario.values) return null;
  const values = scenario.values || {};
  const typeInfo = getScenarioType(scenario.type || type);

  return {
    type: scenario.type || type,
    label: scenario.label || typeInfo.label,
    icon: typeInfo.icon,
    color: typeInfo.color,
    bg: typeInfo.bg,
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
}

function mapComparison(comparison = {}) {
  const compareMetrics = ['revenue', 'profit', 'cashFlow'];
  const result = {};

  compareMetrics.forEach((metric) => {
    const data = comparison[metric] || {};
    result[metric] = {
      conservative: data.conservative || 0,
      expected: data.expected || 0,
      optimistic: data.optimistic || 0,
      range: data.range || 0,
      variance: data.variance || 0,
      varianceFormatted: formatPercentage(data.variance || 0),
    };
  });

  return result;
}

export function getEmptyScenarios() {
  return {
    available: false,
    conservative: null,
    expected: null,
    optimistic: null,
    comparison: {
      revenue: { conservative: 0, expected: 0, optimistic: 0, range: 0, variance: 0, varianceFormatted: '0%' },
      profit: { conservative: 0, expected: 0, optimistic: 0, range: 0, variance: 0, varianceFormatted: '0%' },
      cashFlow: { conservative: 0, expected: 0, optimistic: 0, range: 0, variance: 0, varianceFormatted: '0%' },
    },
    metadata: {},
  };
}

export default { mapScenarios, getEmptyScenarios };