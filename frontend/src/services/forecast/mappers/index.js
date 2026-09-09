/**
 * Forecast Mappers - Index
 * Aggregates all forecast mappers
 */

import { mapBaseForecast, mapForecastMetric, getEmptyBaseForecast } from './baseForecastMapper';
import { mapExecutive, getEmptyExecutive } from './executiveMapper';
import { mapConfidence, getEmptyConfidence } from './confidenceMapper';
import { mapRisks, getEmptyRisks } from './riskMapper';
import { mapScenarios, getEmptyScenarios } from './scenariosMapper';
import { mapWhatIf, getEmptyWhatIf } from './whatIfMapper';

// Re-export all mappers
export {
  mapBaseForecast,
  mapForecastMetric,
  getEmptyBaseForecast,
  mapExecutive,
  getEmptyExecutive,
  mapConfidence,
  getEmptyConfidence,
  mapRisks,
  getEmptyRisks,
  mapScenarios,
  getEmptyScenarios,
  mapWhatIf,
  getEmptyWhatIf,
};

// Main mapper that combines everything
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
  const whatIf = forecastData.whatIf || {};

  return {
    baseForecast: mapBaseForecast(baseForecast),
    summary: {
      revenue: {
        forecast: summary.revenue?.forecast ?? 0,
        formatted: formatCurrency(summary.revenue?.forecast ?? 0),
        confidence: summary.revenue?.confidence ?? 0,
      },
      profit: {
        forecast: summary.profit?.forecast ?? 0,
        formatted: formatCurrency(summary.profit?.forecast ?? 0),
        confidence: summary.profit?.confidence ?? 0,
      },
      cashFlow: {
        forecast: summary.cashFlow?.forecast ?? 0,
        formatted: formatCurrency(summary.cashFlow?.forecast ?? 0),
        confidence: summary.cashFlow?.confidence ?? 0,
      },
      risks: {
        critical: summary.risks?.critical ?? 0,
        high: summary.risks?.high ?? 0,
        total: summary.risks?.total ?? 0,
        overallSeverity: summary.risks?.overallSeverity || 'LOW',
      },
      status: summary.status || 'NEUTRAL',
    },
    scenarios: mapScenarios(scenarios),
    confidence: mapConfidence(confidence),
    risks: mapRisks(risks),
    whatIf: mapWhatIf(whatIf),
    metadata: {
      horizon: metadata.horizon || '30D',
      generatedAt: forecastData.generatedAt || new Date().toISOString(),
      dataPoints: metadata.dataPoints || {},
      durationMs: metadata.durationMs || 0,
      warnings: metadata.warnings || [],
      partialSuccess: metadata.partialSuccess || false,
    },
    executive: mapExecutive(summary, metadata, baseForecast),
    status: summary.status || 'NEUTRAL',
    available: true,
  };
}

// Helper imports for formatting
import { formatCurrency } from './helpers';

export function getEmptyForecastData() {
  return {
    baseForecast: getEmptyBaseForecast(),
    summary: {
      revenue: { forecast: 0, formatted: '₦0', confidence: 0 },
      profit: { forecast: 0, formatted: '₦0', confidence: 0 },
      cashFlow: { forecast: 0, formatted: '₦0', confidence: 0 },
      risks: { critical: 0, high: 0, total: 0, overallSeverity: 'LOW' },
      status: 'NEUTRAL',
    },
    scenarios: getEmptyScenarios(),
    confidence: getEmptyConfidence(),
    risks: getEmptyRisks(),
    whatIf: getEmptyWhatIf(),
    metadata: { horizon: '30D', generatedAt: new Date().toISOString(), dataPoints: {}, durationMs: 0, warnings: [], partialSuccess: false },
    executive: getEmptyExecutive(),
    status: 'NEUTRAL',
    available: false,
  };
}

export default mapForecastResponse;