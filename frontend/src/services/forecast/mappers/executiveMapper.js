/**
 * Executive Mapper – Forecast
 * Maps forecast summary to executive format
 * SSOT v5.8.0 – prefers current SSOT values over projected
 */

import { getConfidenceLevel, getStatusColor, getStatusEmoji } from './helpers';

export function mapExecutive(summary = {}, metadata = {}, baseForecast = {}, current = {}) {
  // Priority order for values:
  // 1. current (pure SSOT from Analytics)
  // 2. summary.*.value (new backend shape)
  // 3. summary.*.forecast (legacy)
  // 4. baseForecast (last resort)

  const pick = (metric) => {
    if (current && current[metric] != null) return Number(current[metric]) || 0;
    if (summary?.[metric]?.value != null) return Number(summary[metric].value) || 0;
    if (summary?.[metric]?.forecast != null) return Number(summary[metric].forecast) || 0;
    if (baseForecast?.[metric]?.forecast != null) return Number(baseForecast[metric].forecast) || 0;
    return 0;
  };

  const pickConfidence = (metric) => {
    if (summary?.[metric]?.confidence != null) return Number(summary[metric].confidence) || 0;
    if (baseForecast?.[metric]?.confidence?.score != null) {
      return Number(baseForecast[metric].confidence.score) || 0;
    }
    // Current values are known → high confidence
    return 65;
  };

  const revenue = pick('revenue');
  const profit = pick('profit');
  const cashFlow = pick('cashFlow');
  const expenses = pick('expenses');

  const revenueConfidence = pickConfidence('revenue');
  const profitConfidence = pickConfidence('profit');
  const cashConfidence = pickConfidence('cashFlow');

  const risks = summary?.risks || {};
  const status = summary?.status || 'NEUTRAL';

  // Build narrative
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
      expenses,
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
      summary: `Current: Revenue ₦${Number(revenue).toLocaleString()} • Profit ₦${Number(profit).toLocaleString()} • ${status}`,
    },
    meta: {
      horizon: metadata?.horizon || '30D',
      generatedAt: metadata?.generatedAt || null,
    },
  };
}

export function getEmptyExecutive() {
  return {
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
    meta: {
      horizon: '30D',
      generatedAt: null,
    },
  };
}

export default { mapExecutive, getEmptyExecutive };