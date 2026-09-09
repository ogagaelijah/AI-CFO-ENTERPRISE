/**
 * What-If Mapper – Forecast
 * Maps forecast what-if analysis data
 */

import { formatCurrency, formatPercentage } from './helpers';

export function mapWhatIf(whatIf = {}) {
  if (!whatIf || Object.keys(whatIf).length === 0) {
    return {
      available: false,
      original: null,
      modified: null,
      impacts: null,
      summary: null,
      metadata: {},
    };
  }

  const original = whatIf.original || {};
  const modified = whatIf.modified || {};
  const impacts = whatIf.impacts || {};
  const summary = whatIf.summary || {};
  const assumptions = whatIf.assumptions || [];
  const metadata = whatIf.metadata || {};

  return {
    available: true,
    original: mapMetrics(original),
    modified: mapMetrics(modified),
    impacts: mapImpacts(impacts),
    summary: {
      text: summary.summary || 'No impact analysis available',
      profitImpact: summary.profitImpact || 0,
      profitImpactFormatted: formatPercentage(summary.profitImpact || 0),
      direction: summary.direction || 'NEUTRAL',
      assumptions: assumptions || [],
    },
    metadata: {
      generatedAt: metadata.generatedAt || null,
      horizon: metadata.horizon || '30D',
      changesApplied: metadata.changesApplied || [],
    },
  };
}

function mapMetrics(metrics = {}) {
  return {
    revenue: metrics.revenue || 0,
    revenueFormatted: formatCurrency(metrics.revenue || 0),
    cogs: metrics.cogs || 0,
    cogsFormatted: formatCurrency(metrics.cogs || 0),
    expenses: metrics.expenses || 0,
    expensesFormatted: formatCurrency(metrics.expenses || 0),
    profit: metrics.profit || 0,
    profitFormatted: formatCurrency(metrics.profit || 0),
    cashFlow: metrics.cashFlow || 0,
    cashFlowFormatted: formatCurrency(metrics.cashFlow || 0),
    grossMargin: metrics.grossMargin || 0,
    grossMarginFormatted: formatPercentage(metrics.grossMargin || 0),
    netMargin: metrics.netMargin || 0,
    netMarginFormatted: formatPercentage(metrics.netMargin || 0),
  };
}

function mapImpacts(impacts = {}) {
  const result = {};
  const impactKeys = ['revenue', 'cogs', 'expenses', 'profit', 'cashFlow'];

  impactKeys.forEach((key) => {
    const data = impacts[key] || {};
    result[key] = {
      original: data.original || 0,
      modified: data.modified || 0,
      absoluteChange: data.absoluteChange || 0,
      percentageChange: data.percentageChange || 0,
      percentageChangeFormatted: formatPercentage(data.percentageChange || 0),
      direction: data.direction || 'NEUTRAL',
    };
  });

  return result;
}

export function getEmptyWhatIf() {
  return {
    available: false,
    original: null,
    modified: null,
    impacts: null,
    summary: { text: 'No what-if analysis available', profitImpact: 0, profitImpactFormatted: '0%', direction: 'NEUTRAL', assumptions: [] },
    metadata: { generatedAt: null, horizon: '30D', changesApplied: [] },
  };
}

export default { mapWhatIf, getEmptyWhatIf };