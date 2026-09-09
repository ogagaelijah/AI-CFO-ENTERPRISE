// frontend/src/services/risk/mappers/mapRiskPackage.js

import { mapDomainRisk } from './mapDomainRisk';

export function mapRiskPackage(raw = {}) {
  if (!raw || raw.error) {
    return {
      available: false,
      error: raw?.reason || raw?.error || 'UNKNOWN',
      message: raw?.message || 'Risk data unavailable',
      summary: null,
      risks: [],
      projected: null,
      executiveSummary: null,
      recommendations: [],
      metadata: raw?.metadata || {},
    };
  }

  const domainRisks = raw.risks || {};
  const allRisks = Array.isArray(domainRisks.all)
    ? domainRisks.all.map(mapDomainRisk)
    : Object.values(domainRisks)
        .filter((r) => r && typeof r === 'object' && r.type)
        .map(mapDomainRisk);

  return {
    available: true,
    generatedAt: raw.generatedAt,
    horizon: raw.horizon,
    period: raw.period,

    projected: raw.projected
      ? {
          revenue: Number(raw.projected.revenue) || 0,
          cogs: Number(raw.projected.cogs) || 0,
          expenses: Number(raw.projected.expenses) || 0,
          profit: Number(raw.projected.profit) || 0,
          cashFlow: Number(raw.projected.cashFlow) || 0,
          receivables: Number(raw.projected.receivables) || 0,
          payables: Number(raw.projected.payables) || 0,
          inventory: Number(raw.projected.inventory) || 0,
          demand: Number(raw.projected.demand) || 0,
        }
      : null,

    risks: {
      cash: mapDomainRisk(domainRisks.cash),
      revenue: mapDomainRisk(domainRisks.revenue),
      profitability: mapDomainRisk(domainRisks.profitability),
      expenses: mapDomainRisk(domainRisks.expenses),
      receivables: mapDomainRisk(domainRisks.receivables),
      payables: mapDomainRisk(domainRisks.payables),
      inventory: mapDomainRisk(domainRisks.inventory),
      all: allRisks,
    },

    forecastRisks: raw.forecastRisks || null,
    confidence: raw.confidence || {},
    scenarios: raw.scenarios || null,
    whatIf: raw.whatIf || null,

    executiveSummary: raw.executiveSummary
      ? {
          overallRisk: raw.executiveSummary.overallRisk || null,
          topRisk: raw.executiveSummary.topRisk || null,
          summary: raw.executiveSummary.summary || '',
          projected: raw.executiveSummary.projected || null,
        }
      : null,

    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map((r) => ({
          priority: r.priority || 'MEDIUM',
          riskType: r.riskType,
          title: r.title,
          recommendation: r.recommendation,
          timeframe: r.timeframe || 'Short-term',
        }))
      : [],

    summary: {
      overallScore: Number(raw.summary?.overallScore) || 0,
      overallSeverity: raw.summary?.overallSeverity || 'LOW',
      riskCount: Number(raw.summary?.riskCount) || 0,
      criticalRisks: Number(raw.summary?.criticalRisks) || 0,
      highRisks: Number(raw.summary?.highRisks) || 0,
      mediumRisks: Number(raw.summary?.mediumRisks) || 0,
      lowRisks: Number(raw.summary?.lowRisks) || 0,
    },

    metadata: raw.metadata || {},
  };
}