/**
 * Executive Mapper – Forecast
 * Maps forecast summary to executive format
 */

import { getConfidenceLevel, getStatusColor, getStatusEmoji } from './helpers';

export function mapExecutive(summary = {}, metadata = {}, baseForecast = {}) {
  const revenue = summary?.revenue?.forecast ?? baseForecast?.revenue?.forecast ?? 0;
  const profit = summary?.profit?.forecast ?? baseForecast?.profit?.forecast ?? 0;
  const cashFlow = summary?.cashFlow?.forecast ?? baseForecast?.cashFlow?.forecast ?? 0;

  const revenueConfidence = summary?.revenue?.confidence ?? 0;
  const profitConfidence = summary?.profit?.confidence ?? 0;
  const cashConfidence = summary?.cashFlow?.confidence ?? 0;

  const risks = summary?.risks || {};
  const status = summary?.status || 'NEUTRAL';

  const narrativeParts = [];
  if (revenue > 0) narrativeParts.push(`Revenue ₦${Number(revenue).toLocaleString()}`);
  if (profit !== 0) narrativeParts.push(`Profit ₦${Number(profit).toLocaleString()}`);
  if (cashFlow !== 0) narrativeParts.push(`Cash Flow ₦${Number(cashFlow).toLocaleString()}`);
  narrativeParts.push(`Status: ${getStatusEmoji(status)} ${status}`);

  const narrative = narrativeParts.join(' • ') || 'No forecast data available';

  return {
    keyMetrics: {
      revenue,
      profit,
      cashFlow,
      revenueConfidence,
      profitConfidence,
      cashConfidence,
      revenueConfidenceLevel: getConfidenceLevel(revenueConfidence),
      profitConfidenceLevel: getConfidenceLevel(profitConfidence),
      cashConfidenceLevel: getConfidenceLevel(cashConfidence),
    },
    riskSummary: {
      critical: risks.critical ?? 0,
      high: risks.high ?? 0,
      total: risks.total ?? 0,
      overallSeverity: risks.overallSeverity || 'LOW',
    },
    status,
    statusEmoji: getStatusEmoji(status),
    statusColor: getStatusColor(status),
    executiveSummary: {
      narrative,
      status,
      summary: `Forecast: Revenue ₦${Number(revenue).toLocaleString()} • Profit ₦${Number(profit).toLocaleString()} • ${status}`,
    },
    meta: {
      horizon: metadata?.horizon || '30D',
      generatedAt: metadata?.generatedAt || null,
    },
  };
}

export function getEmptyExecutive() {
  return {
    keyMetrics: { revenue: 0, profit: 0, cashFlow: 0, revenueConfidence: 0, profitConfidence: 0, cashConfidence: 0 },
    riskSummary: { critical: 0, high: 0, total: 0, overallSeverity: 'LOW' },
    status: 'NEUTRAL',
    statusEmoji: 'ℹ️',
    statusColor: '#6B7280',
    executiveSummary: { narrative: 'No forecast data available', status: 'NEUTRAL', summary: 'No forecast data available' },
    meta: { horizon: '30D', generatedAt: null },
  };
}

export default { mapExecutive, getEmptyExecutive };