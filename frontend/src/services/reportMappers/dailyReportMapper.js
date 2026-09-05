// frontend/src/services/reportMappers/dailyReportMapper.js

import { today, isValidData, toNumber } from './utils';

export const mapDailyReport = (backendData) => {
  if (!isValidData(backendData)) {
    return getEmptyDailyReport();
  }

  const { date, today: todayData, comparison, transactions, alerts } = backendData;

  return {
    date: date || today(),
    period: {
      start: date || today(),
      end: date || today(),
    },
    today: {
      revenue: toNumber(todayData?.revenue),
      grossProfit: toNumber(todayData?.grossProfit),
      grossMargin: toNumber(todayData?.grossMargin),
      netProfit: toNumber(todayData?.netProfit),
      expenses: toNumber(todayData?.expenses),
      salesCount: todayData?.salesCount ?? (
        Array.isArray(transactions)
          ? transactions.filter((t) => t.type === 'SALE').length
          : 0
      ),
      inventory: {
        totalItems: toNumber(todayData?.inventory?.totalItems),
        totalValue: toNumber(todayData?.inventory?.totalValue),
        lowStockCount: toNumber(todayData?.inventory?.lowStockCount),
        lowStockItems: Array.isArray(todayData?.inventory?.lowStockItems)
          ? todayData.inventory.lowStockItems
          : [],
      },
    },
    comparison: {
      revenueChange: comparison?.revenueChange ?? null,
      netProfitChange: comparison?.netProfitChange ?? null,
      revenueAbsoluteChange: toNumber(comparison?.revenueAbsoluteChange),
      netProfitAbsoluteChange: toNumber(comparison?.netProfitAbsoluteChange),
    },
    transactions: Array.isArray(transactions) ? transactions : [],
    alerts: alerts || {
      lowStock: false,
      overdueReceivables: false,
      negativeProfit: false,
    },
  };
};

const getEmptyDailyReport = () => ({
  date: today(),
  period: { start: today(), end: today() },
  today: {
    revenue: 0,
    grossProfit: 0,
    grossMargin: 0,
    netProfit: 0,
    expenses: 0,
    salesCount: 0,
    inventory: {
      totalItems: 0,
      totalValue: 0,
      lowStockCount: 0,
      lowStockItems: [],
    },
  },
  comparison: {
    revenueChange: null,
    netProfitChange: null,
    revenueAbsoluteChange: 0,
    netProfitAbsoluteChange: 0,
  },
  transactions: [],
  alerts: {
    lowStock: false,
    overdueReceivables: false,
    negativeProfit: false,
  },
});