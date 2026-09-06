// frontend/src/services/reportMappers/executiveMapper.js

import { today, isValidData } from './utils';

/**
 * Production-resilient mapper.
 * Works with both the old executiveSummary shape and the new rich contract.
 */
export const mapExecutiveReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyExecutiveReport();
  }

  // Prefer new rich fields, fall back to old executiveSummary / financialRatios
  const summary = backendData.executiveSummary || {};
  const ratios = backendData.financialRatios || {};
  const cash = backendData.cashFlow || {};
  const period = backendData.period || {};

  const revenue =
    backendData.businessOverview?.revenue ??
    summary.revenue ??
    0;

  const netProfit =
    backendData.businessOverview?.netProfit ??
    summary.netProfit ??
    0;

  const grossMargin =
    backendData.kpiSummary?.grossMargin ??
    ratios.grossMargin ??
    summary.grossMargin ??
    0;

  const netMargin =
    backendData.kpiSummary?.netMargin ??
    ratios.netMargin ??
    summary.netMargin ??
    0;

  const cashPosition =
    backendData.kpiSummary?.cashPosition ??
    summary.cash ??
    cash.closing ??
    0;

  const grossProfit =
    backendData.profitability?.grossProfit ??
    summary.grossProfit ??
    0;

  return {
    generatedAt: backendData.generatedAt || new Date().toISOString(),
    period: {
      start: period.start || today(),
      end: period.end || today(),
    },
    businessOverview: {
      revenue,
      netProfit,
      businessHealth: backendData.businessOverview?.businessHealth || 'Neutral',
      businessScore: backendData.businessOverview?.businessScore ?? 0,
    },
    kpiSummary: {
      grossMargin,
      netMargin,
      cashPosition,
    },
    businessTrends: backendData.businessTrends || {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    },
    forecast: backendData.forecast || {
      next7Days: 0,
      next30Days: 0,
      tomorrow: 0,
      confidence: 0,
    },
    profitability: {
      grossProfit,
      netProfit,
    },
    cashFlow: {
      openingCash: cash.opening ?? 0,
      closingCash: cash.closing ?? cashPosition,
      cashPosition,
      netCashFlow: (cash.closing ?? cashPosition) - (cash.opening ?? 0),
    },
    debtors: {
      totalDebtors: backendData.debtors?.totalDebtors ?? 0,
      totalAmount:
        backendData.debtors?.totalAmount ??
        backendData.receivables?.totalOutstanding ??
        summary.receivables ??
        0,
    },
    inventory: {
      totalItems:
        backendData.inventory?.totalItems ??
        0,
      totalValue:
        backendData.inventory?.totalValue ??
        summary.inventory ??
        0,
      lowStockCount: backendData.inventory?.lowStockCount ?? 0,
    },
    risks: Array.isArray(backendData.risks) ? backendData.risks : [],
    decisions: Array.isArray(backendData.decisions) ? backendData.decisions : [],
    recommendations: Array.isArray(backendData.recommendations)
      ? backendData.recommendations
      : [],
    aiAdvisor: backendData.aiAdvisor || null,
    topProducts:
      backendData.topProducts ||
      backendData.revenuePerformance?.topProducts ||
      [],
    topCustomers:
      backendData.topCustomers ||
      backendData.revenuePerformance?.topCustomers ||
      [],
  };
};

const getEmptyExecutiveReport = () => ({
  generatedAt: new Date().toISOString(),
  period: { start: today(), end: today() },
  businessOverview: {
    revenue: 0,
    netProfit: 0,
    businessHealth: 'Neutral',
    businessScore: 0,
  },
  kpiSummary: {
    grossMargin: 0,
    netMargin: 0,
    cashPosition: 0,
  },
  businessTrends: {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  },
  forecast: {
    next7Days: 0,
    next30Days: 0,
    tomorrow: 0,
    confidence: 0,
  },
  profitability: {
    grossProfit: 0,
    netProfit: 0,
  },
  cashFlow: {
    openingCash: 0,
    closingCash: 0,
    cashPosition: 0,
    netCashFlow: 0,
  },
  debtors: {
    totalDebtors: 0,
    totalAmount: 0,
  },
  inventory: {
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
  },
  risks: [],
  decisions: [],
  recommendations: [],
  aiAdvisor: null,
  topProducts: [],
  topCustomers: [],
});