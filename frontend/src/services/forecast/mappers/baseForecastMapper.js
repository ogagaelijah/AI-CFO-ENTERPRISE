/**
 * Base Forecast Mapper
 * Maps individual forecast metrics from backend to frontend format
 */

import { formatCurrency, getConfidenceLevel } from './helpers';

export function mapBaseForecast(baseForecast = {}) {
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

export function mapForecastMetric(data = {}, name = '') {
  const forecast = data.forecast ?? 0;
  const isAvailable = data.available !== false && forecast > 0;
  const dataStatus = data.dataStatus || 'INSUFFICIENT';
  const isInsufficient = dataStatus === 'INSUFFICIENT' || dataStatus === 'MINIMAL';

  return {
    name: data.displayName || name,
    forecast: forecast,
    formatted: formatCurrency(forecast),
    available: isAvailable,
    dataStatus: dataStatus,
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

export function getEmptyBaseForecast() {
  return {
    revenue: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    salesVolume: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    cogs: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    expenses: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    profit: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    cashFlow: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    receivables: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    payables: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    inventory: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
    demand: { forecast: 0, formatted: '₦0', available: false, dataStatus: 'INSUFFICIENT', isInsufficient: true },
  };
}

export default { mapBaseForecast, mapForecastMetric, getEmptyBaseForecast };