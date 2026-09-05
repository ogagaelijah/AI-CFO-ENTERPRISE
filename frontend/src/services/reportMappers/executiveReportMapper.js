// frontend/src/services/reportMappers/executiveReportMapper.js

import { isValidData, toNumber } from './utils';

export const mapExecutiveReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyExecutiveReport();
  }

  const {
    executiveSummary = {},
    kpiDashboard = {},
    risks = [],
    insights = [],
    recommendations = [],
  } = backendData;

  return {
    executiveSummary: {
      revenue: toNumber(executiveSummary.revenue),
      grossProfit: toNumber(executiveSummary.grossProfit),
      grossMargin: toNumber(executiveSummary.grossMargin),
      netProfit: toNumber(executiveSummary.netProfit),
      netMargin: toNumber(executiveSummary.netMargin),
      expenses: toNumber(executiveSummary.expenses),
    },
    kpiDashboard: {
      revenue: toNumber(kpiDashboard.revenue),
      grossMargin: toNumber(kpiDashboard.grossMargin),
      netMargin: toNumber(kpiDashboard.netMargin),
      totalSales: toNumber(kpiDashboard.totalSales),
    },
    risks: Array.isArray(risks) ? risks : [],
    insights: Array.isArray(insights) ? insights : [],
    recommendations: Array.isArray(recommendations) ? recommendations : [],
  };
};

const getEmptyExecutiveReport = () => ({
  executiveSummary: {
    revenue: 0,
    grossProfit: 0,
    grossMargin: 0,
    netProfit: 0,
    netMargin: 0,
    expenses: 0,
  },
  kpiDashboard: {
    revenue: 0,
    grossMargin: 0,
    netMargin: 0,
    totalSales: 0,
  },
  risks: [],
  insights: [],
  recommendations: [],
});