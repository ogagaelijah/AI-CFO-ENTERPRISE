// frontend/src/services/reportMappers/profitLossReportMapper.js

import { today, isValidData, toNumber } from './utils';

export const mapProfitLossReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyProfitLossReport();
  }

  const {
    period,
    startDate,
    endDate,
    revenue = {},
    cogs = {},
    grossProfit = {},
    operatingExpenses = {},
    operatingProfit = {},
    netProfit = {},
  } = backendData;

  const periodLabel =
    typeof period === 'string' ? period : period?.label || 'Current Period';

  return {
    period: periodLabel,
    startDate: startDate || period?.startDate || period?.start || today(),
    endDate: endDate || period?.endDate || period?.end || today(),
    revenue: {
      productSales: toNumber(revenue.productSales),
      otherRevenue: toNumber(revenue.otherRevenue),
      totalRevenue: toNumber(revenue.totalRevenue),
    },
    cogs: {
      total: toNumber(cogs.total),
    },
    grossProfit: {
      amount: toNumber(grossProfit.amount),
      margin: toNumber(grossProfit.margin),
    },
    operatingExpenses: {
      salaries: toNumber(operatingExpenses.salaries),
      rent: toNumber(operatingExpenses.rent),
      advertising: toNumber(operatingExpenses.advertising),
      transportation: toNumber(operatingExpenses.transportation),
      utilities: toNumber(operatingExpenses.utilities),
      other: toNumber(operatingExpenses.other),
      total: toNumber(operatingExpenses.total),
    },
    operatingProfit: {
      amount: toNumber(operatingProfit.amount),
      margin: toNumber(operatingProfit.margin),
    },
    netProfit: {
      amount: toNumber(netProfit.amount),
      margin: toNumber(netProfit.margin),
    },
  };
};

const getEmptyProfitLossReport = () => ({
  period: 'Current Period',
  startDate: today(),
  endDate: today(),
  revenue: {
    productSales: 0,
    otherRevenue: 0,
    totalRevenue: 0,
  },
  cogs: { total: 0 },
  grossProfit: { amount: 0, margin: 0 },
  operatingExpenses: {
    salaries: 0,
    rent: 0,
    advertising: 0,
    transportation: 0,
    utilities: 0,
    other: 0,
    total: 0,
  },
  operatingProfit: { amount: 0, margin: 0 },
  netProfit: { amount: 0, margin: 0 },
});