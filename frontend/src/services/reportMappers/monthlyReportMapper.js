// frontend/src/services/reportMappers/monthlyMapper.js

import { today, isValidData } from './utils';

export const mapMonthlyReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyMonthlyReport();
  }

  const {
    month,
    year,
    period,
    revenue,
    grossProfit,
    grossMargin,
    expenses,
    netProfit,
    netMargin,
    executiveSummary,
    kpiDashboard,
    risks,
    aiInsights,
    recommendations,
    topProducts,
    topCustomers,
    inventory,
  } = backendData;

  return {
    month: month || new Date().toLocaleString('default', { month: 'long' }),
    year: year || new Date().getFullYear(),
    period: {
      start: period?.start || today(),
      end: period?.end || today(),
    },
    executiveSummary: {
      totalRevenue: revenue || executiveSummary?.totalRevenue || 0,
      grossProfit: grossProfit || executiveSummary?.grossProfit || 0,
      grossMargin: grossMargin || executiveSummary?.grossMargin || 0,
      expenses: expenses || executiveSummary?.expenses || 0,
      netProfit: netProfit || executiveSummary?.netProfit || 0,
      netMargin: netMargin || executiveSummary?.netMargin || 0,
      revenueChange: executiveSummary?.revenueChange || 0,
      profitChange: executiveSummary?.profitChange || 0,
    },
    kpiDashboard: {
      grossMargin: kpiDashboard?.grossMargin || 0,
      netMargin: kpiDashboard?.netMargin || 0,
      ytdRevenue: kpiDashboard?.ytdRevenue || 0,
      ytdNetProfit: kpiDashboard?.ytdNetProfit || 0,
      totalSales: kpiDashboard?.totalSales || 0,
      uniqueCustomers: kpiDashboard?.uniqueCustomers || 0,
    },
    inventory: {
      totalItems: inventory?.totalItems || 0,
      totalValue: inventory?.totalValue || 0,
      lowStockCount: inventory?.lowStockCount || 0,
      lowStockItems: inventory?.lowStockItems || [],
    },
    risks: Array.isArray(risks) ? risks : [],
    aiInsights: Array.isArray(aiInsights) ? aiInsights : [],
    recommendations: Array.isArray(recommendations) ? recommendations : [],
    topProducts: Array.isArray(topProducts) ? topProducts : [],
    topCustomers: Array.isArray(topCustomers) ? topCustomers : [],
  };
};

const getEmptyMonthlyReport = () => ({
  month: new Date().toLocaleString('default', { month: 'long' }),
  year: new Date().getFullYear(),
  period: { start: today(), end: today() },
  executiveSummary: {
    totalRevenue: 0,
    grossProfit: 0,
    grossMargin: 0,
    expenses: 0,
    netProfit: 0,
    netMargin: 0,
    revenueChange: 0,
    profitChange: 0,
  },
  kpiDashboard: {
    grossMargin: 0,
    netMargin: 0,
    ytdRevenue: 0,
    ytdNetProfit: 0,
    totalSales: 0,
    uniqueCustomers: 0,
  },
  inventory: {
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    lowStockItems: [],
  },
  risks: [],
  aiInsights: [],
  recommendations: [],
  topProducts: [],
  topCustomers: [],
});