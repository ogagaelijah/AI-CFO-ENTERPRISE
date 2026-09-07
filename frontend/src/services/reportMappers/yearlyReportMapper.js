// frontend/src/services/reportMappers/yearlyMapper.js

import { today, isValidData, toNumber } from './utils';

export const mapYearlyReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyYearlyReport();
  }

  const {
    year,
    period,
    executiveSummary,
    annualKpiDashboard,
    yearOverYear,
    majorRisks,
    majorOpportunities,
    strategicInsights,
    inventory,
    topProducts,
    topCustomers,
    debtors,
    creditors,
  } = backendData;

  // Safely extract YoY data
  const safeYoY = yearOverYear || {};

  return {
    year: year || new Date().getFullYear(),
    period: {
      start: period?.start || today(),
      end: period?.end || today(),
    },
    executiveSummary: {
      totalRevenue: executiveSummary?.totalRevenue || 0,
      netProfit: executiveSummary?.netProfit || 0,
      netMargin: executiveSummary?.netMargin || 0,
    },
    annualKpiDashboard: {
      grossMargin: annualKpiDashboard?.grossMargin || 0,
      netMargin: annualKpiDashboard?.netMargin || 0,
      cogs: annualKpiDashboard?.cogs || 0,
      expenses: annualKpiDashboard?.expenses || 0,
      grossProfit: annualKpiDashboard?.grossProfit || 0,
    },
    yearOverYear: {
      revenueChange: safeYoY.revenueChange ?? 0,
      profitChange: safeYoY.profitChange ?? 0,
      revenueAbsoluteChange: safeYoY.revenueAbsoluteChange ?? 0,
      profitAbsoluteChange: safeYoY.profitAbsoluteChange ?? 0,
      hasPriorYearData: safeYoY.hasPriorYearData ?? false,
      previousYear: {
        revenue: safeYoY.previousYear?.revenue ?? 0,
        netProfit: safeYoY.previousYear?.netProfit ?? 0,
      },
    },
    inventory: {
      totalItems: inventory?.totalItems || 0,
      totalValue: inventory?.totalValue || 0,
      lowStockCount: inventory?.lowStockCount || 0,
    },
    majorRisks: Array.isArray(majorRisks) ? majorRisks : [],
    majorOpportunities: Array.isArray(majorOpportunities) ? majorOpportunities : [],
    strategicInsights: Array.isArray(strategicInsights) ? strategicInsights : [],
    topProducts: Array.isArray(topProducts) ? topProducts : [],
    topCustomers: Array.isArray(topCustomers) ? topCustomers : [],
    debtors: {
      count: toNumber(debtors?.count),
      totalAmount: toNumber(debtors?.totalAmount),
      top3: Array.isArray(debtors?.top3) ? debtors.top3 : [],
    },
    creditors: {
      count: toNumber(creditors?.count),
      totalAmount: toNumber(creditors?.totalAmount),
      top3: Array.isArray(creditors?.top3) ? creditors.top3 : [],
    },
  };
};

const getEmptyYearlyReport = () => ({
  year: new Date().getFullYear(),
  period: { start: today(), end: today() },
  executiveSummary: {
    totalRevenue: 0,
    netProfit: 0,
    netMargin: 0,
  },
  annualKpiDashboard: {
    grossMargin: 0,
    netMargin: 0,
    cogs: 0,
    expenses: 0,
    grossProfit: 0,
  },
  yearOverYear: {
    revenueChange: 0,
    profitChange: 0,
    revenueAbsoluteChange: 0,
    profitAbsoluteChange: 0,
    hasPriorYearData: false,
    previousYear: {
      revenue: 0,
      netProfit: 0,
    },
  },
  inventory: {
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
  },
  majorRisks: [],
  majorOpportunities: [],
  strategicInsights: [],
  topProducts: [],
  topCustomers: [],
  debtors: {
    count: 0,
    totalAmount: 0,
    top3: [],
  },
  creditors: {
    count: 0,
    totalAmount: 0,
    top3: [],
  },
});