// frontend/src/services/reportMappers/weeklyReportMapper.js

import { today, isValidData, toNumber } from './utils';

export const mapWeeklyReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyWeeklyReport();
  }

  const {
    period = {},
    revenue = 0,
    grossProfit = 0,
    grossMargin = 0,
    expenses = 0,
    netProfit = 0,
    netMargin = 0,
    weekOverWeek = {},
    topProducts = [],
    topCustomers = [],
    inventory = {},
    debtors = {},
    creditors = {},
  } = backendData;

  return {
    period: {
      start: period.start || period.startDate || today(),
      end: period.end || period.endDate || today(),
    },
    revenue: toNumber(revenue),
    grossProfit: toNumber(grossProfit),
    grossMargin: toNumber(grossMargin),
    expenses: toNumber(expenses),
    netProfit: toNumber(netProfit),
    netMargin: toNumber(netMargin),
    weekOverWeek: {
      revenueChange: toNumber(weekOverWeek.revenueChange),
      profitChange: toNumber(weekOverWeek.profitChange),
    },
    topProducts: Array.isArray(topProducts) ? topProducts : [],
    topCustomers: Array.isArray(topCustomers) ? topCustomers : [],
    inventory: {
      totalItems: toNumber(inventory.totalItems),
      totalValue: toNumber(inventory.totalValue),
      lowStockCount: toNumber(inventory.lowStockCount),
    },
    debtors: {
      count: toNumber(debtors.count),
      totalAmount: toNumber(debtors.totalAmount),
      top3: Array.isArray(debtors.top3) ? debtors.top3 : [],
    },
    creditors: {
      count: toNumber(creditors.count),
      totalAmount: toNumber(creditors.totalAmount),
      top3: Array.isArray(creditors.top3) ? creditors.top3 : [],
    },
  };
};

const getEmptyWeeklyReport = () => ({
  period: { start: today(), end: today() },
  revenue: 0,
  grossProfit: 0,
  grossMargin: 0,
  expenses: 0,
  netProfit: 0,
  netMargin: 0,
  weekOverWeek: {
    revenueChange: 0,
    profitChange: 0,
  },
  topProducts: [],
  topCustomers: [],
  inventory: {
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
  },
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