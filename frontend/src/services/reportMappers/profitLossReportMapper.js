// frontend/src/services/reportMappers/profitLossMapper.js

import { today, isValidData } from './utils';

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
      productSales: revenue?.productSales || 0,
      otherRevenue: revenue?.otherRevenue || 0,
      totalRevenue: revenue?.totalRevenue || 0,
    },
    cogs: {
      total: cogs?.total || 0,
    },
    grossProfit: {
      amount: grossProfit?.amount || 0,
      margin: grossProfit?.margin || 0,
    },
    operatingExpenses: {
      salaries: operatingExpenses?.salaries || 0,
      rent: operatingExpenses?.rent || 0,
      advertising: operatingExpenses?.advertising || 0,
      transportation: operatingExpenses?.transportation || 0,
      utilities: operatingExpenses?.utilities || 0,
      other: operatingExpenses?.other || 0,
      total: operatingExpenses?.total || 0,
    },
    operatingProfit: {
      amount: operatingProfit?.amount || 0,
      margin: operatingProfit?.margin || 0,
    },
    netProfit: {
      amount: netProfit?.amount || 0,
      margin: netProfit?.margin || 0,
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